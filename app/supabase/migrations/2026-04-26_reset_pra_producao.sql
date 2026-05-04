-- =====================================================================
-- Migration: Reset pra produção (2026-04-26)
-- Zera dados de movimento (rondas/evals/inspeções/rotas/eventos) e
-- reverte herd + inventory pros valores iniciais documentados no app
-- (app/src/lib/db/seed.ts).
--
-- Mantém: profiles, paddocks, water_tanks, farm_boundaries, grass_types,
--         formulas (catálogos estáticos).
--
-- Idempotente: se rodar 2× zera o que tiver e re-popula com os mesmos
-- valores. Usuários e geometrias dos piquetes ficam intactos.
--
-- Como rodar: SQL Editor do Supabase. Bloqueia ~1s.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0) Limpa fórmulas de teste criadas durante QA E2E.
--    `inventory` referencia `formulas`, então faz parte do reset de
--    inventory (logo abaixo). Aqui só removemos a row do catálogo —
--    qualquer entrada com saldo dela é zerada na seção 3.
-- ---------------------------------------------------------------------

delete from inventory where formula_id in (
  select id from formulas where name like 'E2E TEST%'
);
delete from formulas where name like 'E2E TEST%';

-- ---------------------------------------------------------------------
-- 1) Limpa dados de movimento. Ordem respeita FKs (filhos → pais).
-- ---------------------------------------------------------------------

delete from inspection_requests;

delete from resupply_deliveries;
delete from resupply_loads;
delete from resupply_routes;

delete from supplement_evals;
delete from bombona_evals;
delete from forage_evals;
delete from water_evals;
delete from biological_water_evals;
delete from health_evals;
delete from fence_evals;
delete from visual_weight_evals;
delete from washing_evals;
delete from rondas;

delete from inventory_events;
delete from herd_events;

-- ---------------------------------------------------------------------
-- 2) Reset herd pros valores iniciais (snapshot 2026-04-17).
--    Lookup de paddock pelo nome — IDs são uuid no servidor, mas os
--    nomes vêm do KML v5 e são estáveis.
-- ---------------------------------------------------------------------

delete from herd;

