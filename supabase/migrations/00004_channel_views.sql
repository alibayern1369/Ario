-- Channel views helper (idempotent). No DROP TABLE / destructive data changes.
-- Requires 00003_security_harden.sql so messages_update_guard allows view_count increments.

create or replace function public.record_channel_view(msg uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
  ctype public.conversation_type;
begin
  if me is null or not public.is_active_user(me) then
    raise exception 'not allowed';
  end if;
  select m.conversation_id, c.type into conv, ctype
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.id = msg;
  if conv is null or ctype <> 'channel' then
    return;
  end if;
  if not public.is_member(conv, me) then
    raise exception 'not a member';
  end if;
  insert into public.channel_views (message_id, user_id)
  values (msg, me)
  on conflict do nothing;
  if found then
    update public.messages set view_count = view_count + 1 where id = msg;
  end if;
end;
$$;

grant execute on function public.record_channel_view(uuid) to authenticated;

-- Public channel discovery remains via conversations RLS + join_public_channel RPC.
-- This migration only adds/replaces the view-recording RPC (safe to re-run).
