-- Allow self-service registration by default (admin can still switch to invite/closed).
update public.system_settings
set value = '{"mode":"open"}'::jsonb
where key = 'registration_policy';
