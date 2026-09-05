-- ARIO production schema. RLS is the authorization backbone.
-- Admin UI must not read private conversation bodies.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.account_status as enum ('active', 'disabled', 'banned');
create type public.app_role as enum ('member', 'admin', 'owner');
create type public.conversation_type as enum ('direct', 'group', 'channel', 'saved');
create type public.member_role as enum ('owner', 'admin', 'member', 'subscriber');
create type public.message_type as enum (
  'text', 'image', 'video', 'audio', 'voice', 'video_note', 'file',
  'sticker', 'gif', 'contact', 'location', 'system', 'call'
);
create type public.call_kind as enum ('audio', 'video');
create type public.call_outcome as enum ('incoming', 'outgoing', 'missed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.visibility_level as enum ('everyone', 'contacts', 'nobody');
create type public.theme_preference as enum ('system', 'light', 'dark');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_path text,
  bio text not null default '',
  status public.account_status not null default 'active',
  role public.app_role not null default 'member',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,32}$')
);

create table public.privacy_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen public.visibility_level not null default 'everyone',
  online public.visibility_level not null default 'everyone',
  profile_photo public.visibility_level not null default 'everyone',
  calls public.visibility_level not null default 'everyone',
  group_invites public.visibility_level not null default 'everyone',
  read_receipts boolean not null default true
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_agent text,
  label text,
  last_active_at timestamptz not null default now(),
  refresh_jti text,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  title text,
  description text,
  avatar_path text,
  created_by uuid references public.profiles (id) on delete set null,
  is_public boolean not null default false,
  join_approval boolean not null default false,
  is_disabled boolean not null default false,
  invite_token text unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  permissions text[] not null default '{}',
  muted_until timestamptz,
  archived boolean not null default false,
  pinned boolean not null default false,
  pinned_at timestamptz,
  last_read_at timestamptz,
  last_delivered_at timestamptz,
  draft text,
  joined_at timestamptz not null default now(),
  banned boolean not null default false,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  client_id uuid,
  type public.message_type not null default 'text',
  content text,
  reply_to uuid references public.messages (id) on delete set null,
  forwarded_from uuid references public.messages (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  edited_at timestamptz,
  deleted_for_everyone boolean not null default false,
  pinned boolean not null default false,
  scheduled_at timestamptz,
  published_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (conversation_id, client_id)
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  bucket text not null,
  path text not null,
  mime text not null,
  bytes integer not null default 0,
  width integer,
  height integer,
  duration_ms integer,
  thumbnail_path text,
  original_name text,
  created_at timestamptz not null default now()
);

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.message_hides (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text,
  created_by uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete cascade,
  expires_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text,
  bucket text not null,
  path text not null,
  mime text not null,
  thumbnail_path text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.story_reactions (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete set null,
  kind public.call_kind not null,
  initiator_id uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer
);

create table public.call_participants (
  call_id uuid not null references public.calls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  outcome public.call_outcome not null,
  primary key (call_id, user_id)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  conversation_id uuid references public.conversations (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.landing_content (
  id text primary key default 'default',
  locale text not null default 'fa',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.channel_views (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index messages_conv_created_idx on public.messages (conversation_id, created_at desc);
create index messages_content_trgm_idx on public.messages using gin (content gin_trgm_ops);
create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);
create index profiles_name_trgm_idx on public.profiles using gin (display_name gin_trgm_ops);
create index conversation_members_user_idx on public.conversation_members (user_id);
create index stories_author_exp_idx on public.stories (author_id, expires_at);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index calls_started_idx on public.calls (started_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

create or replace function public.is_active_user(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.status = 'active'
  );
$$;

create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('admin', 'owner') and p.status = 'active'
  );
$$;

create or replace function public.is_member(conv uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = uid and m.banned = false
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  uname := regexp_replace(uname, '[^a-z0-9_]', '', 'g');
  if length(uname) < 3 then
    uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'display_name', uname),
    coalesce((new.raw_user_meta_data->>'app_role')::public.app_role, 'member')
  )
  on conflict (id) do nothing;
  insert into public.privacy_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_saved_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
begin
  insert into public.conversations (type, title, created_by)
  values ('saved', 'پیام‌های ذخیره‌شده', new.id)
  returning id into conv;
  insert into public.conversation_members (conversation_id, user_id, role)
  values (conv, new.id, 'owner');
  return new;
end;
$$;

create trigger on_profile_saved_messages
  after insert on public.profiles
  for each row execute function public.ensure_saved_messages();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.calls;

alter table public.profiles enable row level security;
alter table public.privacy_settings enable row level security;
alter table public.user_devices enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_hides enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.invites enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.system_settings enable row level security;
alter table public.landing_content enable row level security;
alter table public.channel_views enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (status = 'active' or id = auth.uid() or public.is_staff(auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and status = 'active')
  with check (id = auth.uid());
create policy profiles_staff_update on public.profiles for update to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy privacy_self on public.privacy_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy privacy_read_others on public.privacy_settings for select to authenticated
  using (true);

create policy devices_self on public.user_devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversations_member_select on public.conversations for select to authenticated
  using (
    public.is_member(id, auth.uid())
    or (type = 'channel' and is_public = true)
    or public.is_staff(auth.uid())
  );
create policy conversations_insert on public.conversations for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_user(auth.uid()));
create policy conversations_update on public.conversations for update to authenticated
  using (
    public.is_member(id, auth.uid())
    or public.is_staff(auth.uid())
  );

create policy members_select on public.conversation_members for select to authenticated
  using (public.is_member(conversation_id, auth.uid()) or user_id = auth.uid() or public.is_staff(auth.uid()));
create policy members_insert on public.conversation_members for insert to authenticated
  with check (public.is_active_user(auth.uid()));
create policy members_update on public.conversation_members for update to authenticated
  using (user_id = auth.uid() or public.is_member(conversation_id, auth.uid()) or public.is_staff(auth.uid()));
create policy members_delete on public.conversation_members for delete to authenticated
  using (user_id = auth.uid() or public.is_member(conversation_id, auth.uid()) or public.is_staff(auth.uid()));

create policy messages_select on public.messages for select to authenticated
  using (
    public.is_member(conversation_id, auth.uid())
    and not exists (
      select 1 from public.message_hides h
      where h.message_id = messages.id and h.user_id = auth.uid()
    )
  );
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_member(conversation_id, auth.uid())
    and public.is_active_user(auth.uid())
  );
create policy messages_update on public.messages for update to authenticated
  using (
    sender_id = auth.uid()
    or public.is_member(conversation_id, auth.uid())
  );

create policy attachments_select on public.message_attachments for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_member(m.conversation_id, auth.uid())
    )
  );