insert into herd (paddock_id, category, head_count, avg_weight_kg)
select p.id, v.category, v.head_count, v.avg_weight_kg
from (values
  ('NSA I P03 - T32', 'NOVILHA',          61, 198),
  ('NSA I P06 - T32', 'GARROTE',         110, 375),
  ('NSA I P08 - P32', 'GARROTE',          61, 330),
  ('NSA I P10 - T32', 'GARROTE',          77, 206),
  ('NSA I P11',       'VACA PARIDA',      73, 450),
  ('NSA I P11',       'BEZERRO MAMANDO',  37,  95),
  ('NSA I P11',       'BEZERRA MAMANDO',  27,  90),
  ('NSA I P11A',      'VACA PARIDA',       5, 450),
  ('NSA I P11A',      'BEZERRA MAMANDO',   4, 100),
  ('NSA I P11A',      'BEZERRO MAMANDO',   1, 100),
  ('NSA I P12',       'BEZERRA MAMANDO',  13, 100),
  ('NSA I P12',       'VACA PARIDA',      11, 450),
  ('NSA I P12',       'BEZERRO MAMANDO',   4, 100),
  ('NSA I P13',       'GARROTE',          90, 288),
  ('NSA I P14',       'GARROTE',          71, 300),
  ('NSA I P14 - T32', 'GARROTE',          74, 180),
  ('NSA I P14A',      'GARROTE',         102, 254),
  ('NSA I P15',       'GARROTE',          90, 273),
  ('NSA I P15 - T32', 'GARROTE',         107, 338),
  ('NSA I P15 A',     'GARROTE',          93, 216),
  ('NSA I P16',       'NOVILHA',          89, 319),
  ('NSA I P17',       'NOVILHA',          84, 254),
  ('NSA I P18',       'VACA SOLTEIRA',    23, 450),
  ('NSA I P25A - T34','GARROTE',         103, 350),
  ('NSA I P28 - T34', 'GARROTE',         108, 375),
  ('NSA I P30A - T34','GARROTE',          87, 337),
  ('NSA I P46',       'BEZERRO MAMANDO',   7, 100),
  ('NSA I P46',       'VACA PARIDA',       5, 450),
  ('NSA I P46',       'BEZERRA MAMANDO',   2, 100),
  ('NSA I P52',       'VACA PARIDA',      83, 470),
  ('NSA I P52',       'BEZERRA MAMANDO',  54,  71),
  ('NSA I P52',       'BEZERRO MAMANDO',  24,  80),
  ('NSA I P54',       'NOVILHA',          45, 312),
  ('NSA I P57',       'VACA PRENHA',     103, 450),
  ('NSA I P57',       'BEZERRO MAMANDO',  45, 118),
  ('NSA I P57',       'BEZERRA MAMANDO',  37, 114),
  ('NSA I P71',       'VACA PRENHA',      98, 450),
  ('NSA I P71',       'BEZERRA MAMANDO',  34, 100),
  ('NSA I P71',       'BEZERRO MAMANDO',  28, 100),
  ('NSA I P71A',      'VACA PRENHA',      93, 450),
  ('NSA I P71A',      'BEZERRA MAMANDO',  48, 100),
  ('NSA I P71A',      'BEZERRO MAMANDO',  44, 100),
  ('NSA I P72A',      'VACA PRENHA',     138, 450),
  ('NSA I P72A',      'BEZERRO MAMANDO',  68, 120),
  ('NSA I P72A',      'BEZERRA MAMANDO',  50, 130),
  ('NSA I P75',       'VACA PARIDA',     111, 420),
  ('NSA I P75',       'BEZERRO MAMANDO', 109, 140),
  ('NSA I P75',       'BEZERRA MAMANDO',  80, 130),
  ('NSA I P81',       'NOVILHA',         136, 279),
  ('NSA I P82',       'NOVILHA',         115, 201),
  ('NSA I P86',       'VACA PARIDA',     149, 450),
  ('NSA I P86',       'BEZERRO MAMANDO',  79, 120),
  ('NSA I P86',       'BEZERRA MAMANDO',  75, 115),
  ('NSA II P13 - T27','NOVILHA',         129, 312),
  ('NSA II P18B - T27','GARROTE',        110, 349),
  ('NSA II P19B - T27','GARROTE',         99, 387),
  ('NSA II P21B - T27','GARROTE',        110, 350),
  ('NSA II P26B - T27','GARROTE',         71, 221),
  ('NSA II P28B - T27','GARROTE',         71, 375)
) as v(paddock_name, category, head_count, avg_weight_kg)
join paddocks p on p.name = v.paddock_name and p.deleted_at is null;

-- ---------------------------------------------------------------------
-- 3) Reset inventory: bombonas zeradas (DELETE) + central nos valores
--    iniciais (UPSERT por formula+location).
-- ---------------------------------------------------------------------

delete from inventory where location = 'bombona';

-- Garante que existe linha de central pra cada fórmula com os valores
-- iniciais. Usa lookup pelo nome da fórmula.
do $$
declare
  rec record;
begin
  for rec in
    select v.name, v.qty, v.minq from (values
      ('Probeef Reprodução',     400, 10),
      ('Probeef Topmost Golden', 734, 10),
      ('Engorda 3 KG',             0,  5),
      ('Sal Mineral',              0,  5),
      ('Proteinado Seco',          0,  5)
    ) as v(name, qty, minq)
  loop
    update inventory i
       set quantity_sacks = rec.qty,
           min_sacks = rec.minq,
           paddock_id = null
     from formulas f
     where i.formula_id = f.id
       and f.name = rec.name
       and i.location = 'central';

    if not found then
      insert into inventory (formula_id, quantity_sacks, min_sacks, location, paddock_id)
      select f.id, rec.qty, rec.minq, 'central', null
      from formulas f where f.name = rec.name;
    end if;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
