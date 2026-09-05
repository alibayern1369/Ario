export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_path: string | null;
          bio: string;
          status: 'active' | 'disabled' | 'banned';
          role: 'member' | 'admin' | 'owner';
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          username: string;
          display_name: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: 'direct' | 'group' | 'channel' | 'saved';
          title: string | null;
          description: string | null;
          avatar_path: string | null;
          created_by: string | null;
          is_public: boolean;
          join_approval: boolean;
          is_disabled: boolean;
          invite_token: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['conversations']['Row']> & {
          type: 'direct' | 'group' | 'channel' | 'saved';
        };
        Update: Partial<Database['public']['Tables']['conversations']['Row']>;
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'subscriber';
          permissions: string[];
          muted_until: string | null;
          archived: boolean;
          pinned: boolean;
          pinned_at: string | null;
          last_read_at: string | null;
          last_delivered_at: string | null;
          draft: string | null;
          joined_at: string;
          banned: boolean;
        };
        Insert: Partial<Database['public']['Tables']['conversation_members']['Row']> & {
          conversation_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_members']['Row']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          client_id: string | null;
          type: string;
          content: string | null;
          reply_to: string | null;
          forwarded_from: string | null;
          metadata: Json;
          edited_at: string | null;
          deleted_for_everyone: boolean;
          pinned: boolean;
          scheduled_at: string | null;
          published_at: string | null;
          view_count: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['messages']['Row']> & {
          conversation_id: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          bucket: string;
          path: string;
          mime: string;
          bytes: number;
          width: number | null;
          height: number | null;
          duration_ms: number | null;
          thumbnail_path: string | null;
          original_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['message_attachments']['Row']> & {
          message_id: string;
          bucket: string;
          path: string;
          mime: string;
        };
        Update: Partial<Database['public']['Tables']['message_attachments']['Row']>;
        Relationships: [];
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: Database['public']['Tables']['message_reactions']['Row'];
        Update: Partial<Database['public']['Tables']['message_reactions']['Row']>;
        Relationships: [];
      };
      privacy_settings: {
        Row: {
          user_id: string;
          last_seen: 'everyone' | 'contacts' | 'nobody';
          online: 'everyone' | 'contacts' | 'nobody';
          profile_photo: 'everyone' | 'contacts' | 'nobody';
          calls: 'everyone' | 'contacts' | 'nobody';
          group_invites: 'everyone' | 'contacts' | 'nobody';
          read_receipts: boolean;
        };
        Insert: Partial<Database['public']['Tables']['privacy_settings']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['privacy_settings']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
