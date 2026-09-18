-- Localização do aparelho no momento em que a ronda foi aberta.
--
-- Nullable de propósito: o peão pode negar a permissão, o GPS pode não dar fix
-- no tempo limite, e a ronda tem que continuar funcionando offline sem isso.
-- gps_mocked = flag do Android para posição falsa (mock location provider);
-- no iOS vem sempre NULL (a plataforma não expõe o equivalente).
--
-- ORDEM DE DEPLOY: esta migration vai ANTES do OTA. As colunas sobem em todo
-- push de ronda (não estão em LOCAL_ONLY_COLS), então um app novo contra um
-- servidor sem as colunas falha o push com PGRST204.

alter table public.rondas
  add column if not exists gps_lat real,
  add column if not exists gps_lng real,
  add column if not exists gps_accuracy_m real,
  add column if not exists gps_mocked boolean,
  add column if not exists gps_at timestamptz;

comment on column public.rondas.gps_at is
  'Hora do relógio do device na captura do fix. NULL = sem permissão, sem fix, ou app anterior a v0.13.0.';
