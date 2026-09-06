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

export function ownerIdFromUserPath(path: string) {
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
  /** For stories: whether viewer may access author's story media. */
  canViewStoryAuthor?: boolean;
}) {
  if (!isLogicalBucket(input.bucket)) return false;
  if (input.path.includes('..') || input.path.startsWith('/')) return false;
  if (input.bucket === 'avatars') return Boolean(input.userId);
  if (input.bucket === 'stories') {
    const owner = ownerIdFromUserPath(input.path);
    if (!owner || !input.userId) return false;
    if (owner === input.userId) return true;
    return input.canViewStoryAuthor === true;
  }
  return Boolean(conversationIdFromPath(input.path) && input.isConversationMember);
}
