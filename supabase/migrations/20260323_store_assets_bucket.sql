-- Create store-assets bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
values ('store-assets', 'store-assets', true, 5242880, null)
on conflict (id) do nothing;

-- Set up RLS policies for the objects in the bucket
create policy "store_assets_public_read" on storage.objects for select using ( bucket_id = 'store-assets' );
create policy "store_assets_auth_insert" on storage.objects for insert with check ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );
create policy "store_assets_auth_update" on storage.objects for update using ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );
create policy "store_assets_auth_delete" on storage.objects for delete using ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );
