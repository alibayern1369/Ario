import { describe, expect, it } from 'vitest';
import {
  assertMemberInsertAuthorized,
  canMutateMessage,
  canSelfJoinConversation,
  isBlockedEither,
  visibilityAllows,
} from './security';

describe('block enforcement helpers', () => {
  const blocks = [
    { blocker_id: 'a', blocked_id: 'b' },
    { blocker_id: 'c', blocked_id: 'd' },
  ];

  it('detects either direction', () => {
    expect(isBlockedEither(blocks, 'a', 'b')).toBe(true);
    expect(isBlockedEither(blocks, 'b', 'a')).toBe(true);
    expect(isBlockedEither(blocks, 'a', 'c')).toBe(false);
  });
});

describe('message mutation authorization', () => {
  it('only sender can edit or delete own', () => {
    expect(
      canMutateMessage({
        actorId: 'u1',
        senderId: 'u1',
        actorRole: 'member',
        action: 'edit',
      }),
    ).toBe(true);
    expect(
      canMutateMessage({
        actorId: 'u2',
        senderId: 'u1',
        actorRole: 'member',
        action: 'edit',
      }),
    ).toBe(false);
  });

  it('moderators can pin/delete others; members cannot', () => {
    expect(
      canMutateMessage({
        actorId: 'admin',
        senderId: 'u1',
        actorRole: 'admin',
        action: 'pin',
      }),
    ).toBe(true);
    expect(
      canMutateMessage({
        actorId: 'member',
        senderId: 'u1',
        actorRole: 'member',
        action: 'delete_others',
      }),
    ).toBe(false);
  });
});

describe('membership insert authorization', () => {
  it('rejects arbitrary client membership inserts', () => {
    expect(assertMemberInsertAuthorized({ actorIsStaff: false, viaAuthorizedRpc: false })).toBe(
      false,
    );
    expect(assertMemberInsertAuthorized({ actorIsStaff: false, viaAuthorizedRpc: true })).toBe(
      true,
    );
  });

  it('private groups reject unauthorized self-join', () => {
    expect(
      canSelfJoinConversation({
        type: 'group',
        isPublic: false,
        isDisabled: false,
        hasInviteTokenMatch: false,
      }),
    ).toBe(false);
    expect(
      canSelfJoinConversation({
        type: 'channel',
        isPublic: true,
        isDisabled: false,
        hasInviteTokenMatch: false,
      }),
    ).toBe(true);
  });
});

describe('privacy visibility', () => {
  it('honors nobody and contacts', () => {
    expect(visibilityAllows('nobody', 'v', 'o', true)).toBe(false);
    expect(visibilityAllows('contacts', 'v', 'o', false)).toBe(false);
    expect(visibilityAllows('contacts', 'v', 'o', true)).toBe(true);
    expect(visibilityAllows('everyone', 'v', 'o', false)).toBe(true);
  });
});
