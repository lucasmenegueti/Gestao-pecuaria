-- Auditoria de plausibilidade das rondas.
-- Pergunta: a ronda foi marcada no piquete, ou digitada em lote na sede?
--
-- Não existe GPS nas rondas (ainda). O que existe:
--   *_evals.created_at = datetime('now','localtime') do DEVICE, empurrado cru
--     para um timestamptz -> chega ao Postgres como hora de Brasília rotulada
--     de UTC. Ou seja: created_at (naive) JÁ É a hora local do peão.
--   *_evals.updated_at = now() do servidor no momento do push.
--   => (updated_at - created_at - 3h) = latência de sync (tempo offline).
--
-- Duas leituras independentes, ambas sem GPS:
--   1. velocidade implícita: distância entre centróides dos piquetes na ordem
--      de gravação / tempo decorrido. Acima de ~40 km/h de média no dia inteiro
--      é incompatível com rodar piquete a cavalo/trator.
--   2. ordem alfabética: a lista em (tabs)/ronda.tsx ordena por p.name. Correlação
--      alta entre ordem temporal e ordem alfabética = alguém descendo a tela.
--
-- LIMITE CONHECIDO: isso não separa "não foi ao campo" de "foi ao campo e
-- digitou tudo depois na sede". Para essa separação, só GPS no momento do save.

with e as (
  select ronda_id, created_at, updated_at from supplement_evals
  union all select ronda_id, created_at, updated_at from forage_evals
  union all select ronda_id, created_at, updated_at from water_evals
  union all select ronda_id, created_at, updated_at from fence_evals
  union all select ronda_id, created_at, updated_at from health_evals
  union all select ronda_id, created_at, updated_at from bombona_evals
  union all select ronda_id, created_at, updated_at from visual_weight_evals
  union all select ronda_id, created_at, updated_at from washing_evals
  union all select ronda_id, created_at, updated_at from biological_water_evals
),
rr as (
  select r.id, r.user_id, r.date, p.name as paddock,
         p.center_lat as lat, p.center_lng as lng,
         min(e.created_at) as t0,
         min(extract(epoch from (e.updated_at - e.created_at))/60) - 180 as lat_sync_min
  from rondas r
  join e on e.ronda_id = r.id
  join paddocks p on p.id = r.paddock_id
  where r.deleted_at is null
    and r.date > current_date - 120
  group by 1,2,3,4,5,6
),
seq as (
  select *,
    lag(t0)  over w as prev_t,
    lag(lat) over w as prev_lat,
    lag(lng) over w as prev_lng,
    row_number() over w as ord_tempo,
    rank() over (partition by user_id, date order by paddock) as ord_alfa
  from rr
  window w as (partition by user_id, date order by t0)
),
d as (
  select *,
    extract(epoch from (t0 - prev_t))/60 as dt_min,
    case when prev_lat is null or lat is null then null else
      2*6371*asin(sqrt(
        power(sin(radians(lat - prev_lat)/2), 2)
        + cos(radians(prev_lat))*cos(radians(lat))*power(sin(radians(lng - prev_lng)/2), 2)
      )) end as dist_km
  from seq
)
select
  coalesce(au.raw_user_meta_data->>'name', au.email)         as usuario,
  d.date,
  count(*)                                                    as piquetes,
  to_char(min(d.t0), 'HH24:MI')                               as inicio,
  to_char(max(d.t0), 'HH24:MI')                               as fim,
  round((extract(epoch from (max(d.t0)-min(d.t0)))/3600)::numeric, 1) as horas,
  round(sum(d.dist_km)::numeric, 1)                           as km_entre_piquetes,
  round((sum(d.dist_km) / nullif(extract(epoch from (max(d.t0)-min(d.t0)))/3600, 0))::numeric, 0) as vel_media_kmh,
  round(corr(d.ord_tempo, d.ord_alfa)::numeric, 2)            as corr_ordem_alfabetica,
  count(*) filter (where d.dt_min > 0.2 and d.dist_km/(d.dt_min/60) > 60) as saltos_impossiveis,
  round(avg(d.lat_sync_min)::numeric, 1)                      as latencia_sync_min
from d
join auth.users au on au.id = d.user_id
group by 1, 2
having count(*) >= 10
order by vel_media_kmh desc nulls last;


-- ---------------------------------------------------------------------------
-- Bloco 2: o conteúdo das avaliações difere entre dias suspeitos e plausíveis?
-- Se a variância colapsa nos dias suspeitos (todo mundo o mesmo valor), aponta
-- para dado inventado na tela. Se a variância se mantém, aponta para dado real
-- digitado em lote fora do piquete. Rodado em 17/09/2026: variância MANTIDA
-- (voltagens distintas 9,3% vs 11,9%; desvio 2965 vs 2697 V) -> digitação em
-- lote, não invenção. O que muda é a completude: 2,82 seções/ronda nos dias
-- plausíveis contra 2,19 nos suspeitos, e 4,9% de fotos contra 0,0%.
-- ---------------------------------------------------------------------------

