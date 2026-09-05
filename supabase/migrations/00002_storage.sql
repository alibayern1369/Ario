insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars', 'avatars', true, 4194304),
  ('media', 'media', false, 83886080),
  ('voice', 'voice', false, 16777216),
  ('documents', 'documents', false, 41943040),
  ('stories', 'stories', false, 41943040)
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy media_read on storage.objects for select to authenticated
  using (
    bucket_id in ('media', 'voice', 'documents')
    and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
create policy media_write on storage.objects for insert to authenticated
  with check (
    bucket_id in ('media', 'voice', 'documents')
    and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
create policy media_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('media', 'voice', 'documents')
    and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy stories_read on storage.objects for select to authenticated
  using (bucket_id = 'stories');
create policy stories_write on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
create policy stories_delete on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
