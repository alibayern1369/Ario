const LOGICAL_BUCKETS = ['avatars', 'media', 'voice', 'documents', 'stories'] as const;

export type LogicalBucket = (typeof LOGICAL_BUCKETS)[number];

export function isLogicalBucket(value: string): value is LogicalBucket {
  return (LOGICAL_BUCKETS as readonly string[]).includes(value);
}

export function objectKey(bucket: string, path: string) {
  return `${bucket}/${path.replace(/^\/+/, '')}`;
}

export function conversationIdFromPath(path: string) {
  const first = path.split('/')[0];
  return first && /^[0-9a-f-]{36}$/i.test(first) ? first : null;
}

export function canWriteObject(input: {
  bucket: string;
  path: string;
  userId: string;
  isConversationMember: boolean;
}) {
  if (!isLogicalBucket(input.bucket)) return false;
  if (input.path.includes('..') || input.path.startsWith('/')) return false;
  if (input.bucket === 'avatars' || input.bucket === 'stories') {
    return input.path.startsWith(`${input.userId}/`);
  }
  return Boolean(conversationIdFromPath(input.path) && input.isConversationMember);
}

export function canReadObject(input: {
  bucket: string;
  path: string;
  userId: string;
  isConversationMember: boolean;
}) {
  if (!isLogicalBucket(input.bucket)) return false;
  if (input.bucket === 'avatars' || input.bucket === 'stories') return Boolean(input.userId);
  return Boolean(conversationIdFromPath(input.path) && input.isConversationMember);
}
