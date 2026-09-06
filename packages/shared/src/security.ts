import { hasPermission, type MemberRole } from './permissions';
import type { Visibility } from './types';

/** Mirrors SQL is_blocked_either for client-side prechecks / unit tests. */
export function isBlockedEither(
  blockerPairs: Array<{ blocker_id: string; blocked_id: string }>,
  a: string,
  b: string,
): boolean {
  return blockerPairs.some(
    (p) =>
      (p.blocker_id === a && p.blocked_id === b) || (p.blocker_id === b && p.blocked_id === a),
  );
}

/** contacts = share a direct conversation; nobody = only self; everyone = all. */
export function visibilityAllows(
  level: Visibility,
  viewerId: string,
  ownerId: string,
  areContacts: boolean,
): boolean {
  if (viewerId === ownerId) return true;
  if (level === 'everyone') return true;
  if (level === 'nobody') return false;
  return areContacts;
}

export function canMutateMessage(input: {
  actorId: string;
  senderId: string | null;
  actorRole: MemberRole | null;
  actorPermissions?: string[] | null;
  action: 'edit' | 'delete_own' | 'delete_others' | 'pin';
}): boolean {
  if (!input.actorId) return false;
  const isSender = input.senderId === input.actorId;
  if (input.action === 'edit' || input.action === 'delete_own') return isSender;
  if (!input.actorRole) return false;
  if (input.action === 'pin') {
    return hasPermission(input.actorRole, input.actorPermissions, 'pin_messages');
  }
  if (input.action === 'delete_others') {
    return (
      hasPermission(input.actorRole, input.actorPermissions, 'delete_posts') ||
      hasPermission(input.actorRole, input.actorPermissions, 'remove_members')
    );
  }
  return false;
}

export function canSelfJoinConversation(input: {
  type: 'direct' | 'group' | 'channel' | 'saved';
  isPublic: boolean;
  isDisabled: boolean;
  hasInviteTokenMatch: boolean;
}): boolean {
  if (input.isDisabled) return false;
  if (input.type === 'channel' && input.isPublic) return true;
  if ((input.type === 'group' || input.type === 'channel') && input.hasInviteTokenMatch) return true;
  return false;
}

export function assertMemberInsertAuthorized(input: {
  actorIsStaff: boolean;
  viaAuthorizedRpc: boolean;
}): boolean {
  return input.actorIsStaff || input.viaAuthorizedRpc;
}
