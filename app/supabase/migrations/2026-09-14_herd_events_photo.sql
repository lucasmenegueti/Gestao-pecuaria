-- Foto em morte/aborto (v0.12.0). Aplicar em prod (fxtescythawmbwkthbyb) E na branch QA (zmetxajiimsclhuhaykv).
-- O app sobe o arquivo pro bucket privado `herd-photos` (chave herd_events/<uuid>.jpg)
-- durante o push e grava a chave em herd_events.photo_path.
alter table public.herd_events add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('herd-photos', 'herd-photos', false)
on conflict (id) do nothing;

-- upsert:true do supabase-js precisa de INSERT + UPDATE; SELECT pra o admin baixar depois.
create policy "herd_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'herd-photos');
create policy "herd_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'herd-photos');
create policy "herd_photos_update" on storage.objects for update to authenticated
  using (bucket_id = 'herd-photos') with check (bucket_id = 'herd-photos');
