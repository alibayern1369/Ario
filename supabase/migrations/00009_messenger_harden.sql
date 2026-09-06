-- Harden registration profiles, discovery, and bootstrap for production messenger use.

-- Ensure every auth user has a profile (backfill missing rows).
insert into public.profiles (id, username, display_name, role, status)
select
  u.id,
  lower(
    coalesce(
      nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
      'user' || substr(replace(u.id::text, '-', ''), 1, 8)
    )
  ),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'user'),
  case when not exists (select 1 from public.profiles where role = 'owner') then 'owner'::public.app_role else 'member'::public.app_role end,
  'active'::public.account_status
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Unique usernames for backfilled rows that collided (append short id).
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, username
    from public.profiles
    where username in (
      select username from public.profiles group by username having count(*) > 1
    )
  loop
    base := left(regexp_replace(r.username, '_+$', ''), 24);
    n := 0;
    loop
      n := n + 1;
      candidate := base || '_' || substr(replace(r.id::text, '-', ''), 1, 4) || n::text;
      exit when not exists (select 1 from public.profiles where username = candidate and id <> r.id);
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

insert into public.privacy_settings (user_id)
select id from public.profiles
where not exists (select 1 from public.privacy_settings ps where ps.user_id = profiles.id)
on conflict do nothing;

-- First profile becomes owner if none.
update public.profiles p
set role = 'owner'
where p.id = (select id from public.profiles order by created_at asc, id asc limit 1)
and not exists (select 1 from public.profiles where role = 'owner');

update public.system_settings
set value = '{"mode":"open"}'::jsonb
where key = 'registration_policy';

-- Reliable profile creation on signup (idempotent upsert).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
  assigned public.app_role;
  has_owner boolean;
  dname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  uname := regexp_replace(uname, '[^a-z0-9_]', '', 'g');
  if length(uname) < 3 then
    uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  -- Avoid unique collisions.
  if exists (select 1 from public.profiles where username = uname and id <> new.id) then
    uname := left(uname, 24) || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  select exists(select 1 from public.profiles where role = 'owner') into has_owner;

  if new.raw_user_meta_data ? 'app_role' then
    assigned := coalesce((new.raw_user_meta_data->>'app_role')::public.app_role, 'member');
  elsif not has_owner then
    assigned := 'owner';
  else
    assigned := 'member';
  end if;

  dname := coalesce(new.raw_user_meta_data->>'display_name', uname);

  insert into public.profiles (id, username, display_name, role)
  values (new.id, uname, dname, assigned)
  on conflict (id) do update
    set username = excluded.username,
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        role = case
          when public.profiles.role = 'owner' then public.profiles.role
          when excluded.role = 'owner' then 'owner'::public.app_role
          else public.profiles.role
        end;

  insert into public.privacy_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- claim_bootstrap_owner (recreate if missing)
create or replace function public.claim_bootstrap_owner()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing_owner uuid;
  my_role public.app_role;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  select id into existing_owner from public.profiles where role = 'owner' limit 1;
  select role into my_role from public.profiles where id = me;

  if my_role is null then
    raise exception 'profile missing';
  end if;

  if existing_owner is not null then
    if my_role in ('owner', 'admin') then
      return jsonb_build_object('ok', true, 'role', my_role::text, 'already', true);
    end if;
    raise exception 'owner_exists';
  end if;

  update public.profiles set role = 'owner' where id = me;
  insert into public.admin_audit_log (actor_id, action, target, metadata)
  values (me, 'bootstrap_owner', me::text, '{"via":"rpc"}'::jsonb);

  return jsonb_build_object('ok', true, 'role', 'owner', 'already', false);
end;
$$;

revoke all on function public.claim_bootstrap_owner() from public;
grant execute on function public.claim_bootstrap_owner() to authenticated;
