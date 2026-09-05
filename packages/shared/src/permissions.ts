import { ROLE_DEFAULT_PERMISSIONS, type PermissionKey } from './constants';
import type { MemberRole } from './types';

export type { MemberRole };

export function hasPermission(
  role: MemberRole,
  extra: readonly string[] | null | undefined,
  key: PermissionKey,
): boolean {
  if (role === 'owner') return true;
  const granted = extra?.length ? extra : ROLE_DEFAULT_PERMISSIONS[role];
  return granted.includes(key);
}

export function canModerate(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}
