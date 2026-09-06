import { describe, expect, it } from 'vitest';
import { canReadObject, canWriteObject, conversationIdFromPath, objectKey } from './access';

describe('object storage access', () => {
  const conv = '11111111-1111-1111-1111-111111111111';
  const user = '22222222-2222-2222-2222-222222222222';
  const other = '33333333-3333-3333-3333-333333333333';

  it('scopes chat media to conversation members', () => {
    const path = `${conv}/${user}/a.jpg`;
    expect(canReadObject({ bucket: 'media', path, userId: user, isConversationMember: true })).toBe(true);
    expect(canReadObject({ bucket: 'media', path, userId: user, isConversationMember: false })).toBe(false);
    expect(canWriteObject({ bucket: 'media', path, userId: user, isConversationMember: false })).toBe(false);
  });

  it('only lets a user write their own avatar and stories', () => {
    expect(
      canWriteObject({
        bucket: 'avatars',
        path: `${user}/avatar.jpg`,
        userId: user,
        isConversationMember: false,
      }),
    ).toBe(true);
    expect(
      canWriteObject({
        bucket: 'avatars',
        path: `other/avatar.jpg`,
        userId: user,
        isConversationMember: false,
      }),
    ).toBe(false);
  });

  it('does not allow story reads by path alone without ACL', () => {
    expect(
      canReadObject({
        bucket: 'stories',
        path: `${other}/clip.mp4`,
        userId: user,
        isConversationMember: false,
      }),
    ).toBe(false);
    expect(
      canReadObject({
        bucket: 'stories',
        path: `${other}/clip.mp4`,
        userId: user,
        isConversationMember: false,
        canViewStoryAuthor: true,
      }),
    ).toBe(true);
  });

  it('rejects path traversal and unknown buckets', () => {
    expect(conversationIdFromPath('../x')).toBeNull();
    expect(canWriteObject({ bucket: 'secret', path: 'a', userId: user, isConversationMember: true })).toBe(
      false,
    );
    expect(objectKey('media', 'a/b')).toBe('media/a/b');
  });
});
