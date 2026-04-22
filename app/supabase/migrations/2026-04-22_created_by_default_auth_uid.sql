-- ----------------------------------------------------------------------------
-- Migration: default created_by = auth.uid() em todas as tabelas sincronizadas
-- Data: 2026-04-22
-- Motivo:
--   O cliente não envia created_by no push (engine.ts:40 marca como
--   REMOTE_ONLY_COLS) porque a intenção era o servidor preencher via default.
--   Sem default, created_by fica NULL. Como as políticas RLS de UPDATE
--   exigem `is_admin() or created_by = auth.uid()`, qualquer UPDATE de peão
--   era rejeitado silenciosamente (push_update_rls nos logs), gerando:
--     - Rotas que nunca viram 'completed' após finalizar
--     - 10+ rotas 'in_progress' penduradas
--     - Estoque fantasma ao devolver sacos de rotas canceladas
-- ----------------------------------------------------------------------------

-- 1) Adicionar DEFAULT auth.uid() em todas as tabelas com coluna created_by

alter table rondas                 alter column created_by set default auth.uid();
alter table supplement_evals       alter column created_by set default auth.uid();
alter table bombona_evals          alter column created_by set default auth.uid();
alter table forage_evals           alter column created_by set default auth.uid();
alter table water_evals            alter column created_by set default auth.uid();
alter table biological_water_evals alter column created_by set default auth.uid();
alter table health_evals           alter column created_by set default auth.uid();
alter table fence_evals            alter column created_by set default auth.uid();
alter table visual_weight_evals    alter column created_by set default auth.uid();
alter table washing_evals          alter column created_by set default auth.uid();
alter table inventory_events       alter column created_by set default auth.uid();
alter table herd_events            alter column created_by set default auth.uid();
alter table resupply_routes        alter column created_by set default auth.uid();
alter table resupply_loads         alter column created_by set default auth.uid();
alter table resupply_deliveries    alter column created_by set default auth.uid();

-- 2) Backfill: rows com created_by NULL → atribuir ao user_id da own row quando existir,
--    ou pro admin do sistema como fallback. Ajuste o fallback UUID se tiver outro dono.

-- Rondas e resupply_routes já têm user_id: copiar.
update rondas
  set created_by = user_id
  where created_by is null and user_id is not null;

update resupply_routes
  set created_by = user_id
  where created_by is null and user_id is not null;

-- inventory_events e herd_events: pular backfill.
-- Alguns ambientes (schema de produção antes do migration v0.5.x) não têm
-- user_id nessa tabela, o UPDATE quebra com "column does not exist".
-- Deixar rows antigos com created_by=NULL é aceitável — são eventos
-- append-only/ledger, o RLS UPDATE não afeta (ninguém atualiza esses rows).
-- Novos inserts vão preencher via DEFAULT auth.uid().

-- Para rows sem user_id explícito (evals), herdar da ronda pai:
update supplement_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update bombona_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update forage_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update water_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update biological_water_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update health_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update fence_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update visual_weight_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

update washing_evals e
  set created_by = r.user_id
  from rondas r
  where e.ronda_id = r.id and e.created_by is null and r.user_id is not null;

-- resupply_loads e resupply_deliveries herdam da rota pai:
update resupply_loads l
  set created_by = r.user_id
  from resupply_routes r
  where l.route_id = r.id and l.created_by is null and r.user_id is not null;

update resupply_deliveries d
  set created_by = r.user_id
  from resupply_routes r
  where d.route_id = r.id and d.created_by is null and r.user_id is not null;

-- 3) Cleanup: rotas "penduradas" sem atividade recente → marcar como cancelled.
-- Critério: in_progress há mais de 12 horas com end_time null. Ajuste se preferir
-- outro critério. Sacos carregados NÃO voltam automaticamente ao central aqui —
-- isso requer fluxo do app porque envolve lançar inventory_events, e essa migration
-- deve ser idempotente/sem efeitos colaterais em ledger. Cancelar só o status resolve
-- o "10 rotas penduradas" no UI.
update resupply_routes
  set status = 'cancelled',
      end_time = coalesce(end_time, start_time + interval '1 hour')
  where status = 'in_progress'
    and start_time < now() - interval '12 hours';
