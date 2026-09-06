-- Allow the first signed-in user to claim owner via RPC (no service-role table grants needed).

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

  select id into existing_owner
  from public.profiles
  where role = 'owner'
  limit 1;

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

  update public.profiles
  set role = 'owner'
  where id = me;

  insert into public.admin_audit_log (actor_id, action, target, metadata)
  values (me, 'bootstrap_owner', me::text, '{"via":"rpc"}'::jsonb);

  return jsonb_build_object('ok', true, 'role', 'owner', 'already', false);
end;
$$;

revoke all on function public.claim_bootstrap_owner() from public;
grant execute on function public.claim_bootstrap_owner() to authenticated;

-- Block self-elevation of app role except through claim_bootstrap_owner / service role.
create or replace function public.profiles_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and auth.uid() is not null
     and auth.uid() = new.id
     and not public.is_staff(auth.uid())
  then
    -- Allow only the bootstrap path: no owner exists yet and promoting self to owner.
    if not (
      new.role = 'owner'
      and old.role is distinct from 'owner'
      and not exists (select 1 from public.profiles p where p.role = 'owner' and p.id <> new.id)
    ) then
      raise exception 'cannot change own role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.profiles_role_guard();

-- Ensure registration stays open and an owner exists when possible.
update public.system_settings
set value = '{"mode":"open"}'::jsonb
where key = 'registration_policy';

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
