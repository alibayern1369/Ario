import { hasPermission, type PermissionKey, type MemberRole } from '@ario/shared';

export function canAccessConversation(input: {
  userId: string;
  memberUserIds: string[];
  banned?: boolean;
  conversationDisabled?: boolean;
}): boolean {
  if (input.conversationDisabled) return false;
  if (input.banned) return false;
  return input.memberUserIds.includes(input.userId);
}

export function assertCanSend(role: MemberRole, extra: string[] | null, key: PermissionKey) {
  if (!hasPermission(role, extra, key)) {
    throw new Error('اجازه این کار را ندارید');
  }
}

export function isStaff(role: string | null | undefined) {
  return role === 'admin' || role === 'owner';
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, '_').slice(0, 120);
}

export function isAllowedMime(mime: string, kind: 'image' | 'video' | 'audio' | 'file') {
  const map = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
    file: [] as string[],
  };
  if (kind === 'file') return true;
  return map[kind].includes(mime);
}
