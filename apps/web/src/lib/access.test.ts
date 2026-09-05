import { describe, expect, it } from 'vitest';
import { canAccessConversation, isAllowedMime, isStaff, sanitizeFilename } from './access';

describe('conversation access', () => {
  it('denies non-members even if they guess an id', () => {
    expect(
      canAccessConversation({
        userId: 'u1',
        memberUserIds: ['u2', 'u3'],
      }),
    ).toBe(false);
  });

  it('allows members and rejects banned or disabled chats', () => {
    expect(canAccessConversation({ userId: 'u1', memberUserIds: ['u1'] })).toBe(true);
    expect(canAccessConversation({ userId: 'u1', memberUserIds: ['u1'], banned: true })).toBe(false);
    expect(
      canAccessConversation({
        userId: 'u1',
        memberUserIds: ['u1'],
        conversationDisabled: true,
      }),
    ).toBe(false);
  });
});

describe('admin gate', () => {
  it('only staff roles pass', () => {
    expect(isStaff('admin')).toBe(true);
    expect(isStaff('member')).toBe(false);
  });
});

describe('uploads', () => {
  it('validates image mime types', () => {
    expect(isAllowedMime('image/png', 'image')).toBe(true);
    expect(isAllowedMime('application/x-msdownload', 'image')).toBe(false);
  });

  it('sanitizes filenames', () => {
    expect(sanitizeFilename('../secret.exe')).toBe('.._secret.exe');
  });
});
