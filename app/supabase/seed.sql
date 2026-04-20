-- ====================================================================
-- Gestão Pecuária NSA — seed de produção
-- Gerado por scripts/generate-supabase-seed.mjs em 2026-04-19
-- Rodar DEPOIS do schema.sql no SQL Editor do Supabase.
-- Idempotente: ON CONFLICT DO NOTHING em todas as inserções.
-- ====================================================================

-- Grass types -----------------------------------------------------------
insert into grass_types (id, name, entry_height_cm, exit_height_cm, active)
  values ('b5e60933-490d-5a0f-82d8-ee118e9eaa71', 'Braquiarão', 40, 20, true)
  on conflict (id) do nothing;
insert into grass_types (id, name, entry_height_cm, exit_height_cm, active)
  values ('77992c86-4902-5497-8079-c8c2c83df070', 'Mombaça', 80, 40, true)
  on conflict (id) do nothing;
insert into grass_types (id, name, entry_height_cm, exit_height_cm, active)
  values ('ea0c138b-b737-5bad-981b-75931451e3a9', 'Tifton', 25, 10, true)
  on conflict (id) do nothing;

-- Formulas --------------------------------------------------------------
insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)
  values ('9d04102a-7694-56f0-b59f-1db52c50a81d', 'Probeef Reprodução', 30, 0.25, true)
  on conflict (id) do nothing;
insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)
  values ('6817a2fe-26cc-502a-a235-7d976b4cd7ae', 'Probeef Topmost Golden', 30, 0.5, true)
  on conflict (id) do nothing;
insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)
  values ('44f4b28e-d039-5d7f-aa72-c695ab0f06fb', 'Engorda 3 KG', 25, 7.5, true)
  on conflict (id) do nothing;
insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)
  values ('c8f7e250-be2b-579b-ad99-cff3e906afa8', 'Sal Mineral', 30, 0.2, true)
  on conflict (id) do nothing;
insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)
  values ('d0ee0fe4-c08d-5092-affc-d49e71939144', 'Proteinado Seco', 25, 0.375, true)
  on conflict (id) do nothing;

