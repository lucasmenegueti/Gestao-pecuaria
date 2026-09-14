-- Foto em morte/aborto (v0.12.0). Aplicar na branch QA (zmetxajiimsclhuhaykv) quando quiser;
-- em prod (fxtescythawmbwkthbyb) SÓ DEPOIS de todos os devices estarem no OTA v0.12.0:
-- device antigo (schema v24) falha o INSERT local de todo herd_events que chega com
-- `photo_path`, o erro é engolido e o cursor avança — eventos somem em silêncio.
-- Remédio se a ordem escapar: no device, UPDATE sync_state SET last_pull_at = NULL WHERE id = 1.
-- O app sobe o arquivo pro bucket privado `herd-photos` (chave herd_events/<uuid>.jpg)
-- durante o push e grava a chave em herd_events.photo_path.
alter table public.herd_events add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('herd-photos', 'herd-photos', false)
on conflict (id) do nothing;

-- upsert:true do supabase-js precisa de INSERT + UPDATE; SELECT pra o admin baixar depois.
drop policy if exists "herd_photos_select" on storage.objects;
create policy "herd_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'herd-photos');
drop policy if exists "herd_photos_insert" on storage.objects;
create policy "herd_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'herd-photos');
drop policy if exists "herd_photos_update" on storage.objects;
create policy "herd_photos_update" on storage.objects for update to authenticated
  using (bucket_id = 'herd-photos') with check (bucket_id = 'herd-photos');
