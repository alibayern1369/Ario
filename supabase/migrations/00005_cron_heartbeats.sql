-- Ops heartbeats for story expiry + scheduled channel posts.
-- Non-destructive: create table + RLS only.

create table if not exists public.cron_heartbeats (
  job_name text primary key,
  last_run_at timestamptz not null default now(),
  last_status text not null default 'ok',
  last_detail jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cron_heartbeats enable row level security;

drop policy if exists cron_heartbeats_staff_select on public.cron_heartbeats;
create policy cron_heartbeats_staff_select on public.cron_heartbeats
  for select to authenticated
  using (public.is_staff(auth.uid()));

-- Writes are service-role only (no insert/update policies for authenticated).

comment on table public.cron_heartbeats is
  'Last successful/failed run markers for expire-stories and publish-scheduled jobs';
