-- Priority 0: harden authorization. Membership and message mutation must not be client-open.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_blocked_either(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

create or replace function public.are_direct_contacts(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_members m1
      on m1.conversation_id = c.id and m1.user_id = a and m1.banned = false
    join public.conversation_members m2
      on m2.conversation_id = c.id and m2.user_id = b and m2.banned = false
    where c.type = 'direct'
  );
$$;

create or replace function public.member_role(conv uuid, uid uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.conversation_members m
  where m.conversation_id = conv and m.user_id = uid and m.banned = false
  limit 1;
$$;

create or replace function public.member_permissions(conv uuid, uid uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(m.permissions, '{}'::text[])
  from public.conversation_members m
  where m.conversation_id = conv and m.user_id = uid and m.banned = false
  limit 1;
$$;

create or replace function public.default_permissions_for(role public.member_role)
returns text[]
language sql
immutable
as $$
  select case role
    when 'owner' then array[
      'send_messages','send_media','send_voice','add_members','remove_members',
      'pin_messages','edit_info','manage_permissions','post_channel',
      'edit_posts','delete_posts','approve_join'
    ]
    when 'admin' then array[
      'send_messages','send_media','send_voice','add_members','remove_members',
      'pin_messages','edit_info','post_channel','edit_posts','delete_posts','approve_join'
    ]
    when 'member' then array['send_messages','send_media','send_voice']
    else '{}'::text[]
  end;
$$;

create or replace function public.member_has_permission(conv uuid, uid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.member_role(conv, uid) = 'owner' then true
    when public.member_role(conv, uid) is null then false
    else (
      select perm = any (
        case
          when cardinality(public.member_permissions(conv, uid)) > 0
            then public.member_permissions(conv, uid)
          else public.default_permissions_for(public.member_role(conv, uid))
        end
      )
    )
  end;
$$;

create or replace function public.visibility_allows(
  level public.visibility_level,
  viewer uuid,
  owner uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case level
    when 'everyone' then true
    when 'nobody' then viewer = owner
    when 'contacts' then viewer = owner or public.are_direct_contacts(viewer, owner)
    else false
  end;
$$;

create or replace function public.dm_peer_id(conv uuid, uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where m.conversation_id = conv
    and c.type = 'direct'
    and m.user_id <> uid
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Message mutation guard (column-aware)
-- ---------------------------------------------------------------------------

create or replace function public.messages_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  is_sender boolean := (old.sender_id is not null and old.sender_id = actor);
  can_pin boolean := public.member_has_permission(old.conversation_id, actor, 'pin_messages');
  can_delete boolean := public.member_has_permission(old.conversation_id, actor, 'delete_posts')
    or public.member_has_permission(old.conversation_id, actor, 'remove_members');
begin
  if public.is_staff(actor) then
    return new;
  end if;

  -- Service-role / cron jobs (no JWT user): allow schedule publish + view counters only.
  if actor is null then
    if new.conversation_id is distinct from old.conversation_id
      or new.sender_id is distinct from old.sender_id
      or new.client_id is distinct from old.client_id
      or new.type is distinct from old.type
      or new.content is distinct from old.content
      or new.reply_to is distinct from old.reply_to
      or new.forwarded_from is distinct from old.forwarded_from
      or new.metadata is distinct from old.metadata
      or new.edited_at is distinct from old.edited_at
      or new.pinned is distinct from old.pinned
      or new.deleted_for_everyone is distinct from old.deleted_for_everyone
      or new.created_at is distinct from old.created_at
    then
      raise exception 'service role may only update schedule/view fields';
    end if;
    return new;
  end if;

  if not public.is_active_user(actor) then
    raise exception 'not allowed';
  end if;

  if is_sender then
    -- Sender may edit content / soft-delete / pin own message.
    if new.conversation_id is distinct from old.conversation_id
      or new.sender_id is distinct from old.sender_id
      or new.client_id is distinct from old.client_id
      or new.type is distinct from old.type
      or new.reply_to is distinct from old.reply_to
      or new.forwarded_from is distinct from old.forwarded_from
      or new.created_at is distinct from old.created_at
    then
      raise exception 'immutable message fields';
    end if;
    return new;
  end if;

  -- Non-sender: pin / soft-delete when permitted; view_count via record_channel_view RPC.
  if new.conversation_id is distinct from old.conversation_id
    or new.sender_id is distinct from old.sender_id
    or new.client_id is distinct from old.client_id
    or new.type is distinct from old.type
    or new.content is distinct from old.content
    or new.reply_to is distinct from old.reply_to
    or new.forwarded_from is distinct from old.forwarded_from
    or new.metadata is distinct from old.metadata
    or new.edited_at is distinct from old.edited_at
    or new.scheduled_at is distinct from old.scheduled_at
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'only sender can edit message body';
  end if;

  if new.pinned is distinct from old.pinned and not can_pin then
    raise exception 'pin not allowed';
  end if;

  if new.deleted_for_everyone is distinct from old.deleted_for_everyone then
    if not can_delete or new.deleted_for_everyone is not true then
      raise exception 'delete not allowed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_update_guard on public.messages;
create trigger messages_update_guard
  before update on public.messages
  for each row execute function public.messages_update_guard();

-- ---------------------------------------------------------------------------
-- Membership mutation guard
-- ---------------------------------------------------------------------------

create or replace function public.members_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  self_update boolean := (old.user_id = actor);
  can_manage boolean := public.member_has_permission(old.conversation_id, actor, 'manage_permissions')
    or public.member_has_permission(old.conversation_id, actor, 'remove_members');
begin
  if public.is_staff(actor) then
    return new;
  end if;

  if self_update then
    if new.role is distinct from old.role
      or new.permissions is distinct from old.permissions
      or new.banned is distinct from old.banned
      or new.user_id is distinct from old.user_id
      or new.conversation_id is distinct from old.conversation_id
    then
      raise exception 'cannot self-elevate membership';
    end if;
    return new;
  end if;

  if not can_manage then
    raise exception 'membership manage not allowed';
  end if;

  -- Admins cannot demote/ban owners or change owner role.
  if old.role = 'owner' and not public.is_staff(actor) then
    raise exception 'cannot modify owner';
  end if;

  if new.role = 'owner' and old.role is distinct from 'owner' then
    raise exception 'cannot promote to owner via update';
  end if;

  return new;
end;
$$;

drop trigger if exists members_update_guard on public.conversation_members;
create trigger members_update_guard
  before update on public.conversation_members
  for each row execute function public.members_update_guard();

-- ---------------------------------------------------------------------------
-- Authorized membership RPCs (bypass RLS as definer; enforce authz inside)
-- ---------------------------------------------------------------------------

create or replace function public.create_direct_conversation(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing uuid;
  conv_id uuid;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if peer_id is null or peer_id = me then
    raise exception 'invalid peer';
  end if;
  if not public.is_active_user(peer_id) then
    raise exception 'peer unavailable';
  end if;
  if public.is_blocked_either(me, peer_id) then
    raise exception 'blocked';
  end if;

  select c.id into existing
  from public.conversations c
  join public.conversation_members m1
    on m1.conversation_id = c.id and m1.user_id = me and m1.banned = false
  join public.conversation_members m2
    on m2.conversation_id = c.id and m2.user_id = peer_id and m2.banned = false
  where c.type = 'direct'
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.conversations (type, created_by)
  values ('direct', me)
  returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (conv_id, me, 'member'),
    (conv_id, peer_id, 'member');

  return conv_id;
end;
$$;

create or replace function public.create_room_conversation(
  room_type public.conversation_type,
  room_title text,
  member_ids uuid[],
  is_public boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  invite text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  uid uuid;
  member_role public.member_role;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if room_type not in ('group', 'channel') then
    raise exception 'invalid type';
  end if;
  if room_title is null or length(trim(room_title)) < 1 then
    raise exception 'title required';
  end if;
  if member_ids is null or cardinality(member_ids) < 1 then
    raise exception 'members required';
  end if;

  insert into public.conversations (type, title, created_by, is_public, invite_token)
  values (room_type, trim(room_title), me, coalesce(is_public, false), invite)
  returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (conv_id, me, 'owner');

  foreach uid in array member_ids loop
    if uid = me then
      continue;
    end if;
    if not public.is_active_user(uid) then
      continue;
    end if;
    if public.is_blocked_either(me, uid) then
      continue;
    end if;
    -- Respect invitee privacy for group invites (missing row = everyone).
    if room_type = 'group' and exists (
      select 1 from public.privacy_settings ps
      where ps.user_id = uid
        and not public.visibility_allows(ps.group_invites, me, uid)
    ) then
      continue;
    end if;

    member_role := case when room_type = 'channel' then 'subscriber'::public.member_role else 'member'::public.member_role end;
    insert into public.conversation_members (conversation_id, user_id, role)
    values (conv_id, uid, member_role)
    on conflict do nothing;
  end loop;

  return conv_id;
end;
$$;

create or replace function public.add_conversation_members(
  conv uuid,
  member_ids uuid[],
  as_role public.member_role default 'member'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  uid uuid;
  added integer := 0;
  conv_type public.conversation_type;
  role_to_use public.member_role;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if not public.member_has_permission(conv, me, 'add_members') and not public.is_staff(me) then
    raise exception 'add_members denied';
  end if;

  select type into conv_type from public.conversations where id = conv;
  if conv_type is null or conv_type in ('direct', 'saved') then
    raise exception 'invalid conversation';
  end if;

  role_to_use := case
    when conv_type = 'channel' and as_role in ('member', 'subscriber') then as_role
    when conv_type = 'group' and as_role in ('member', 'admin') then as_role
    when conv_type = 'channel' then 'subscriber'::public.member_role
    else 'member'::public.member_role
  end;

  foreach uid in array member_ids loop
    if uid = me or not public.is_active_user(uid) then
      continue;
    end if;
    if public.is_blocked_either(me, uid) then
      continue;
    end if;
    if conv_type = 'group' and exists (
      select 1 from public.privacy_settings ps
      where ps.user_id = uid
        and not public.visibility_allows(ps.group_invites, me, uid)
    ) then
      continue;
    end if;
    insert into public.conversation_members (conversation_id, user_id, role)
    values (conv, uid, role_to_use)
    on conflict do nothing;
    if found then
      added := added + 1;
    end if;
  end loop;

  return added;
end;
$$;

create or replace function public.join_public_channel(conv uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c public.conversations%rowtype;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  select * into c from public.conversations where id = conv;
  if not found or c.type <> 'channel' or c.is_public is not true or c.is_disabled then
    raise exception 'not joinable';
  end if;
  if public.is_member(conv, me) then
    return;
  end if;
  insert into public.conversation_members (conversation_id, user_id, role)
  values (conv, me, 'subscriber')
  on conflict do nothing;
end;
$$;

create or replace function public.join_conversation_by_invite(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c public.conversations%rowtype;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if token is null or length(token) < 8 then
    raise exception 'invalid token';
  end if;
  select * into c from public.conversations where invite_token = token;
  if not found or c.is_disabled or c.type not in ('group', 'channel') then
    raise exception 'invalid invite';
  end if;
  if public.is_member(c.id, me) then
    return c.id;
  end if;
  insert into public.conversation_members (conversation_id, user_id, role)
  values (
    c.id,
    me,
    case when c.type = 'channel' then 'subscriber'::public.member_role else 'member'::public.member_role end
  )
  on conflict do nothing;
  return c.id;
end;
$$;

create or replace function public.remove_conversation_member(conv uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target_role public.member_role;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if target = me then
    -- leave
    if public.member_role(conv, me) = 'owner' then
      raise exception 'owner cannot leave; transfer ownership first';
    end if;
    delete from public.conversation_members
    where conversation_id = conv and user_id = me;
    return;
  end if;

  if not public.member_has_permission(conv, me, 'remove_members') and not public.is_staff(me) then
    raise exception 'remove denied';
  end if;

  target_role := public.member_role(conv, target);
  if target_role = 'owner' and not public.is_staff(me) then
    raise exception 'cannot remove owner';
  end if;

  delete from public.conversation_members
  where conversation_id = conv and user_id = target;
end;
$$;

create or replace function public.set_member_role(
  conv uuid,
  target uuid,
  new_role public.member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  if new_role = 'owner' then
    raise exception 'use ownership transfer';
  end if;
  if not public.member_has_permission(conv, me, 'manage_permissions')
    and public.member_role(conv, me) <> 'owner'
    and not public.is_staff(me)
  then
    raise exception 'manage denied';
  end if;
  if public.member_role(conv, target) = 'owner' then
    raise exception 'cannot change owner role';
  end if;
  update public.conversation_members
  set role = new_role, permissions = '{}'
  where conversation_id = conv and user_id = target;
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;
grant execute on function public.create_room_conversation(public.conversation_type, text, uuid[], boolean) to authenticated;
grant execute on function public.add_conversation_members(uuid, uuid[], public.member_role) to authenticated;
grant execute on function public.join_public_channel(uuid) to authenticated;
grant execute on function public.join_conversation_by_invite(text) to authenticated;
grant execute on function public.remove_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.is_blocked_either(uuid, uuid) to authenticated;
grant execute on function public.are_direct_contacts(uuid, uuid) to authenticated;
grant execute on function public.member_has_permission(uuid, uuid, text) to authenticated;
grant execute on function public.visibility_allows(public.visibility_level, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace weak RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists members_insert on public.conversation_members;
create policy members_insert on public.conversation_members for insert to authenticated
  with check (
    -- Direct client inserts are denied. Authorized flows use SECURITY DEFINER RPCs
    -- (and staff may insert for support operations).
    public.is_staff(auth.uid())
  );

drop policy if exists members_update on public.conversation_members;
create policy members_update on public.conversation_members for update to authenticated
  using (
    public.is_active_user(auth.uid())
    and (
      user_id = auth.uid()
      or public.member_has_permission(conversation_id, auth.uid(), 'manage_permissions')
      or public.member_has_permission(conversation_id, auth.uid(), 'remove_members')
      or public.is_staff(auth.uid())
    )
  )
  with check (
    public.is_active_user(auth.uid())
  );

drop policy if exists members_delete on public.conversation_members;
create policy members_delete on public.conversation_members for delete to authenticated
  using (
    public.is_active_user(auth.uid())
    and (
      user_id = auth.uid()
      or public.member_has_permission(conversation_id, auth.uid(), 'remove_members')
      or public.is_staff(auth.uid())
    )
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (
    public.is_active_user(auth.uid())
    and public.is_member(conversation_id, auth.uid())
    and (
      sender_id = auth.uid()
      or public.member_has_permission(conversation_id, auth.uid(), 'pin_messages')
      or public.member_has_permission(conversation_id, auth.uid(), 'delete_posts')
      or public.is_staff(auth.uid())
    )
  )
  with check (
    public.is_member(conversation_id, auth.uid())
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_user(auth.uid())
    and public.is_member(conversation_id, auth.uid())
    and (
      -- Block enforcement for DMs
      (
        select c.type from public.conversations c where c.id = conversation_id
      ) <> 'direct'
      or not public.is_blocked_either(
        auth.uid(),
        public.dm_peer_id(conversation_id, auth.uid())
      )
    )
    and (
      -- Channel posting: owner/admin/post_channel; groups use send_messages
      case (
        select c.type from public.conversations c where c.id = conversation_id
      )
        when 'channel' then
          public.member_has_permission(conversation_id, auth.uid(), 'post_channel')
        when 'group' then
          public.member_has_permission(conversation_id, auth.uid(), 'send_messages')
        else true
      end
    )
  );

drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations for update to authenticated
  using (
    public.is_staff(auth.uid())
    or public.member_has_permission(id, auth.uid(), 'edit_info')
  );

drop policy if exists call_parts_insert on public.call_participants;
create policy call_parts_insert on public.call_participants for insert to authenticated
  with check (
    public.is_active_user(auth.uid())
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.calls c
        where c.id = call_id and c.initiator_id = auth.uid()
      )
    )
  );

drop policy if exists story_reactions_all on public.story_reactions;
create policy story_reactions_select on public.story_reactions for select to authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.expires_at > now()
        and (s.author_id = auth.uid() or public.is_active_user(auth.uid()))
    )
  );
create policy story_reactions_write on public.story_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user(auth.uid())
    and exists (
      select 1 from public.stories s
      where s.id = story_id and s.expires_at > now()
    )
  );
create policy story_reactions_delete on public.story_reactions for delete to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories for select to authenticated
  using (
    expires_at > now()
    and public.is_active_user(auth.uid())
    and (
      author_id = auth.uid()
      or not public.is_blocked_either(auth.uid(), author_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: stories readable only by owner path or via signed URL path checks in app.
-- Keep storage objects private; tighten select to author folder.
-- ---------------------------------------------------------------------------

drop policy if exists stories_read on storage.objects;
create policy stories_read on storage.objects for select to authenticated
  using (
    bucket_id = 'stories'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff(auth.uid())
    )
  );

-- Anon must be able to read registration/maintenance flags on login.
drop policy if exists settings_read on public.system_settings;
create policy settings_read on public.system_settings for select to authenticated
  using (true);
create policy settings_public_keys on public.system_settings for select to anon
  using (key in ('registration_policy', 'maintenance_mode', 'feature_flags', 'branding'));
