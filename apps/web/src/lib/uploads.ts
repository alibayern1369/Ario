import { DEFAULT_UPLOAD_LIMITS, STORAGE_BUCKETS, type MessageType } from '@ario/shared';
import { isAllowedMime, sanitizeFilename } from '@/lib/access';
import { createClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/storage/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

/** Canonical media message types. Prefer these over raw MIME guessing. */
export type MediaMessageType = Extract<
  MessageType,
  'image' | 'video' | 'video_note' | 'voice' | 'file' | 'gif' | 'audio'
>;

function bucketFor(file: File, messageType?: MediaMessageType) {
  if (messageType === 'voice' || messageType === 'audio') return STORAGE_BUCKETS.voice;
  if (messageType === 'file') return STORAGE_BUCKETS.documents;
  if (file.type.startsWith('image/') || file.type.startsWith('video/') || messageType === 'video_note') {
    return STORAGE_BUCKETS.media;
  }
  if (file.type.startsWith('audio/')) return STORAGE_BUCKETS.voice;
  return STORAGE_BUCKETS.documents;
}

function inferType(file: File): MediaMessageType {
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'voice';
  return 'file';
}

function limitFor(file: File, messageType?: MediaMessageType) {
  if (messageType === 'voice' || messageType === 'audio' || file.type.startsWith('audio/')) {
    return DEFAULT_UPLOAD_LIMITS.voiceBytes;
  }
  if (file.type.startsWith('image/')) return DEFAULT_UPLOAD_LIMITS.imageBytes;
  if (file.type.startsWith('video/') || messageType === 'video_note') return DEFAULT_UPLOAD_LIMITS.videoBytes;
  return DEFAULT_UPLOAD_LIMITS.fileBytes;
}

export function isVoiceMessageType(type: string | null | undefined) {
  return type === 'voice' || type === 'audio';
}

export async function uploadAndSend(
  conversationId: string,
  files: File[],
  caption = '',
  options?: { messageType?: MediaMessageType; durationMs?: number; onProgress?: (pct: number) => void },
) {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('auth');
  const supabase = createClient();
  const clientId = crypto.randomUUID();
  const primary = files[0];
  if (!primary) return;
  const messageType = options?.messageType ?? inferType(primary);
  if (files.some((f) => f.size > limitFor(f, messageType))) throw new Error('size');

  // Upload first, then insert message — avoids orphan message rows on upload failure.
  const uploaded: Array<{
    bucket: string;
    path: string;
    mime: string;
    bytes: number;
    original_name: string;
    duration_ms: number | null;
  }> = [];

  try {
    for (const file of files) {
      const kind = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'file';
      if (!isAllowedMime(file.type, kind === 'file' ? 'file' : kind)) throw new Error('mime');
      const bucket = bucketFor(file, messageType);
      const path = `${conversationId}/${userId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      await uploadToStorage(bucket, path, file, options?.onProgress);
      uploaded.push({
        bucket,
        path,
        mime: file.type,
        bytes: file.size,
        original_name: file.name,
        duration_ms: options?.durationMs ?? null,
      });
    }

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        client_id: clientId,
        type: messageType,
        content: caption || null,
        metadata: options?.durationMs ? { duration_ms: options.durationMs } : {},
      })
      .select('id')
      .single();
    if (error || !msg) throw error ?? new Error('message');

    for (const att of uploaded) {
      await supabase.from('message_attachments').insert({
        message_id: msg.id,
        bucket: att.bucket,
        path: att.path,
        mime: att.mime,
        bytes: att.bytes,
        original_name: att.original_name,
        duration_ms: att.duration_ms,
      });
    }
  } catch (err) {
    // Best-effort: leave uploaded blobs for orphan janitor rather than half-published messages.
    throw err;
  }

  await useChatStore.getState().loadMessages(conversationId);
}
