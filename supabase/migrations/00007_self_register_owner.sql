-- Self-serve registration + ensure an owner exists for admin access.

update public.system_settings
set value = '{"mode":"open"}'::jsonb
where key = 'registration_policy';

-- Promote the earliest account to owner when none exists (so /admin works).
update public.profiles p
set role = 'owner'
where p.id = (
  select id from public.profiles
  order by created_at asc, id asc
  limit 1
)
and not exists (
  select 1 from public.profiles where role = 'owner'
);

-- First registered user becomes owner when the system has no owner yet.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
  assigned public.app_role;
  has_owner boolean;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  uname := regexp_replace(uname, '[^a-z0-9_]', '', 'g');
  if length(uname) < 3 then
    uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  select exists(select 1 from public.profiles where role = 'owner') into has_owner;

  if new.raw_user_meta_data ? 'app_role' then
    assigned := coalesce((new.raw_user_meta_data->>'app_role')::public.app_role, 'member');
  elsif not has_owner then
    assigned := 'owner';
  else
    assigned := 'member';
  end if;

  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'display_name', uname),
    assigned
  )
  on conflict (id) do nothing;
  insert into public.privacy_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