-- Paddocks (125) ----------------------------------------
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e5470736-057d-56ee-b829-c39fd56e1f4c', 'NSA I P01 - T32', 14.14, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23528742, -45.4280317, '{"type":"Polygon","coordinates":[[[-45.4290891,-15.2335914],[-45.4250979,-15.2358898],[-45.4265034,-15.237929],[-45.430379,-15.2354355],[-45.4290891,-15.2335914]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('272b5bfe-a45e-5cf6-a2c6-89a70044a237', 'NSA I P01 T35', 12.03, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23999212, -45.4258573, '{"type":"Polygon","coordinates":[[[-45.4264873,-15.238213],[-45.4236603,-15.2401647],[-45.4248282,-15.2426383],[-45.4278234,-15.2407316],[-45.4264873,-15.238213]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c451dd8d-0e9e-5172-9cc1-4b87e007968a', 'NSA I P02 - T32', 13.58, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23772822, -45.424070119999996, '{"type":"Polygon","coordinates":[[[-45.4250872,-15.2358898],[-45.4211283,-15.2382604],[-45.4225445,-15.2406721],[-45.4265034,-15.237929],[-45.4250872,-15.2358898]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f9499032-a9fd-5c87-b67f-8f6c1a676893', 'NSA I P02 T35', 11.35, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24235454, -45.42329882, '{"type":"Polygon","coordinates":[[[-45.4248273,-15.2426528],[-45.4221261,-15.2444088],[-45.4210424,-15.2419039],[-45.423671,-15.2401544],[-45.4248273,-15.2426528]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('bb7a53bf-69b5-5b4b-ae96-82323873a0b0', 'NSA I P03 - T32', 13.99, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.240260240000001, -45.42006184, '{"type":"Polygon","coordinates":[[[-45.4211283,-15.2382811],[-45.4169762,-15.240662],[-45.4185319,-15.2433945],[-45.4225445,-15.2406825],[-45.4211283,-15.2382811]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a30c7f28-2a35-5e9b-a89e-40ee22a67e00', 'NSA I P03 T35', 10.86, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24371328, -45.4202678, '{"type":"Polygon","coordinates":[[[-45.4210424,-15.2419143],[-45.4180491,-15.2440259],[-45.4190576,-15.2463134],[-45.4221475,-15.2443985],[-45.4210424,-15.2419143]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('1f4681a6-00ab-54e0-b1e9-ac18c002b1a5', 'NSA I P04 - T32', 13.35, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.242792159999999, -45.416008500000004, '{"type":"Polygon","coordinates":[[[-45.4169977,-15.240662],[-45.4128993,-15.2430946],[-45.4146159,-15.2461374],[-45.4185319,-15.2434048],[-45.4169977,-15.240662]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('87753d68-110f-597d-bca1-69ffa7846d81', 'NSA I P04 T35', 10.24, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24577048, -45.41712973999999, '{"type":"Polygon","coordinates":[[[-45.4180706,-15.2440156],[-45.4146349,-15.2462602],[-45.4158043,-15.2482476],[-45.4190683,-15.2463134],[-45.4180706,-15.2440156]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('725c6bfc-928d-5c86-bf7e-6c4167879db4', 'NSA I P05 T32', 13.66, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.240279000000001, -45.41458372, '{"type":"Polygon","coordinates":[[[-45.4156888,-15.2384468],[-45.4116011,-15.2407344],[-45.4129422,-15.2430946],[-45.4169977,-15.2406724],[-45.4156888,-15.2384468]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('ffbd2409-1943-521a-a1ab-fbe71ad9a536', 'NSA I P05 T35', 12.33, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24257098, -45.42715976, '{"type":"Polygon","coordinates":[[[-45.4278314,-15.240774],[-45.4247951,-15.2426786],[-45.4261684,-15.2452044],[-45.4291725,-15.2434239],[-45.4278314,-15.240774]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('d2a4d592-19e7-5570-8e24-b55b2513ff0c', 'NSA I P06 - T32', 13.96, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23793124, -45.41864348, '{"type":"Polygon","coordinates":[[[-45.4197228,-15.236128],[-45.4156673,-15.2384364],[-45.4169762,-15.240693],[-45.4211283,-15.2382708],[-45.4197228,-15.236128]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f0279417-04f1-5e3a-b48c-de022c6b88af', 'NSA I P06 T35', 12.09, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.244399340000001, -45.42420548, '{"type":"Polygon","coordinates":[[[-45.4248058,-15.2426579],[-45.4221475,-15.2443882],[-45.4231214,-15.2470883],[-45.4261469,-15.2452044],[-45.4248058,-15.2426579]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5b4d09ca-7ce1-56e6-9dcf-294c6331dafa', 'NSA I P07 - T32', 13.12, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.235606200000001, -45.42269468, '{"type":"Polygon","coordinates":[[[-45.4237676,-15.2338712],[-45.4197228,-15.236128],[-45.4211175,-15.2382708],[-45.4250979,-15.2358898],[-45.4237676,-15.2338712]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('1423b62a-5fc5-5f54-ad64-fc24a703a91e', 'NSA I P07 T35', 12.02, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24623244, -45.421344520000005, '{"type":"Polygon","coordinates":[[[-45.4221368,-15.2443882],[-45.4190576,-15.2462928],[-45.4202485,-15.2489426],[-45.4231429,-15.2471504],[-45.4221368,-15.2443882]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('691cba5d-8854-5010-a21b-632612b614e1', 'NSA I P08 - P32', 13.81, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23332244, -45.42663861999999, '{"type":"Polygon","coordinates":[[[-45.4276407,-15.2316247],[-45.4237568,-15.2338505],[-45.4250658,-15.2359105],[-45.4290891,-15.2336018],[-45.4276407,-15.2316247]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e837f143-2b44-5849-81da-2d23189dd093', 'NSA I P08 T35', 11.65, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24814972, -45.418298, '{"type":"Polygon","coordinates":[[[-45.4190683,-15.2463135],[-45.4158068,-15.2482801],[-45.4172444,-15.2508678],[-45.4203022,-15.2489737],[-45.4190683,-15.2463135]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('d54b2c80-d1a8-5c60-b58a-4c25ae27d16c', 'NSA I P09 - T32', 15.42, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.231717900000001, -45.425554999999996, '{"type":"Polygon","coordinates":[[[-45.4276407,-15.231635],[-45.4263639,-15.2296577],[-45.422405,-15.2317905],[-45.4237247,-15.2338713],[-45.4276407,-15.231635]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('13a47fd7-b1d3-5a81-8716-dffda9b0a28d', 'NSA I P09 T35', 12.37, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24521058, -45.42854586, '{"type":"Polygon","coordinates":[[[-45.4292046,-15.243455],[-45.4261469,-15.2452354],[-45.4275631,-15.2477508],[-45.4306101,-15.2461567],[-45.4292046,-15.243455]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2be70ed2-997e-5028-a24a-e77875f38b58', 'NSA I P10 - T32', 13.64, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.233943759999999, -45.42051458, '{"type":"Polygon","coordinates":[[[-45.4183495,-15.2339852],[-45.4224157,-15.2317595],[-45.4237354,-15.2338609],[-45.4197228,-15.236128],[-45.4183495,-15.2339852]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('cd477917-f104-5df0-a7d2-acee0981497e', 'NSA I P10 T35', 12.21, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24698064, -45.425464579999996, '{"type":"Polygon","coordinates":[[[-45.4261577,-15.2452354],[-45.423057,-15.2471194],[-45.4244303,-15.2495726],[-45.4275202,-15.2477404],[-45.4261577,-15.2452354]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'NSA I P11', 25.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22847787142857, -45.447570271428575, '{"type":"Polygon","coordinates":[[[-45.4498261,-15.2287641],[-45.4475223,-15.2306388],[-45.4472876,-15.2302992],[-45.4468687,-15.2305095],[-45.4446393,-15.2260957],[-45.4470218,-15.2242737],[-45.4498261,-15.2287641]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('bcb8c3be-4082-5eea-a884-e1d023604af9', 'NSA I P11 - T32', 13.94, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.236177700000002, -45.417572740000004, '{"type":"Polygon","coordinates":[[[-45.4197228,-15.236128],[-45.418371,-15.2339852],[-45.4143691,-15.2362005],[-45.415678,-15.2384468],[-45.4197228,-15.236128]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f0c6c7f5-22fe-556b-8058-5db205eebb99', 'NSA I P11 T35', 12.44, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.248889700000001, -45.42245242, '{"type":"Polygon","coordinates":[[[-45.4231214,-15.2471608],[-45.4202485,-15.2489116],[-45.4213619,-15.2516117],[-45.4244089,-15.2496036],[-45.4231214,-15.2471608]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'NSA I P11A', 22.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.224733320000002, -45.450047340000005, '{"type":"Polygon","coordinates":[[[-45.4503692,-15.2220376],[-45.4470862,-15.2242944],[-45.4498113,-15.2287665],[-45.4526008,-15.2265305],[-45.4503692,-15.2220376]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'NSA I P12', 40, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.220374828571428, -45.44831472857144, '{"type":"Polygon","coordinates":[[[-45.4499301,-15.2205723],[-45.4494002,-15.220877],[-45.449733,-15.2224082],[-45.4464752,-15.2245621],[-45.444603,-15.2177321],[-45.4481315,-15.2158998],[-45.4499301,-15.2205723]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('7882c9a6-f897-5c0d-b4dd-85cb921dc75f', 'NSA I P12 - T32', 13.93, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.2384488, -45.41352798, '{"type":"Polygon","coordinates":[[[-45.4156673,-15.2384468],[-45.4143584,-15.2362108],[-45.4103029,-15.2384051],[-45.411644,-15.2407345],[-45.4156673,-15.2384468]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c72b8a9e-2ba4-5c4b-a1f4-63dea3286b78', 'NSA I P12 A', 27.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22169542, -45.443097699999996, '{"type":"Polygon","coordinates":[[[-45.4403301,-15.2199264],[-45.4437041,-15.226378],[-45.4464783,-15.2245557],[-45.4446459,-15.2176906],[-45.4403301,-15.2199264]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c0c45249-d9ae-5594-b0af-bf7c57d1e7ce', 'NSA I P12 T35', 11.21, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.251065783333333, -45.419426933333334, '{"type":"Polygon","coordinates":[[[-45.4202807,-15.2489633],[-45.4172659,-15.2508885],[-45.4183256,-15.2528021],[-45.4190576,-15.2531451],[-45.4213511,-15.2516324],[-45.4202807,-15.2489633]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('582310fb-5249-51a7-82f8-ba3f50423d96', 'NSA I P13', 59.3, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23539064, -45.446540819999996, '{"type":"Polygon","coordinates":[[[-45.4471135,-15.2310861],[-45.450418,-15.2367176],[-45.446222,-15.2427779],[-45.4418371,-15.2352855],[-45.4471135,-15.2310861]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('ff641d77-b56c-51c5-8817-1b2bdba0c60d', 'NSA I P13 - T32', 15.27, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.229748800000001, -45.42424912, '{"type":"Polygon","coordinates":[[[-45.4263639,-15.229637],[-45.425006,-15.2278458],[-45.4210961,-15.2298544],[-45.4224157,-15.2317698],[-45.4263639,-15.229637]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('019ce5b3-0999-501d-83dc-ccaa233dc31b', 'NSA I P13 T35', 12.14, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.247811100000002, -45.429996919999994, '{"type":"Polygon","coordinates":[[[-45.4305994,-15.2461567],[-45.4274344,-15.2478232],[-45.429486,-15.2502262],[-45.4318654,-15.2486927],[-45.4305994,-15.2461567]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('41169c83-b307-5397-b0a9-5ffed4044c0a', 'NSA I P14', 21, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.230771319999999, -45.441825019999996, '{"type":"Polygon","coordinates":[[[-45.4418084,-15.2280023],[-45.4449924,-15.2327089],[-45.441825,-15.2351826],[-45.4386909,-15.2299605],[-45.4418084,-15.2280023]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('74f49da2-72cc-5d4d-9cc8-959aeac47999', 'NSA I P14 - T32', 15.67, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.231867160000002, -45.420265660000005, '{"type":"Polygon","coordinates":[[[-45.4224157,-15.2317593],[-45.4210639,-15.2298555],[-45.417062,-15.2319455],[-45.418371,-15.2340162],[-45.4224157,-15.2317593]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f41f2cc5-8e04-5d5b-81a8-eb6cff1d4b69', 'NSA I P14 T35', 11.28, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.249692050000002, -45.42675033333333, '{"type":"Polygon","coordinates":[[[-45.4274022,-15.2478025],[-45.4244196,-15.2496036],[-45.4249989,-15.2506698],[-45.4267931,-15.2520581],[-45.429486,-15.2502158],[-45.4274022,-15.2478025]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('43387028-3f3e-5ad4-8d3a-d3a2233b5e05', 'NSA I P14A', 19.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.230315571428573, -45.445240971428575, '{"type":"Polygon","coordinates":[[[-45.445009,-15.2326992],[-45.4418084,-15.2279898],[-45.4446393,-15.2260957],[-45.4468519,-15.2305742],[-45.4465838,-15.2308652],[-45.4467854,-15.2312857],[-45.445009,-15.2326992]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e3522ea2-a72e-5831-a20e-991da662a4cd', 'NSA I P15', 29.3, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22443776, -45.44131314, '{"type":"Polygon","coordinates":[[[-45.4437078,-15.2263841],[-45.4415131,-15.2279989],[-45.4373092,-15.2214911],[-45.4403278,-15.2199306],[-45.4437078,-15.2263841]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e55dfd23-4cc1-5053-be46-d5b4fd0a47f5', 'NSA I P15 - T32', 17.01, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.234043, -45.41625952, '{"type":"Polygon","coordinates":[[[-45.4183602,-15.2340162],[-45.4170728,-15.2319248],[-45.4131353,-15.2340263],[-45.4143691,-15.2362315],[-45.4183602,-15.2340162]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('6a8d9b5c-5814-5242-8ac1-7588b6b9d0d4', 'NSA I P15 A', 31, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.224785700000002, -45.437829980000004, '{"type":"Polygon","coordinates":[[[-45.437305,-15.2214943],[-45.4344106,-15.2229702],[-45.4386592,-15.2299475],[-45.4414701,-15.2280222],[-45.437305,-15.2214943]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e04fbb20-af8e-5837-972f-b2cff4c632d0', 'NSA I P15 T35', 10.63, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25120525, -45.42444403333334, '{"type":"Polygon","coordinates":[[[-45.424441,-15.249645],[-45.4213965,-15.2516649],[-45.4245937,-15.2535073],[-45.4267931,-15.2520788],[-45.4249989,-15.2506905],[-45.424441,-15.249645]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('63bb6260-0c22-5f35-b987-e7688611b916', 'NSA I P16', 50.3, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24521606875, -45.44170254375, '{"type":"Polygon","coordinates":[[[-45.4378713,-15.2435233],[-45.4380876,-15.2433663],[-45.4379318,-15.2430767],[-45.4437046,-15.2386667],[-45.4461778,-15.242731],[-45.4445377,-15.2451464],[-45.4439682,-15.2451869],[-45.4432646,-15.2453953],[-45.4429466,-15.2458071],[-45.4427272,-15.2461239],[-45.4422428,-15.2473993],[-45.4420175,-15.2480769],[-45.4416943,-15.2482869],[-45.4412477,-15.2483771],[-45.4409497,-15.24877],[-45.4378713,-15.2435233]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('30fce903-dac4-5d6b-87d7-3eaecc4b155a', 'NSA I P16 - T32', 14.34, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.236187860000001, -45.41224266, '{"type":"Polygon","coordinates":[[[-45.4143584,-15.2362315],[-45.4131353,-15.2339953],[-45.4090476,-15.2360758],[-45.4103136,-15.2384052],[-45.4143584,-15.2362315]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c7b92ed0-39bf-5f7c-91b9-667426ea93dd', 'NSA I P16 T35', 9.3, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.252989200000002, -45.421771039999996, '{"type":"Polygon","coordinates":[[[-45.4213619,-15.2516738],[-45.4190576,-15.2531451],[-45.4224694,-15.254946],[-45.4246044,-15.2535073],[-45.4213619,-15.2516738]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('cc7a008d-5c24-5ed4-8055-27dfe72d3f74', 'NSA I P17', 45, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23994497142857, -45.43832105714286, '{"type":"Polygon","coordinates":[[[-45.4350552,-15.2387739],[-45.4411729,-15.2344925],[-45.4437033,-15.2386679],[-45.4379305,-15.2430819],[-45.4377824,-15.2428311],[-45.4375479,-15.2429936],[-45.4350552,-15.2387739]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('8a032e6f-46b2-5f97-b5fa-8910e6e3357b', 'NSA I P17 T35', 14.7, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25076794, -45.43182610000001, '{"type":"Polygon","coordinates":[[[-45.4318547,-15.2487445],[-45.4294753,-15.2502263],[-45.4321575,-15.2536109],[-45.4337883,-15.2525135],[-45.4318547,-15.2487445]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5a13b932-2211-5681-a49e-2175f807a421', 'NSA I P18', 23.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.234706160000002, -45.43533430000001, '{"type":"Polygon","coordinates":[[[-45.4353944,-15.2320892],[-45.4324761,-15.2340768],[-45.4351369,-15.2387558],[-45.4382697,-15.2365198],[-45.4353944,-15.2320892]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('37b1ae4f-9b00-57a8-8e97-e790d1569432', 'NSA I P18 A', 22.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.233334471428574, -45.43828442857143, '{"type":"Polygon","coordinates":[[[-45.4411732,-15.2344932],[-45.4381464,-15.2365381],[-45.4369655,-15.2344633],[-45.4353556,-15.2321814],[-45.4365179,-15.2312453],[-45.4386592,-15.2299268],[-45.4411732,-15.2344932]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('659a5093-8ee5-5185-ba89-3157c0d78cd0', 'NSA I P18 T35', 12.26, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.252199039999999, -45.429677, '{"type":"Polygon","coordinates":[[[-45.4295075,-15.2502573],[-45.4268038,-15.2520685],[-45.430398,-15.2547909],[-45.4321682,-15.2536212],[-45.4295075,-15.2502573]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('0b305f8d-9586-589f-aef1-2c635b400301', 'NSA I P19', 25, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.2276576, -45.43617008, '{"type":"Polygon","coordinates":[[[-45.4386377,-15.2299682],[-45.4367709,-15.2312518],[-45.4323721,-15.224109],[-45.434432,-15.2229908],[-45.4386377,-15.2299682]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('b9e068c9-1a9d-5f95-b189-cd37d0136bdd', 'NSA I P19 A', 26.6, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.229218699999999, -45.43356944, '{"type":"Polygon","coordinates":[[[-45.4344106,-15.2326597],[-45.4298615,-15.2253926],[-45.4323936,-15.224109],[-45.4367709,-15.2312725],[-45.4344106,-15.2326597]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('419a09c4-65f3-51df-875a-7af7d4f8d23d', 'NSA I P19 T35', 12.07, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.253670840000002, -45.42746042, '{"type":"Polygon","coordinates":[[[-45.4268038,-15.2520581],[-45.424583,-15.2535383],[-45.4287457,-15.2559088],[-45.4303658,-15.2547909],[-45.4268038,-15.2520581]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('8517365f-15c9-5511-9ee2-f05c2ec4f7d9', 'NSA I P20', 25, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22999552, -45.42870182, '{"type":"Polygon","coordinates":[[[-45.4278016,-15.2263245],[-45.4249964,-15.2278478],[-45.4304516,-15.2354339],[-45.4324579,-15.2340469],[-45.4278016,-15.2263245]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('7af275b3-6678-5850-9a38-a582c0b05c1f', 'NSA I P20 A', 26.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.230220839999998, -45.43181418, '{"type":"Polygon","coordinates":[[[-45.434432,-15.2326597],[-45.4325223,-15.2340676],[-45.4278231,-15.2263246],[-45.4298615,-15.2253926],[-45.434432,-15.2326597]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('95a8cb4f-6415-5664-a613-a55560f6e263', 'NSA I P20 T35', 12.37, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25498512, -45.425477259999994, '{"type":"Polygon","coordinates":[[[-45.4246044,-15.2534969],[-45.4225016,-15.2549563],[-45.4269945,-15.2570563],[-45.4286814,-15.2559192],[-45.4246044,-15.2534969]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('4a7cec8e-d790-5e61-84cb-583ca8b1b96d', 'NSA I P21', 57.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.249843604166669, -45.43695520833334, '{"type":"Polygon","coordinates":[[[-45.4374177,-15.2434508],[-45.4375644,-15.2437086],[-45.4378699,-15.2435221],[-45.4409466,-15.2487712],[-45.439447,-15.2502141],[-45.4393149,-15.2507054],[-45.4393862,-15.2510169],[-45.4392925,-15.2513207],[-45.4387984,-15.2515075],[-45.4383935,-15.2515062],[-45.438149,-15.2513101],[-45.4378334,-15.2511897],[-45.4374709,-15.2510004],[-45.437183,-15.2507393],[-45.436521,-15.250677],[-45.4359047,-15.2508383],[-45.4352171,-15.2511123],[-45.4347774,-15.2515074],[-45.4344505,-15.2519257],[-45.4342284,-15.2527796],[-45.4341907,-15.2535298],[-45.4337776,-15.2525133],[-45.4313725,-15.2479493],[-45.4374177,-15.2434508]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a92dcb3c-db28-5eba-99eb-fa81e6873859', 'NSA I P21 T35', 14.52, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.254525878571428, -45.43416527857143, '{"type":"Polygon","coordinates":[[[-45.4355478,-15.255329],[-45.4332411,-15.2569749],[-45.4303443,-15.2548115],[-45.4321575,-15.2535591],[-45.4337668,-15.2524721],[-45.4342687,-15.2535784],[-45.4343545,-15.2538967],[-45.4345208,-15.2540959],[-45.4345905,-15.254246],[-45.4347139,-15.2544116],[-45.434907,-15.2546652],[-45.435076,-15.2549059],[-45.4352772,-15.255087],[-45.4355478,-15.255329]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('fb077e2d-6ba3-55ec-a209-ccd45ba9b746', 'NSA I P22', 48.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.243201185714286, -45.435016399999995, '{"type":"Polygon","coordinates":[[[-45.4375479,-15.2429887],[-45.4372687,-15.243187],[-45.4374163,-15.2434515],[-45.4313747,-15.2479548],[-45.4289042,-15.243063],[-45.4350551,-15.2387746],[-45.4375479,-15.2429887]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5c4880ae-ac2c-56df-a488-2cb4c4d80bf1', 'NSA I P22 T35', 14.13, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25650374, -45.430310379999995, '{"type":"Polygon","coordinates":[[[-45.4303765,-15.2548115],[-45.4269773,-15.2571139],[-45.4306448,-15.2588173],[-45.4331768,-15.2569645],[-45.4303765,-15.2548115]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('da40e6d3-a3b8-5eef-8b20-1ce00da9bf4a', 'NSA I P23', 22.7, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23884688, -45.42922214, '{"type":"Polygon","coordinates":[[[-45.4293852,-15.2361058],[-45.4265099,-15.2381761],[-45.4289561,-15.2429792],[-45.4318743,-15.2408675],[-45.4293852,-15.2361058]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('887a84cc-a4ac-518c-94f1-d43fdba3c37e', 'NSA I P23 A', 23.79, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.23775076, -45.43276988, '{"type":"Polygon","coordinates":[[[-45.4350564,-15.238774],[-45.4319511,-15.2408695],[-45.4293061,-15.2362067],[-45.4324794,-15.2341296],[-45.4350564,-15.238774]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('174da410-64e9-5dcc-8534-0fc0bbe8c8a1', 'NSA I P23 T35', 15.02, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25745144, -45.43641108999999, '{"type":"Polygon","coordinates":[[[-45.4355693,-15.255329],[-45.4332304,-15.2569749],[-45.4367387,-15.2597489],[-45.4370841,-15.2596107],[-45.4380604,-15.2595797],[-45.4380604,-15.2589069],[-45.4371914,-15.2570852],[-45.4364635,-15.2561329],[-45.4361434,-15.2558172],[-45.4355693,-15.255329]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('066ff41e-408d-5223-8959-81953d18312e', 'NSA I P24 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.245292639999999, -45.412288059999995, '{"type":"Polygon","coordinates":[[[-45.4141105,-15.2453893],[-45.4108328,-15.2475873],[-45.4094658,-15.2449927],[-45.4129207,-15.2431046],[-45.4141105,-15.2453893]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('91b67e9c-faf0-5331-9070-5724385b5825', 'NSA I P24 T35', 13.33, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.260001306666668, -45.4351942, '{"type":"Polygon","coordinates":[[[-45.4367602,-15.2596868],[-45.4367065,-15.2597179],[-45.4332411,-15.2569438],[-45.4306662,-15.2587966],[-45.4346623,-15.2609002],[-45.4348286,-15.2609261],[-45.4349949,-15.2609002],[-45.435129,-15.2607863],[-45.4352094,-15.2606725],[-45.4353811,-15.2605172],[-45.4355849,-15.2603723],[-45.435821,-15.2601653],[-45.4359926,-15.26001],[-45.436175,-15.2599376],[-45.4367602,-15.2596868]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('0f99c379-94a3-591d-8197-32dbd02c3968', 'NSA I P24A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24332772, -45.41033172, '{"type":"Polygon","coordinates":[[[-45.4094494,-15.2450205],[-45.4081486,-15.2426511],[-45.411644,-15.2407237],[-45.4129672,-15.2432228],[-45.4094494,-15.2450205]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c341f72b-b0b2-501e-941c-de698bfe1bf8', 'NSA I P25 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.247935733333334, -45.40851703333333, '{"type":"Polygon","coordinates":[[[-45.408676,-15.2490694],[-45.4074719,-15.2498217],[-45.4060057,-15.247034],[-45.409451,-15.245057],[-45.4108216,-15.2475629],[-45.408676,-15.2490694]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('ff9fb06d-1878-5ab0-8be2-435a45ada84d', 'NSA I P25A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.245249860000001, -45.40683694, '{"type":"Polygon","coordinates":[[[-45.4059756,-15.24704],[-45.4046689,-15.2445112],[-45.408132,-15.2426293],[-45.4094326,-15.2450288],[-45.4059756,-15.24704]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('3ebaa97c-393d-5d0e-aa29-4a1eca0bff8a', 'NSA I P26 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.2405577, -45.40973006, '{"type":"Polygon","coordinates":[[[-45.411644,-15.2407444],[-45.4081347,-15.2426357],[-45.4069033,-15.2402591],[-45.4103243,-15.2384049],[-45.411644,-15.2407444]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('80be81eb-7e07-5647-aef7-f4f009018a8e', 'NSA I P26A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.238577639999999, -45.40771738000001, '{"type":"Polygon","coordinates":[[[-45.4068421,-15.240242],[-45.4055008,-15.2379829],[-45.4090561,-15.2360164],[-45.4103458,-15.2384049],[-45.4068421,-15.240242]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('b926a969-52e8-50ac-b0a6-6b4a56c87bd7', 'NSA I P27 - T34', 13.4, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24279646, -45.405562259999996, '{"type":"Polygon","coordinates":[[[-45.4046691,-15.2444817],[-45.4034448,-15.2420914],[-45.4069125,-15.2402823],[-45.4081158,-15.2426452],[-45.4046691,-15.2444817]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c04ea2a4-cb98-55fa-b9b4-002cfa805a9e', 'NSA I P27A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.239574600000001, -45.404698079999996, '{"type":"Polygon","coordinates":[[[-45.4054903,-15.2379207],[-45.4068813,-15.2402823],[-45.4034146,-15.2420912],[-45.4022139,-15.2396581],[-45.4054903,-15.2379207]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c17230db-b817-5b91-95d8-054270dfabc2', 'NSA I P28 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24956374, -45.40546870000001, '{"type":"Polygon","coordinates":[[[-45.4074327,-15.2498269],[-45.4040057,-15.2520186],[-45.4024993,-15.2490375],[-45.4059731,-15.2471088],[-45.4074327,-15.2498269]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('4863656a-7fc8-5e97-b675-6500430c3ecb', 'NSA I P28A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24719738, -45.4033839, '{"type":"Polygon","coordinates":[[[-45.4025205,-15.2490218],[-45.4012684,-15.2463366],[-45.4046535,-15.2445328],[-45.4059566,-15.2470739],[-45.4025205,-15.2490218]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5938d008-c907-598b-a12b-84eb1bf871e8', 'NSA I P29 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.251950099999998, -45.40124958, '{"type":"Polygon","coordinates":[[[-45.4004116,-15.253937],[-45.3989422,-15.2508063],[-45.4024817,-15.2490457],[-45.4040008,-15.2520245],[-45.4004116,-15.253937]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('0c612856-90dc-50c4-9182-b49f4a684f78', 'NSA I P29A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.249046340000001, -45.39987656, '{"type":"Polygon","coordinates":[[[-45.3989181,-15.2507831],[-45.3977461,-15.2482329],[-45.4012928,-15.2463612],[-45.4025077,-15.2490714],[-45.3989181,-15.2507831]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('0597198c-6e64-516b-817b-b2d7d246c7b5', 'NSA I P30 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24410488, -45.4018733, '{"type":"Polygon","coordinates":[[[-45.4000054,-15.2437939],[-45.4034193,-15.2420962],[-45.4046535,-15.2445328],[-45.4012829,-15.2463076],[-45.4000054,-15.2437939]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('112b688f-d4af-59d4-bca7-7df1350760a1', 'NSA I P30A - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.24215964, -45.40089354, '{"type":"Polygon","coordinates":[[[-45.4000058,-15.2438098],[-45.3987929,-15.2413624],[-45.4022292,-15.2397028],[-45.403434,-15.2421134],[-45.4000058,-15.2438098]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('163f77ad-22ff-5636-a964-15f38ec6a682', 'NSA I P31 - T34', 13.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.246449179999999, -45.39864152, '{"type":"Polygon","coordinates":[[[-45.3977422,-15.2482351],[-45.3964892,-15.2456134],[-45.3999852,-15.2438196],[-45.4012488,-15.2463427],[-45.3977422,-15.2482351]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f76fb8d4-7c18-55d6-8a2e-0bde313e92ab', 'NSA I P31A - T34', 13.4, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.243442340000001, -45.39717754, '{"type":"Polygon","coordinates":[[[-45.3953189,-15.2431924],[-45.3987625,-15.2413449],[-45.3999982,-15.243853],[-45.3964892,-15.245629],[-45.3953189,-15.2431924]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'NSA I P46', 50, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.248174600000002, -45.3960941, '{"type":"Polygon","coordinates":[[[-45.3953263,-15.243261],[-45.4004131,-15.2539254],[-45.397045,-15.2556756],[-45.3923598,-15.24475],[-45.3953263,-15.243261]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('728483d3-056d-5a2b-abe6-e654fef56623', 'NSA I P47', 50, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.253022683333333, -45.393788916666665, '{"type":"Polygon","coordinates":[[[-45.3936092,-15.25764],[-45.3895418,-15.2461686],[-45.3922883,-15.2447351],[-45.3970108,-15.2557111],[-45.3966742,-15.2562413],[-45.3936092,-15.25764]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('0cd40e14-5670-5ce9-bffa-f233602704f8', 'NSA I P50', 98.7, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.275733034146342, -45.40611205121951, '{"type":"Polygon","coordinates":[[[-45.406392,-15.2789296],[-45.4063171,-15.2786262],[-45.4061722,-15.2783301],[-45.4059602,-15.2779995],[-45.4060657,-15.2776077],[-45.4059958,-15.277296],[-45.4059733,-15.277006],[-45.4059492,-15.2767478],[-45.40591,-15.2763166],[-45.4058143,-15.2760742],[-45.4055811,-15.2758074],[-45.4053245,-15.2756015],[-45.4049676,-15.2753722],[-45.4046435,-15.2751011],[-45.4046226,-15.2749554],[-45.4045781,-15.2747473],[-45.4044646,-15.2745166],[-45.4044865,-15.274326],[-45.4045923,-15.274125],[-45.4047368,-15.2738471],[-45.4052316,-15.2732624],[-45.4049854,-15.2736403],[-45.4050093,-15.2734758],[-45.4050336,-15.2733941],[-45.405033,-15.2732548],[-45.4050323,-15.273115],[-45.4050317,-15.2730027],[-45.4050315,-15.2729464],[-45.4050306,-15.2727771],[-45.4050291,-15.2724647],[-45.4100928,-15.2659415],[-45.4165002,-15.2687626],[-45.4072237,-15.2795282],[-45.4083861,-15.2799213],[-45.4080043,-15.2799334],[-45.4077397,-15.2797075],[-45.4074956,-15.2794836],[-45.4070655,-15.2794123],[-45.4064743,-15.2794074],[-45.4062244,-15.2793604],[-45.406392,-15.2789296]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('618bdaf8-8c2b-5773-acd1-8e6c84a98a8d', 'NSA I P51', 144.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.27970904032258, -45.41512680161289, '{"type":"Polygon","coordinates":[[[-45.4197903,-15.2702904],[-45.420299,-15.270496],[-45.4205384,-15.2707291],[-45.420395,-15.2708107],[-45.4201389,-15.2709893],[-45.4198743,-15.2711525],[-45.4195754,-15.2715371],[-45.4194854,-15.2722935],[-45.4194665,-15.2731557],[-45.4195304,-15.2737313],[-45.4195124,-15.2740928],[-45.4194417,-15.2749975],[-45.4198029,-15.2760565],[-45.4197902,-15.2762663],[-45.4195969,-15.2769588],[-45.4193839,-15.2775067],[-45.4192894,-15.2777665],[-45.4191468,-15.2780059],[-45.4189245,-15.2783666],[-45.4188021,-15.2789969],[-45.4188063,-15.2795247],[-45.4191716,-15.2801545],[-45.4194425,-15.2804948],[-45.4195879,-15.2807573],[-45.4198061,-15.2809836],[-45.4200146,-15.2812229],[-45.4202745,-15.2815604],[-45.4202884,-15.2818428],[-45.4201393,-15.2821458],[-45.4180214,-15.2835988],[-45.4165515,-15.2846586],[-45.4144333,-15.2850033],[-45.4125848,-15.285255],[-45.4121997,-15.2853138],[-45.411989,-15.285313],[-45.4118174,-15.2851537],[-45.4116893,-15.284884],[-45.4115863,-15.2847156],[-45.4114549,-15.2844644],[-45.4113293,-15.2843024],[-45.4111046,-15.2841927],[-45.4107765,-15.2841533],[-45.4104002,-15.2841261],[-45.4096514,-15.2841028],[-45.4092475,-15.2840973],[-45.4090535,-15.2841017],[-45.4089345,-15.2840757],[-45.4089031,-15.2839588],[-45.4090063,-15.2836469],[-45.4091524,-15.283342],[-45.4092643,-15.283152],[-45.4093159,-15.2829683],[-45.4093739,-15.2827272],[-45.4093822,-15.2824123],[-45.409393,-15.2821849],[-45.4093487,-15.281787],[-45.4093463,-15.2812733],[-45.409344,-15.2808691],[-45.409263,-15.2807127],[-45.407331,-15.2795489],[-45.4165066,-15.2686876],[-45.4197903,-15.2702904]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'NSA I P52', 52.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.264488660000001, -45.387706539999996, '{"type":"Polygon","coordinates":[[[-45.3875408,-15.2674959],[-45.3815295,-15.2620224],[-45.3866259,-15.2605105],[-45.3952957,-15.2649186],[-45.3875408,-15.2674959]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('fe977165-da31-541d-a244-fd0ad4a614aa', 'NSA I P53', 67.7, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.269484576470589, -45.39661182941175, '{"type":"Polygon","coordinates":[[[-45.401353,-15.2680281],[-45.4005081,-15.268236],[-45.4001053,-15.2681401],[-45.3995149,-15.2682569],[-45.3985738,-15.2685275],[-45.3975529,-15.2688419],[-45.3963831,-15.2700596],[-45.3956326,-15.2718912],[-45.3947817,-15.2726956],[-45.3939121,-15.2724488],[-45.3934491,-15.2721461],[-45.3927623,-15.2718236],[-45.3923011,-15.2717909],[-45.3875384,-15.2674953],[-45.3953293,-15.2648879],[-45.4013504,-15.2679402],[-45.401353,-15.2680281]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('dc0e95e5-fb8d-5f67-bf9f-308ff3408661', 'NSA I P54', 64.2, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.266115059999999, -45.38242642, '{"type":"Polygon","coordinates":[[[-45.3875404,-15.2674953],[-45.3799767,-15.2697268],[-45.3754768,-15.2638367],[-45.3815978,-15.2620212],[-45.3875404,-15.2674953]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('589272f8-ada1-5f49-ab80-5b856f9403a0', 'NSA I P55', 55.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.273245725925923, -45.3876611074074, '{"type":"Polygon","coordinates":[[[-45.38002,-15.2696971],[-45.3875393,-15.2674958],[-45.3924599,-15.2719303],[-45.3913941,-15.2720805],[-45.3910174,-15.2724259],[-45.3907293,-15.2727946],[-45.3905323,-15.2732018],[-45.3903896,-15.2736601],[-45.3900561,-15.2739271],[-45.3897427,-15.2739933],[-45.3894837,-15.2739535],[-45.3891943,-15.2738039],[-45.3888409,-15.2737984],[-45.38866,-15.2737052],[-45.3884326,-15.2736604],[-45.388109,-15.2736481],[-45.3875849,-15.2737695],[-45.3871649,-15.2738979],[-45.3869058,-15.2739463],[-45.3865899,-15.2739914],[-45.3863154,-15.2740957],[-45.3860333,-15.2743077],[-45.3855199,-15.2747544],[-45.3851361,-15.2749131],[-45.38476,-15.275089],[-45.3842185,-15.2753965],[-45.38002,-15.2696971]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('d81e7825-1972-5815-b990-2ccc4f6b0087', 'NSA I P56', 37.4, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.26104938, -45.37586526, '{"type":"Polygon","coordinates":[[[-45.3755826,-15.2637987],[-45.3713026,-15.2581248],[-45.3761854,-15.2571547],[-45.3806731,-15.26237],[-45.3755826,-15.2637987]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('1384682d-bfec-551f-a2f4-54fa47a1cccc', 'NSA I P57', 38.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.255322279999998, -45.3725542, '{"type":"Polygon","coordinates":[[[-45.3760939,-15.2570667],[-45.3711807,-15.2580356],[-45.3668785,-15.2521764],[-45.372524,-15.252266],[-45.3760939,-15.2570667]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('8f15d2cd-f813-53f2-a88f-23f0fd0419b3', 'NSA I P58', 36.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25927624, -45.3823568, '{"type":"Polygon","coordinates":[[[-45.3864394,-15.2604541],[-45.380673,-15.262252],[-45.376277,-15.2570075],[-45.3819552,-15.2562135],[-45.3864394,-15.2604541]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2308bbcb-3135-54d5-ba0b-1f5cf2b66e33', 'NSA I P59', 34.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.25477608, -45.37815802, '{"type":"Polygon","coordinates":[[[-45.3820162,-15.2562435],[-45.3761549,-15.2570666],[-45.372524,-15.2521776],[-45.3780788,-15.2521492],[-45.3820162,-15.2562435]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('bdd03053-e620-56f0-98d2-ad231f743414', 'NSA I P71', 24.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.270020119999998, -45.378007159999996, '{"type":"Polygon","coordinates":[[[-45.38089,-15.2709494],[-45.3767755,-15.272389],[-45.3735944,-15.2686309],[-45.3778859,-15.2671819],[-45.38089,-15.2709494]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('4394bc72-e73a-5f36-a982-9b8499b95b4f', 'NSA I P71A', 25.5, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.26572544, -45.37469602, '{"type":"Polygon","coordinates":[[[-45.3754826,-15.263787],[-45.3779288,-15.2671819],[-45.3736448,-15.2686549],[-45.3709413,-15.2652164],[-45.3754826,-15.263787]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2b9f2446-54f2-50f7-ab29-6f0de7604cc4', 'NSA I P72', 24.8, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.27073406, -45.37313948, '{"type":"Polygon","coordinates":[[[-45.3736373,-15.2686309],[-45.3693458,-15.2699972],[-45.3724786,-15.2739715],[-45.3765984,-15.2724398],[-45.3736373,-15.2686309]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'NSA I P72A', 26.3, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.267107540000001, -45.37033486, '{"type":"Polygon","coordinates":[[[-45.3709667,-15.2652028],[-45.373623,-15.2686068],[-45.3693354,-15.2700208],[-45.3667825,-15.2665045],[-45.3709667,-15.2652028]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('97c6c959-11d2-5f33-ae94-b60834d59ec5', 'NSA I P73', 25.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.2732974, -45.36882752, '{"type":"Polygon","coordinates":[[[-45.3683381,-15.2754275],[-45.3655883,-15.2715205],[-45.3694168,-15.2701322],[-45.3724563,-15.2739793],[-45.3683381,-15.2754275]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('dc0a1f6a-4e10-567c-9a2c-8e4e33972224', 'NSA I P73A', 25.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.269180420000001, -45.36676618, '{"type":"Polygon","coordinates":[[[-45.3694506,-15.2701565],[-45.3655882,-15.2715319],[-45.3625708,-15.2675624],[-45.3667707,-15.2664948],[-45.3694506,-15.2701565]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('171a40cd-4f40-5662-a77c-c66f4c4805c9', 'NSA I P74', 26.6, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.274849380000001, -45.36448704, '{"type":"Polygon","coordinates":[[[-45.3637453,-15.2770351],[-45.3610202,-15.2731435],[-45.3655883,-15.2715718],[-45.3683361,-15.2754614],[-45.3637453,-15.2770351]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('7dc08e3c-dbce-5b02-a88a-3e45565d602b', 'NSA I P74A', 14.9, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.27089738, -45.361703039999995, '{"type":"Polygon","coordinates":[[[-45.3610762,-15.2731403],[-45.3581365,-15.269021],[-45.3626381,-15.2676307],[-45.3655882,-15.2715546],[-45.3610762,-15.2731403]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('96bb749b-0b00-595c-965a-6d952e0c2479', 'NSA I P75', 201.2, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.276631529545453, -45.37914597954546, '{"type":"Polygon","coordinates":[[[-45.3708156,-15.2875423],[-45.3637182,-15.2770772],[-45.3808176,-15.2709661],[-45.3842213,-15.2753988],[-45.3837647,-15.2756962],[-45.3834479,-15.2755555],[-45.3831946,-15.2754261],[-45.3829401,-15.2753312],[-45.3827937,-15.2752478],[-45.3826349,-15.2750494],[-45.3824205,-15.2749131],[-45.3821132,-15.2748106],[-45.3817085,-15.274759],[-45.3813145,-15.2747921],[-45.3810137,-15.274951],[-45.3806882,-15.2750226],[-45.3804922,-15.2750645],[-45.380263,-15.2750908],[-45.3799569,-15.2752429],[-45.3797696,-15.2753736],[-45.3796258,-15.275377],[-45.3794573,-15.2753071],[-45.379161,-15.2752387],[-45.3789349,-15.2751472],[-45.3786235,-15.2749148],[-45.3785022,-15.2748679],[-45.3783924,-15.2748388],[-45.3782428,-15.2748167],[-45.3780202,-15.2748548],[-45.3779009,-15.2748995],[-45.3777587,-15.2749736],[-45.3776112,-15.2750829],[-45.3775129,-15.2751327],[-45.3774238,-15.2752048],[-45.3773726,-15.2753147],[-45.3774251,-15.2800428],[-45.3774339,-15.2801308],[-45.3774773,-15.2801916],[-45.377587,-15.2802372],[-45.3787551,-15.2801043],[-45.3788456,-15.2801164],[-45.3788978,-15.2801564],[-45.3825566,-15.2839835],[-45.3708156,-15.2875423]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('68fafed8-cb61-5e4f-9ebb-283d037dbe48', 'NSA I P77', 23, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.2862697, -45.38139554, '{"type":"Polygon","coordinates":[[[-45.3844417,-15.286667],[-45.3785912,-15.288317],[-45.3769384,-15.2856296],[-45.3825647,-15.2840679],[-45.3844417,-15.286667]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('e72c32d7-23f2-56a2-a93c-ece1d38be598', 'NSA I P78', 22.95, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.287449683333334, -45.3745505, '{"type":"Polygon","coordinates":[[[-45.3769384,-15.2857538],[-45.3785912,-15.288317],[-45.3726854,-15.2899508],[-45.3710476,-15.2874717],[-45.371102,-15.287451],[-45.3769384,-15.2857538]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('c602b6e1-ea15-5353-a447-1bfef978eaf6', 'NSA I P79', 23.05, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.288926459999999, -45.38328964, '{"type":"Polygon","coordinates":[[[-45.3864398,-15.289375],[-45.3805561,-15.2908983],[-45.3785911,-15.2882974],[-45.3844214,-15.2866866],[-45.3864398,-15.289375]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('39dac463-c89c-544b-bf3d-567c0099bb26', 'NSA I P80', 23.03, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.290517500000002, -45.37739278, '{"type":"Polygon","coordinates":[[[-45.3805561,-15.2909175],[-45.3744951,-15.2924652],[-45.3727255,-15.2899702],[-45.3786311,-15.2883171],[-45.3805561,-15.2909175]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('b3ad10ab-b8ea-5f68-b6c4-1adbb3e4884b', 'NSA I P81', 23, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.29125814, -45.383601260000006, '{"type":"Polygon","coordinates":[[[-45.3806155,-15.290879],[-45.3864394,-15.2893944],[-45.3881612,-15.2917619],[-45.3821747,-15.2933764],[-45.3806155,-15.290879]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('7ffb308e-8a40-52dd-bb8c-43948c8c0e40', 'NSA I P82', 23.01, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.293010319999999, -45.37907964, '{"type":"Polygon","coordinates":[[[-45.3821943,-15.2933763],[-45.3760765,-15.2949547],[-45.3743967,-15.2924652],[-45.3805364,-15.2908791],[-45.3821943,-15.2933763]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('964b1588-9764-5c3b-abec-46c6b05215c4', 'NSA I P83', 23.02, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.29440078, -45.385700199999995, '{"type":"Polygon","coordinates":[[[-45.3840757,-15.2960752],[-45.3822334,-15.2933953],[-45.3881399,-15.2918192],[-45.3899763,-15.294639],[-45.3840757,-15.2960752]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a23e7795-0cc2-5f57-b3ec-620cf1a07f58', 'NSA I P84', 23, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.295625320000003, -45.380853439999996, '{"type":"Polygon","coordinates":[[[-45.3840369,-15.2960752],[-45.377903,-15.2976075],[-45.3760962,-15.2949734],[-45.3821942,-15.2933953],[-45.3840369,-15.2960752]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('809198b2-44ec-580f-b387-bf1cc21c6e6f', 'NSA I P85', 29.97, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.288515181818182, -45.38710159090909, '{"type":"Polygon","coordinates":[[[-45.3825174,-15.2840387],[-45.3864657,-15.2893996],[-45.3901135,-15.294719],[-45.3902851,-15.2929804],[-45.3898989,-15.2921524],[-45.3904997,-15.2913245],[-45.3907143,-15.2880542],[-45.3865086,-15.2866881],[-45.3848778,-15.285115],[-45.3837191,-15.2851564],[-45.3825174,-15.2840387]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('3b64f735-e203-5b64-b065-039c861051ec', 'NSA I P86', 80.1, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.298887152173917, -45.38674049565217, '{"type":"Polygon","coordinates":[[[-45.3792758,-15.2997175],[-45.3779609,-15.2975891],[-45.3824191,-15.2964826],[-45.3853644,-15.2957966],[-45.3890878,-15.2948823],[-45.3900156,-15.294639],[-45.3910304,-15.2954263],[-45.391803,-15.2958545],[-45.3950508,-15.2978139],[-45.3949028,-15.3030959],[-45.3913267,-15.3032465],[-45.3904673,-15.3022946],[-45.389375,-15.3019137],[-45.3892563,-15.3004251],[-45.3887706,-15.2994908],[-45.3877448,-15.2991983],[-45.3871416,-15.2990761],[-45.3865897,-15.3002463],[-45.3850014,-15.2996808],[-45.3819375,-15.2990606],[-45.3810187,-15.2990346],[-45.3802154,-15.2997219],[-45.3792758,-15.2997175]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('7b727675-38c3-59cf-b5e8-8f82fc276ae7', 'NSA I PItalia', 41.6, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.287467604347823, -45.4209945347826, '{"type":"Polygon","coordinates":[[[-45.4201406,-15.2821454],[-45.4248918,-15.2875796],[-45.4248836,-15.2878072],[-45.424758,-15.2879823],[-45.4218693,-15.288771],[-45.4218654,-15.2889174],[-45.4231807,-15.2918205],[-45.423172,-15.292194],[-45.4229283,-15.2923564],[-45.4199606,-15.293742],[-45.417902,-15.292238],[-45.4204193,-15.2894572],[-45.4207316,-15.2887118],[-45.4207961,-15.2879187],[-45.4205913,-15.2871156],[-45.4200998,-15.286375],[-45.4198471,-15.2858212],[-45.4194845,-15.2850677],[-45.4190162,-15.2842641],[-45.4180202,-15.2836001],[-45.4201484,-15.2821329],[-45.4180269,-15.2835914],[-45.4201406,-15.2821454]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('1b05b7d1-9790-5cfb-9793-97e7498f7eb6', 'NSA II P13 - T27', 16.96, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22057384, -45.385849719999996, '{"type":"Polygon","coordinates":[[[-45.3882873,-15.2205904],[-45.3836954,-15.2229094],[-45.3822792,-15.2205904],[-45.3866994,-15.2181886],[-45.3882873,-15.2205904]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2835d0ab-6c34-57c1-b212-2c63a1302923', 'NSA II P14 - T27', 17.12, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.222930080000001, -45.38118148, '{"type":"Polygon","coordinates":[[[-45.3836234,-15.2229094],[-45.3789241,-15.2252904],[-45.377465,-15.2228887],[-45.3822715,-15.2206525],[-45.3836234,-15.2229094]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2399b67b-0f1f-588e-b0ce-f2484cdc7a88', 'NSA II P15B - T27', 18.96, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.22090096, -45.37867864, '{"type":"Polygon","coordinates":[[[-45.3773826,-15.2228058],[-45.3759235,-15.2204041],[-45.3805583,-15.2178366],[-45.3821462,-15.2206525],[-45.3773826,-15.2228058]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('a35f5c1c-cd08-56d9-827a-a9d89a45fc9b', 'NSA II P16A - T27', 19.07, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21853232, -45.383442200000005, '{"type":"Polygon","coordinates":[[[-45.3823178,-15.2206525],[-45.3806871,-15.2178781],[-45.3851073,-15.2154762],[-45.386781,-15.2180023],[-45.3823178,-15.2206525]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5f63ba4c-fd3f-5720-b1f2-8ed9deffa08a', 'NSA II P17A - T27', 17.81, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21834422, -45.3771796, '{"type":"Polygon","coordinates":[[[-45.3759235,-15.2203213],[-45.3743356,-15.2177952],[-45.3791421,-15.2154762],[-45.3805733,-15.2178071],[-45.3759235,-15.2203213]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('aba8a5a1-79ba-5b96-8c63-f464ca47a744', 'NSA II P18B - T27', 16.89, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21586546, -45.38181999999999, '{"type":"Polygon","coordinates":[[[-45.3806441,-15.2177952],[-45.3792279,-15.2154348],[-45.3834766,-15.2129501],[-45.3851073,-15.215352],[-45.3806441,-15.2177952]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('21986dd2-b9a9-559b-8926-c9862dc2d9c7', 'NSA II P19B - T27', 18.81, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.215742180000001, -45.3755639, '{"type":"Polygon","coordinates":[[[-45.3742498,-15.2177124],[-45.3727048,-15.2152278],[-45.3774798,-15.2126476],[-45.3791353,-15.2154107],[-45.3742498,-15.2177124]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('5da3d814-2faa-5a8b-a60c-04d9e3b239b0', 'NSA II P20B - T27', 18.23, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21328972, -45.38027506, '{"type":"Polygon","coordinates":[[[-45.3791421,-15.215352],[-45.3775542,-15.2126603],[-45.3820174,-15.2102998],[-45.3835195,-15.2127845],[-45.3791421,-15.215352]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('91f4c970-8273-5d8f-a9e0-db514379542d', 'NSA II P21B - T27', 17.7, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.210391099999999, -45.38438834, '{"type":"Polygon","coordinates":[[[-45.3820366,-15.2103083],[-45.3836244,-15.2128344],[-45.3879589,-15.2105567],[-45.3862852,-15.2079478],[-45.3820366,-15.2103083]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('cbe5d36d-b142-58b5-9f35-5c4710a22f3d', 'NSA II P22B - T27', 18.09, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.208061820000001, -45.38879042000001, '{"type":"Polygon","coordinates":[[[-45.386473,-15.2079293],[-45.3878463,-15.2105383],[-45.3923095,-15.2083434],[-45.3908503,-15.2055688],[-45.386473,-15.2079293]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('b1f3e9df-28f2-5150-a45b-67ae44e7baec', 'NSA II P23B - T27', 17.22, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.212989860000002, -45.38592364, '{"type":"Polygon","coordinates":[[[-45.3835547,-15.2128988],[-45.3852284,-15.2153834],[-45.3893912,-15.2131886],[-45.3878892,-15.2105797],[-45.3835547,-15.2128988]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('2d9b6610-bfd6-5c52-85ef-3da42c0b158b', 'NSA II P24B - T27', 16.95, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21069564, -45.390292439999996, '{"type":"Polygon","coordinates":[[[-45.387975,-15.2106211],[-45.38952,-15.2131058],[-45.3936827,-15.2108696],[-45.3923095,-15.2082606],[-45.387975,-15.2106211]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('ac4b3fe9-789b-508f-bb41-8b356bc398cd', 'NSA II P25B - T27', 17.19, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21560706, -45.3875201, '{"type":"Polygon","coordinates":[[[-45.3852284,-15.2155077],[-45.3867305,-15.2179509],[-45.3909791,-15.2159218],[-45.3894341,-15.2131472],[-45.3852284,-15.2155077]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('f927ffcb-498e-5e2b-b452-8c4271b683f8', 'NSA II P26B - T27', 18.59, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21344536, -45.391837380000005, '{"type":"Polygon","coordinates":[[[-45.389477,-15.21323],[-45.3910649,-15.2158804],[-45.3953994,-15.213934],[-45.3937686,-15.2109524],[-45.389477,-15.21323]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('70a1028c-b732-5d9e-b276-672a46b62867', 'NSA II P27B - T27', 16.18, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.218199340000002, -45.389065040000006, '{"type":"Polygon","coordinates":[[[-45.3868592,-15.2179923],[-45.3883183,-15.2205597],[-45.3923953,-15.2185306],[-45.3908932,-15.2159218],[-45.3868592,-15.2179923]]]}'::jsonb, true)
  on conflict (id) do nothing;
insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)
  values ('54c16c6f-dc05-566f-8749-6e7bb371f2e6', 'NSA II P28B - T27', 16.87, 'b5e60933-490d-5a0f-82d8-ee118e9eaa71', -15.21612826, -45.3932761, '{"type":"Polygon","coordinates":[[[-45.3908986,-15.2159419],[-45.3924221,-15.2184887],[-45.3967994,-15.216356],[-45.3953618,-15.2139128],[-45.3908986,-15.2159419]]]}'::jsonb, true)
  on conflict (id) do nothing;

-- Water tanks (4) --------------------------------------
insert into water_tanks (id, name, lat, lng) values ('12369780-11a9-518f-a78c-01a0b2268bc7', 'Caixa d''agua 1', -15.21983564978106, -45.45121482402494) on conflict (id) do nothing;
insert into water_tanks (id, name, lat, lng) values ('f2e5a8cb-f3ed-5a1e-aaf9-ea8fba0e5271', 'Caixa d''agua 2', -15.25730567660034, -45.39460637560483) on conflict (id) do nothing;
insert into water_tanks (id, name, lat, lng) values ('cdf9e6c1-510c-5a06-9eb8-fffee98c96bc', 'Caixa d''agua 3', -15.24661165927414, -45.35299071762665) on conflict (id) do nothing;
insert into water_tanks (id, name, lat, lng) values ('6ff320f5-e585-514b-9d2e-71c0c04a3380', 'Caixa d''agua 4', -15.20317266998652, -45.34811573754892) on conflict (id) do nothing;

-- Farm boundaries (1) ----------------------------
insert into farm_boundaries (id, name, geometry) values ('53b0e61f-96f8-5a53-bacc-172fbfc7aa79', 'NSA2', '{"type":"Polygon","coordinates":[[[-45.38659,-15.19776],[-45.37614,-15.17871],[-45.3477,-15.20306],[-45.35552,-15.21436],[-45.38659,-15.19776]]]}'::jsonb) on conflict (id) do nothing;

-- Herd (59) ----------------------------------------------
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53d0b18d-1263-5245-b083-5ab077458e1a', 'bb7a53bf-69b5-5b4b-ae96-82323873a0b0', 'NOVILHA', 61, 198) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8061cb4b-9ace-5730-8c06-51801d6ee90d', 'd2a4d592-19e7-5570-8e24-b55b2513ff0c', 'GARROTE', 110, 375) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9d79cdbf-3e03-5149-9c88-3174ca88666b', '691cba5d-8854-5010-a21b-632612b614e1', 'GARROTE', 61, 330) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9e1e0152-41cd-504b-af23-ec88b2c7c64b', '2be70ed2-997e-5028-a24a-e77875f38b58', 'GARROTE', 77, 206) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b2e69288-58cb-5715-868d-29e2e7b23c10', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'VACA PARIDA', 73, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('788c9431-8582-50d6-b90c-f12822267a0c', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'BEZERRO MAMANDO', 37, 95) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8acca327-d759-500a-b160-6d886e069c87', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'BEZERRA MAMANDO', 27, 90) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('cdc027d4-55d7-54ad-9e26-12e3007fa55b', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'VACA PARIDA', 5, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('4f07ab15-82dc-5e17-8bbd-149c0696fecb', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'BEZERRA MAMANDO', 4, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('88783b87-65f8-509f-b6dd-dc1e11c38cf9', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'BEZERRO MAMANDO', 1, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('1372d76c-f13b-51bc-9c79-5570743acc53', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'BEZERRA MAMANDO', 13, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8b2ec0b9-ae8d-5090-8ac1-23d5054923e3', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'VACA PARIDA', 11, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5d9b47ab-b39b-548a-814f-f2c79a5256c5', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'BEZERRO MAMANDO', 4, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0863ac3b-93e4-5432-9205-be9b62957850', '582310fb-5249-51a7-82f8-ba3f50423d96', 'GARROTE', 90, 288) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('3b6486c3-801a-5817-b088-58efe19f26b7', '41169c83-b307-5397-b0a9-5ffed4044c0a', 'GARROTE', 71, 300) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('307a5c8b-3487-5644-bca0-226afce122d6', '74f49da2-72cc-5d4d-9cc8-959aeac47999', 'GARROTE', 74, 180) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('3295128b-720c-50fc-bbde-0cf0c2c2a116', '43387028-3f3e-5ad4-8d3a-d3a2233b5e05', 'GARROTE', 102, 254) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('1f6f4116-4693-5f7d-a5c4-55d2160a90ed', 'e3522ea2-a72e-5831-a20e-991da662a4cd', 'GARROTE', 90, 273) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('ec672d8e-c8b1-51e5-8726-f1cfa587c20c', 'e55dfd23-4cc1-5053-be46-d5b4fd0a47f5', 'GARROTE', 107, 338) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0464c274-6d1a-5041-9842-b62e7cddef02', '6a8d9b5c-5814-5242-8ac1-7588b6b9d0d4', 'GARROTE', 93, 216) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53099340-4881-5b16-a94a-3e19b1d340fd', '63bb6260-0c22-5f35-b987-e7688611b916', 'NOVILHA', 89, 319) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bc36b4d8-e186-5666-8323-c300aaa3ce9c', 'cc7a008d-5c24-5ed4-8055-27dfe72d3f74', 'NOVILHA', 84, 254) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53ff0d2c-c39a-5fc6-b4b9-7a9026edc963', '5a13b932-2211-5681-a49e-2175f807a421', 'VACA SOLTEIRA', 23, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5adf7122-1314-5f1d-9460-40baec179973', 'ff9fb06d-1878-5ab0-8be2-435a45ada84d', 'GARROTE', 103, 350) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('7b4d04b6-600e-50e3-ba9e-d25b1ca071ec', 'c17230db-b817-5b91-95d8-054270dfabc2', 'GARROTE', 108, 375) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('07203519-9524-5c94-a796-48c322f56cd3', '112b688f-d4af-59d4-bca7-7df1350760a1', 'GARROTE', 87, 337) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('54b10b8d-ba4d-5920-8bf4-b3a8481fbd72', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'BEZERRO MAMANDO', 7, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('6b6b4b43-79e7-5e15-831b-ad8daf66e438', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'VACA PARIDA', 5, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('21b70d70-525c-523d-b1bb-0f4dbc7d9126', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'BEZERRA MAMANDO', 2, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('2a3e92fb-641e-5da7-b5bb-aa688c49b725', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'VACA PARIDA', 83, 470) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('43fbe01c-9585-5905-985b-d57247be4a36', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'BEZERRA MAMANDO', 54, 71) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('79748f63-07fd-5864-923c-c518179459f8', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'BEZERRO MAMANDO', 24, 80) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('314d54b9-2ab5-53c6-a61a-8af66d3b19d0', 'dc0e95e5-fb8d-5f67-bf9f-308ff3408661', 'NOVILHA', 45, 312) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9c719ae0-d21e-51f5-b586-02ecb89b3016', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'VACA PRENHA', 103, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('aea86e27-0eeb-5d52-92a6-10c02fc59cbd', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'BEZERRO MAMANDO', 45, 118) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('572d8bff-80bd-5a94-b2d2-cbd8b181902d', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'BEZERRA MAMANDO', 37, 114) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('2b01c65c-f20a-54ae-8be8-2384c3992091', 'bdd03053-e620-56f0-98d2-ad231f743414', 'VACA PRENHA', 98, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b446e852-91df-5619-9b62-98fa727235b8', 'bdd03053-e620-56f0-98d2-ad231f743414', 'BEZERRA MAMANDO', 34, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0c9eba90-8d02-5b10-855f-b8cd87b55911', 'bdd03053-e620-56f0-98d2-ad231f743414', 'BEZERRO MAMANDO', 28, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('70054765-e29e-5b19-bdfa-28c5b8e8f072', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'VACA PRENHA', 93, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('ed65f8fe-8a1b-5862-a059-b76783829a21', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'BEZERRA MAMANDO', 48, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('37a9ee68-c0fe-59e9-a9d6-bb4ef6f6241b', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'BEZERRO MAMANDO', 44, 100) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('fc28269e-3aec-530a-9d40-e7bfc234d750', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'VACA PRENHA', 138, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b8570c30-b1c1-5eb0-a9e3-64defe4c12e5', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'BEZERRO MAMANDO', 68, 120) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8d3bb00e-88a4-5ae1-adbc-901b82cacf9c', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'BEZERRA MAMANDO', 50, 130) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9008c221-7749-55a0-881b-edec9d3e8a6b', '96bb749b-0b00-595c-965a-6d952e0c2479', 'VACA PARIDA', 111, 420) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('57d39695-bff4-5976-ad4e-e29a9dec725e', '96bb749b-0b00-595c-965a-6d952e0c2479', 'BEZERRO MAMANDO', 109, 140) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9541f2b4-6b41-5122-acae-5893467da7bc', '96bb749b-0b00-595c-965a-6d952e0c2479', 'BEZERRA MAMANDO', 80, 130) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('f26cfa56-4292-5dd5-8d79-313153afcecf', 'b3ad10ab-b8ea-5f68-b6c4-1adbb3e4884b', 'NOVILHA', 136, 279) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8746f234-09e5-5e13-a39f-c81764fa2142', '7ffb308e-8a40-52dd-bb8c-43948c8c0e40', 'NOVILHA', 115, 201) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9c0a4dc2-0d21-525e-a382-f533631164e0', '3b64f735-e203-5b64-b065-039c861051ec', 'VACA PARIDA', 149, 450) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5d290c06-d556-52fb-850c-d560d15a1fcd', '3b64f735-e203-5b64-b065-039c861051ec', 'BEZERRO MAMANDO', 79, 120) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('fb313551-7b33-5d52-8168-bb9c8701432e', '3b64f735-e203-5b64-b065-039c861051ec', 'BEZERRA MAMANDO', 75, 115) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bd1a0a38-b3fe-56ce-94f5-7958ccd3cccb', '1b05b7d1-9790-5cfb-9793-97e7498f7eb6', 'NOVILHA', 129, 312) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8b574f95-386d-5658-9b48-165d49648392', 'aba8a5a1-79ba-5b96-8c63-f464ca47a744', 'GARROTE', 110, 349) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bdb22a0d-be76-52c9-a1ad-85e2d39ff61f', '21986dd2-b9a9-559b-8926-c9862dc2d9c7', 'GARROTE', 99, 387) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('12b8de7a-1667-529a-a23d-e62e11397b00', '91f4c970-8273-5d8f-a9e0-db514379542d', 'GARROTE', 110, 350) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('25f91896-be1c-5257-a6b5-e9705a9ecdbb', 'f927ffcb-498e-5e2b-b452-8c4271b683f8', 'GARROTE', 71, 221) on conflict (id) do nothing;
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('029b9c6e-0f08-59e2-b0af-8ac2ed8a3499', '54c16c6f-dc05-566f-8749-6e7bb371f2e6', 'GARROTE', 71, 375) on conflict (id) do nothing;

-- Inventory central (5) ---------------------------
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('ab233bdc-6d7f-5040-b919-0dd8b5bccfc9', '9d04102a-7694-56f0-b59f-1db52c50a81d', 400, 10, 'central') on conflict (id) do nothing;
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('072a9f79-1649-5103-b1b0-1872c6ea4b1c', '6817a2fe-26cc-502a-a235-7d976b4cd7ae', 734, 10, 'central') on conflict (id) do nothing;
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('8aec4d6c-b0a9-5997-9326-45f557c36101', '44f4b28e-d039-5d7f-aa72-c695ab0f06fb', 0, 5, 'central') on conflict (id) do nothing;
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('fd71e6be-8aa6-5e02-a6d6-22784148ff37', 'c8f7e250-be2b-579b-ad99-cff3e906afa8', 0, 5, 'central') on conflict (id) do nothing;
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('2a8f8246-53cf-5979-8ee6-2270282c90d9', 'd0ee0fe4-c08d-5092-affc-d49e71939144', 0, 5, 'central') on conflict (id) do nothing;

-- Bombonas: criadas conforme peão fizer reabastecimento no app.

