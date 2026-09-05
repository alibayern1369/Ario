import { describe, expect, it } from 'vitest';
import { canModerate, hasPermission } from './permissions';

describe('permissions', () => {
  it('gives owners every permission', () => {
    expect(hasPermission('owner', [], 'manage_permissions')).toBe(true);
  });

  it('uses extra grants when provided', () => {
    expect(hasPermission('member', ['pin_messages'], 'pin_messages')).toBe(true);
    expect(hasPermission('member', ['pin_messages'], 'add_members')).toBe(false);
  });

  it('falls back to role defaults', () => {
    expect(hasPermission('subscriber', null, 'send_messages')).toBe(false);
    expect(hasPermission('member', null, 'send_messages')).toBe(true);
  });

  it('treats admin and owner as moderators', () => {
    expect(canModerate('admin')).toBe(true);
    expect(canModerate('member')).toBe(false);
  });
});
