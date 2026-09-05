export const APP_NAME = 'ARIO';
export const APP_NAME_FA = 'آریو';
export const MAX_USERS = 50;

export const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export const DEFAULT_UPLOAD_LIMITS = {
  imageBytes: 12 * 1024 * 1024,
  videoBytes: 80 * 1024 * 1024,
  voiceBytes: 16 * 1024 * 1024,
  fileBytes: 40 * 1024 * 1024,
  storyBytes: 40 * 1024 * 1024,
  avatarBytes: 4 * 1024 * 1024,
} as const;

export const STORY_TTL_HOURS = 24;
export const MESSAGE_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;
export const TYPING_TTL_MS = 4000;
export const PRESENCE_TTL_MS = 45_000;

export const REACTION_SET = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'] as const;

export const PERMISSION_KEYS = [
  'send_messages',
  'send_media',
  'send_voice',
  'add_members',
  'remove_members',
  'pin_messages',
  'edit_info',
  'manage_permissions',
  'post_channel',
  'edit_posts',
  'delete_posts',
  'approve_join',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<
  'owner' | 'admin' | 'member' | 'subscriber',
  readonly PermissionKey[]
> = {
  owner: PERMISSION_KEYS,
  admin: [
    'send_messages',
    'send_media',
    'send_voice',
    'add_members',
    'remove_members',
    'pin_messages',
    'edit_info',
    'post_channel',
    'edit_posts',
    'delete_posts',
    'approve_join',
  ],
  member: ['send_messages', 'send_media', 'send_voice'],
  subscriber: [],
};

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  media: 'media',
  voice: 'voice',
  documents: 'documents',
  stories: 'stories',
} as const;