with e as (
  select ronda_id, created_at from supplement_evals
  union all select ronda_id, created_at from water_evals
  union all select ronda_id, created_at from fence_evals
),
rr as (
  select r.id, r.user_id, r.date, p.center_lat lat, p.center_lng lng, min(e.created_at) t0
  from rondas r join e on e.ronda_id = r.id join paddocks p on p.id = r.paddock_id
  where r.deleted_at is null and r.date > current_date - 120
  group by 1,2,3,4,5
),
seq as (
  select *, lag(lat) over w prev_lat, lag(lng) over w prev_lng
  from rr window w as (partition by user_id, date order by t0)
),
d as (
  select *, case when prev_lat is null or lat is null then null else
    2*6371*asin(sqrt(power(sin(radians(lat-prev_lat)/2),2)
      + cos(radians(prev_lat))*cos(radians(lat))*power(sin(radians(lng-prev_lng)/2),2))) end dist_km
  from seq
),
dia as (
  select user_id, date, count(*) n, sum(dist_km) km,
         extract(epoch from (max(t0)-min(t0)))/3600 h
  from d group by 1,2 having count(*) >= 10
),
cls as (
  select user_id, date,
    case when h > 0 and km/h > 40 then 'suspeito'
         when h > 0 and km/h < 20 then 'plausivel' end grupo
  from dia
),
rc as (
  select r.id ronda_id, c.grupo
  from rondas r join cls c on c.user_id = r.user_id and c.date = r.date
  where c.grupo is not null and r.deleted_at is null
),
ce as (
  select rc.grupo, count(fe.id) n,
    round((100.0*count(distinct fe.voltage)/nullif(count(fe.id),0))::numeric,1) pct_dist,
    round(stddev(fe.voltage)::numeric,0) sd
  from rc join fence_evals fe on fe.ronda_id = rc.ronda_id group by 1
),
su as (
  select rc.grupo, count(s.id) n,
    round((100.0*count(distinct s.sacks_in_trough)/nullif(count(s.id),0))::numeric,1) pct_dist,
    round((100.0*count(*) filter (where s.photo_uri is not null)/nullif(count(s.id),0))::numeric,1) pct_foto
  from rc join supplement_evals s on s.ronda_id = rc.ronda_id group by 1
),
sec as (
  select rc.grupo, count(distinct rc.ronda_id) rondas, count(x.ronda_id) secoes
  from rc left join (
    select ronda_id from supplement_evals union all select ronda_id from water_evals
    union all select ronda_id from fence_evals union all select ronda_id from bombona_evals
    union all select ronda_id from health_evals union all select ronda_id from washing_evals
    union all select ronda_id from visual_weight_evals
    union all select ronda_id from biological_water_evals
  ) x on x.ronda_id = rc.ronda_id
  group by 1
)
select su.grupo, sec.rondas,
       round((sec.secoes::numeric / sec.rondas), 2) as secoes_por_ronda,
       su.pct_foto        as supl_pct_com_foto,
       ce.pct_dist        as cerca_pct_voltagens_distintas,
       ce.sd              as cerca_desvio_volts
from su join sec on sec.grupo = su.grupo left join ce on ce.grupo = su.grupo;


-- ---------------------------------------------------------------------------
-- Bloco 3: com GPS (v0.13.0 em diante). Só devolve linhas depois que a migration
-- 2026-09-17_rondas_gps.sql estiver aplicada E os devices estiverem na versão nova.
--
-- Sem PostGIS (a coluna `geometry` é jsonb, não geography), o teste é a distância
-- do ponto ao centro do piquete contra o raio de um círculo de mesma área. Não é
-- point-in-polygon exato — piquete comprido e estreito dá falso "fora" na ponta —
-- por isso a folga de 2x no raio. Serve pra achar o caso grosseiro: ronda lançada
-- a quilômetros do piquete.
-- ---------------------------------------------------------------------------

select
  coalesce(au.raw_user_meta_data->>'name', au.email) as usuario,
  r.date,
  p.name                                            as piquete,
  round(r.gps_accuracy_m::numeric, 0)               as precisao_m,
  r.gps_mocked                                      as posicao_falsa,
  round((
    2*6371000*asin(sqrt(
      power(sin(radians(r.gps_lat - p.center_lat)/2), 2)
      + cos(radians(p.center_lat))*cos(radians(r.gps_lat))
        * power(sin(radians(r.gps_lng - p.center_lng)/2), 2)
    ))
  )::numeric, 0)                                    as distancia_do_centro_m,
  round((sqrt(p.area_hectares * 10000 / pi()))::numeric, 0) as raio_equivalente_m,
  case
    when r.gps_mocked then 'POSIÇÃO FALSA'
    when 2*6371000*asin(sqrt(
      power(sin(radians(r.gps_lat - p.center_lat)/2), 2)
      + cos(radians(p.center_lat))*cos(radians(r.gps_lat))
        * power(sin(radians(r.gps_lng - p.center_lng)/2), 2)
    )) > 2 * sqrt(p.area_hectares * 10000 / pi()) then 'FORA DO PIQUETE'
    else 'no piquete'
  end                                               as veredito
from rondas r
join paddocks p on p.id = r.paddock_id
join auth.users au on au.id = r.user_id
where r.deleted_at is null
  and r.gps_at is not null
  and p.center_lat is not null
order by distancia_do_centro_m desc
limit 100;