create policy attachments_insert on public.message_attachments for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

create policy reactions_select on public.message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_member(m.conversation_id, auth.uid())
    )
  );
create policy reactions_write on public.message_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hides_self on public.message_hides for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy blocks_self on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy blocks_see_incoming on public.blocks for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_own_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff(auth.uid()));
create policy reports_staff_update on public.reports for update to authenticated
  using (public.is_staff(auth.uid()));

create policy invites_select on public.invites for select to authenticated
  using (created_by = auth.uid() or public.is_staff(auth.uid()));
create policy invites_write on public.invites for all to authenticated
  using (created_by = auth.uid() or public.is_staff(auth.uid()))
  with check (created_by = auth.uid() or public.is_staff(auth.uid()));

create policy stories_select on public.stories for select to authenticated
  using (expires_at > now() and public.is_active_user(auth.uid()));
create policy stories_insert on public.stories for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user(auth.uid()));
create policy stories_delete on public.stories for delete to authenticated
  using (author_id = auth.uid() or public.is_staff(auth.uid()));

create policy story_views_select on public.story_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );
create policy story_views_insert on public.story_views for insert to authenticated
  with check (viewer_id = auth.uid());

create policy story_reactions_all on public.story_reactions for all to authenticated
  using (true) with check (user_id = auth.uid());

create policy calls_select on public.calls for select to authenticated
  using (
    initiator_id = auth.uid()
    or exists (select 1 from public.call_participants p where p.call_id = id and p.user_id = auth.uid())
  );
create policy calls_insert on public.calls for insert to authenticated
  with check (initiator_id = auth.uid());
create policy calls_update on public.calls for update to authenticated
  using (
    initiator_id = auth.uid()
    or exists (select 1 from public.call_participants p where p.call_id = id and p.user_id = auth.uid())
  );

create policy call_parts_select on public.call_participants for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.calls c where c.id = call_id and c.initiator_id = auth.uid())
  );
create policy call_parts_insert on public.call_participants for insert to authenticated
  with check (true);

create policy push_self on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notif_self on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_staff on public.admin_audit_log for select to authenticated
  using (public.is_staff(auth.uid()));
create policy audit_insert_staff on public.admin_audit_log for insert to authenticated
  with check (public.is_staff(auth.uid()));

create policy settings_read on public.system_settings for select to authenticated
  using (true);
create policy settings_staff on public.system_settings for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy landing_public_read on public.landing_content for select to anon, authenticated
  using (true);
create policy landing_staff on public.landing_content for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy channel_views_insert on public.channel_views for insert to authenticated
  with check (user_id = auth.uid());
create policy channel_views_select on public.channel_views for select to authenticated
  using (public.is_member((select conversation_id from public.messages where id = message_id), auth.uid()));

insert into public.system_settings (key, value) values
  ('registration_policy', '{"mode":"invite"}'),
  ('maintenance_mode', '{"enabled":false,"message":""}'),
  ('feature_flags', '{"stories":true,"calls":true,"channels":true,"groups":true}'),
  ('upload_limits', '{"imageBytes":12582912,"videoBytes":83886080,"voiceBytes":16777216,"fileBytes":41943040}'),
  ('branding', '{"name":"آریو","nameEn":"ARIO"}')
on conflict (key) do nothing;

insert into public.landing_content (id, locale, payload) values (
  'default',
  'fa',
  '{
    "title": "آریو — پیام‌رسان خصوصی",
    "description": "آریو پیام‌رسان خصوصی فارسی برای جمع‌های کوچک است.",
    "heroTitle": "گفت‌وگوی خصوصی، به فارسی",
    "heroSubtitle": "آریو برای سازمان‌ها و جمع‌های تا پنجاه نفر ساخته شده؛ سریع، امن و آماده نصب روی گوشی.",
    "ctaLabel": "ورود به آریو",
    "contactEmail": "hello@example.com",
    "contactText": "برای راه‌اندازی آریو در مجموعه خود پیام بگذارید."
  }'::jsonb
) on conflict (id) do nothing;
