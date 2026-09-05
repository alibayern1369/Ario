import { DEFAULT_UPLOAD_LIMITS, STORAGE_BUCKETS } from '@ario/shared';
import { isAllowedMime, sanitizeFilename } from '@/lib/access';
import { createClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/storage/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

function bucketFor(file: File) {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return STORAGE_BUCKETS.media;
  if (file.type.startsWith('audio/')) return STORAGE_BUCKETS.voice;
  return STORAGE_BUCKETS.documents;
}

function typeFor(file: File) {
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function limitFor(file: File) {
  if (file.type.startsWith('image/')) return DEFAULT_UPLOAD_LIMITS.imageBytes;
  if (file.type.startsWith('video/')) return DEFAULT_UPLOAD_LIMITS.videoBytes;
  if (file.type.startsWith('audio/')) return DEFAULT_UPLOAD_LIMITS.voiceBytes;
  return DEFAULT_UPLOAD_LIMITS.fileBytes;
}

export async function uploadAndSend(conversationId: string, files: File[], caption = '') {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('auth');
  const supabase = createClient();
  const clientId = crypto.randomUUID();
  const primary = files[0];
  if (!primary) return;
  if (files.some((f) => f.size > limitFor(f))) throw new Error('size');
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      client_id: clientId,
      type: typeFor(primary),
      content: caption || null,
    })
    .select('id')
    .single();
  if (error || !msg) throw error ?? new Error('message');
  for (const file of files) {
    const kind = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'file';
    if (!isAllowedMime(file.type, kind === 'file' ? 'file' : kind)) throw new Error('mime');
    const bucket = bucketFor(file);
    const path = `${conversationId}/${userId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    await uploadToStorage(bucket, path, file);
    await supabase.from('message_attachments').insert({
      message_id: msg.id,
      bucket,
      path,
      mime: file.type,
      bytes: file.size,
      original_name: file.name,
    });
  }
  await useChatStore.getState().loadMessages(conversationId);
}
