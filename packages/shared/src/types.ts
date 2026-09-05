export type AccountStatus = 'active' | 'disabled' | 'banned';
export type AppRole = 'member' | 'admin' | 'owner';
export type ConversationType = 'direct' | 'group' | 'channel' | 'saved';
export type MemberRole = 'owner' | 'admin' | 'member' | 'subscriber';
export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'video_note'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'contact'
  | 'location'
  | 'system'
  | 'call';
export type CallKind = 'audio' | 'video';
export type CallOutcome = 'incoming' | 'outgoing' | 'missed';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type Visibility = 'everyone' | 'contacts' | 'nobody';
export type ThemePreference = 'system' | 'light' | 'dark';

export type ServiceModule = {
  id: string;
  title: string;
  titleFa: string;
  descriptionFa: string;
  icon: string;
  href: string;
  enabled: boolean;
};

export type OtpProvider = {
  id: string;
  send: (to: string, code: string) => Promise<void>;
};

export const otpProviderRegistry: Record<string, OtpProvider | undefined> = {};
