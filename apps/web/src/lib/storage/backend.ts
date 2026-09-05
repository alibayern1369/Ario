import { createServerSupabase } from '@/lib/supabase/server';
import { hasR2Config } from '@/lib/env';
import { canReadObject, canWriteObject, conversationIdFromPath } from './access';
import { signR2Read, signR2Write } from './r2';

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

async function isMember(conversationId: string | null, userId: string) {
  if (!conversationId) return false;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .eq('banned', false)
    .maybeSingle();
  return Boolean(data);
}

export async function createReadUrl(bucket: string, path: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'unauthorized' as const, status: 401 };
  const member = await isMember(conversationIdFromPath(path), user.id);
  if (!canReadObject({ bucket, path, userId: user.id, isConversationMember: member })) {
    return { error: 'forbidden' as const, status: 403 };
  }
  if (hasR2Config()) {
    return { url: await signR2Read(bucket, path), provider: 'r2' as const };
  }
  if (bucket === 'avatars') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, provider: 'supabase' as const };
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return { error: 'missing' as const, status: 404 };
  return { url: data.signedUrl, provider: 'supabase' as const };
}

export async function createUploadUrl(input: {
  bucket: string;
  path: string;
  mime: string;
}) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'unauthorized' as const, status: 401 };
  const member = await isMember(conversationIdFromPath(input.path), user.id);
  if (
    !canWriteObject({
      bucket: input.bucket,
      path: input.path,
      userId: user.id,
      isConversationMember: member,
    })
  ) {
    return { error: 'forbidden' as const, status: 403 };
  }
  if (hasR2Config()) {
    const signed = await signR2Write(input.bucket, input.path, input.mime);
    return { ...signed, provider: 'r2' as const };
  }
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUploadUrl(input.path);
  if (error || !data) return { error: 'sign_failed' as const, status: 400 };
  return {
    url: data.signedUrl,
    headers: { 'Content-Type': input.mime },
    provider: 'supabase' as const,
  };
}
