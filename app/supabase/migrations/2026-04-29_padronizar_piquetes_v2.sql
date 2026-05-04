-- Migration: padronizar nomenclatura piquetes Txx - Pxx + adicionar T12
-- Gerado 2026-04-29. Aplica sobre Supabase. Devices puxam via sync (paddocks em MUTABLE_TABLES).
-- Backup recomendado: SELECT id, name FROM paddocks; (~125 linhas)
begin;

-- =================================================================
-- Parte 1: Renomes (125 paddocks)
-- =================================================================

-- T27 (renumerados pela planilha) (16)
UPDATE paddocks SET name = 'T27 - P01' WHERE name = 'NSA II P28B - T27';
UPDATE paddocks SET name = 'T27 - P02' WHERE name = 'NSA II P27B - T27';
UPDATE paddocks SET name = 'T27 - P03' WHERE name = 'NSA II P13 - T27';
UPDATE paddocks SET name = 'T27 - P04' WHERE name = 'NSA II P14 - T27';
UPDATE paddocks SET name = 'T27 - P05' WHERE name = 'NSA II P15B - T27';
UPDATE paddocks SET name = 'T27 - P06' WHERE name = 'NSA II P16A - T27';
UPDATE paddocks SET name = 'T27 - P07' WHERE name = 'NSA II P25B - T27';
UPDATE paddocks SET name = 'T27 - P08' WHERE name = 'NSA II P26B - T27';
UPDATE paddocks SET name = 'T27 - P09' WHERE name = 'NSA II P24B - T27';
UPDATE paddocks SET name = 'T27 - P10' WHERE name = 'NSA II P23B - T27';
UPDATE paddocks SET name = 'T27 - P11' WHERE name = 'NSA II P18B - T27';
UPDATE paddocks SET name = 'T27 - P12' WHERE name = 'NSA II P17A - T27';
UPDATE paddocks SET name = 'T27 - P13' WHERE name = 'NSA II P22B - T27';
UPDATE paddocks SET name = 'T27 - P14' WHERE name = 'NSA II P21B - T27';
UPDATE paddocks SET name = 'T27 - P15' WHERE name = 'NSA II P20B - T27';
UPDATE paddocks SET name = 'T27 - P16' WHERE name = 'NSA II P19B - T27';

-- T34 (renumerados pela planilha) (16)
UPDATE paddocks SET name = 'T34 - P01' WHERE name = 'NSA I P24 - T34';
UPDATE paddocks SET name = 'T34 - P02' WHERE name = 'NSA I P25 - T34';
UPDATE paddocks SET name = 'T34 - P03' WHERE name = 'NSA I P28 - T34';
UPDATE paddocks SET name = 'T34 - P04' WHERE name = 'NSA I P29 - T34';
UPDATE paddocks SET name = 'T34 - P05' WHERE name = 'NSA I P29A - T34';
UPDATE paddocks SET name = 'T34 - P06' WHERE name = 'NSA I P28A - T34';
UPDATE paddocks SET name = 'T34 - P07' WHERE name = 'NSA I P25A - T34';
UPDATE paddocks SET name = 'T34 - P08' WHERE name = 'NSA I P24A - T34';
UPDATE paddocks SET name = 'T34 - P09' WHERE name = 'NSA I P26 - T34';
UPDATE paddocks SET name = 'T34 - P10' WHERE name = 'NSA I P27 - T34';
UPDATE paddocks SET name = 'T34 - P11' WHERE name = 'NSA I P30 - T34';
UPDATE paddocks SET name = 'T34 - P12' WHERE name = 'NSA I P31 - T34';
UPDATE paddocks SET name = 'T34 - P13' WHERE name = 'NSA I P26A - T34';
UPDATE paddocks SET name = 'T34 - P14' WHERE name = 'NSA I P27A - T34';
UPDATE paddocks SET name = 'T34 - P15' WHERE name = 'NSA I P30A - T34';
UPDATE paddocks SET name = 'T34 - P16' WHERE name = 'NSA I P31A - T34';

-- T32 (sequencial, P08 ficou como sem-talhao) (15)
UPDATE paddocks SET name = 'T32 - P01' WHERE name = 'NSA I P01 - T32';
UPDATE paddocks SET name = 'T32 - P02' WHERE name = 'NSA I P02 - T32';
UPDATE paddocks SET name = 'T32 - P03' WHERE name = 'NSA I P03 - T32';
UPDATE paddocks SET name = 'T32 - P04' WHERE name = 'NSA I P04 - T32';
UPDATE paddocks SET name = 'T32 - P05' WHERE name = 'NSA I P05 T32';
UPDATE paddocks SET name = 'T32 - P06' WHERE name = 'NSA I P06 - T32';
UPDATE paddocks SET name = 'T32 - P07' WHERE name = 'NSA I P07 - T32';
UPDATE paddocks SET name = 'T32 - P09' WHERE name = 'NSA I P09 - T32';
UPDATE paddocks SET name = 'T32 - P10' WHERE name = 'NSA I P10 - T32';
UPDATE paddocks SET name = 'T32 - P11' WHERE name = 'NSA I P11 - T32';
UPDATE paddocks SET name = 'T32 - P12' WHERE name = 'NSA I P12 - T32';
UPDATE paddocks SET name = 'T32 - P13' WHERE name = 'NSA I P13 - T32';
UPDATE paddocks SET name = 'T32 - P14' WHERE name = 'NSA I P14 - T32';
UPDATE paddocks SET name = 'T32 - P15' WHERE name = 'NSA I P15 - T32';
UPDATE paddocks SET name = 'T32 - P16' WHERE name = 'NSA I P16 - T32';

-- T35 (sequencial) (24)
UPDATE paddocks SET name = 'T35 - P01' WHERE name = 'NSA I P01 T35';
UPDATE paddocks SET name = 'T35 - P02' WHERE name = 'NSA I P02 T35';
UPDATE paddocks SET name = 'T35 - P03' WHERE name = 'NSA I P03 T35';
UPDATE paddocks SET name = 'T35 - P04' WHERE name = 'NSA I P04 T35';
UPDATE paddocks SET name = 'T35 - P05' WHERE name = 'NSA I P05 T35';
UPDATE paddocks SET name = 'T35 - P06' WHERE name = 'NSA I P06 T35';
UPDATE paddocks SET name = 'T35 - P07' WHERE name = 'NSA I P07 T35';
UPDATE paddocks SET name = 'T35 - P08' WHERE name = 'NSA I P08 T35';
UPDATE paddocks SET name = 'T35 - P09' WHERE name = 'NSA I P09 T35';
UPDATE paddocks SET name = 'T35 - P10' WHERE name = 'NSA I P10 T35';
UPDATE paddocks SET name = 'T35 - P11' WHERE name = 'NSA I P11 T35';
UPDATE paddocks SET name = 'T35 - P12' WHERE name = 'NSA I P12 T35';
UPDATE paddocks SET name = 'T35 - P13' WHERE name = 'NSA I P13 T35';
UPDATE paddocks SET name = 'T35 - P14' WHERE name = 'NSA I P14 T35';
UPDATE paddocks SET name = 'T35 - P15' WHERE name = 'NSA I P15 T35';
UPDATE paddocks SET name = 'T35 - P16' WHERE name = 'NSA I P16 T35';
UPDATE paddocks SET name = 'T35 - P17' WHERE name = 'NSA I P17 T35';
UPDATE paddocks SET name = 'T35 - P18' WHERE name = 'NSA I P18 T35';
UPDATE paddocks SET name = 'T35 - P19' WHERE name = 'NSA I P19 T35';
UPDATE paddocks SET name = 'T35 - P20' WHERE name = 'NSA I P20 T35';
UPDATE paddocks SET name = 'T35 - P21' WHERE name = 'NSA I P21 T35';
UPDATE paddocks SET name = 'T35 - P22' WHERE name = 'NSA I P22 T35';
UPDATE paddocks SET name = 'T35 - P23' WHERE name = 'NSA I P23 T35';
UPDATE paddocks SET name = 'T35 - P24' WHERE name = 'NSA I P24 T35';

-- Sem talhao (strip prefixo NSA I, normaliza espacamento) (54)
UPDATE paddocks SET name = 'P08' WHERE name = 'NSA I P08 - P32';
UPDATE paddocks SET name = 'P11' WHERE name = 'NSA I P11';
UPDATE paddocks SET name = 'P11A' WHERE name = 'NSA I P11A';
UPDATE paddocks SET name = 'P12' WHERE name = 'NSA I P12';
UPDATE paddocks SET name = 'P12A' WHERE name = 'NSA I P12 A';
UPDATE paddocks SET name = 'P13' WHERE name = 'NSA I P13';
UPDATE paddocks SET name = 'P14' WHERE name = 'NSA I P14';
UPDATE paddocks SET name = 'P14A' WHERE name = 'NSA I P14A';
UPDATE paddocks SET name = 'P15' WHERE name = 'NSA I P15';
UPDATE paddocks SET name = 'P15A' WHERE name = 'NSA I P15 A';
UPDATE paddocks SET name = 'P16' WHERE name = 'NSA I P16';
UPDATE paddocks SET name = 'P17' WHERE name = 'NSA I P17';
UPDATE paddocks SET name = 'P18' WHERE name = 'NSA I P18';
UPDATE paddocks SET name = 'P18A' WHERE name = 'NSA I P18 A';
UPDATE paddocks SET name = 'P19' WHERE name = 'NSA I P19';
UPDATE paddocks SET name = 'P19A' WHERE name = 'NSA I P19 A';
UPDATE paddocks SET name = 'P20' WHERE name = 'NSA I P20';
UPDATE paddocks SET name = 'P20A' WHERE name = 'NSA I P20 A';
UPDATE paddocks SET name = 'P21' WHERE name = 'NSA I P21';
UPDATE paddocks SET name = 'P22' WHERE name = 'NSA I P22';
UPDATE paddocks SET name = 'P23' WHERE name = 'NSA I P23';
UPDATE paddocks SET name = 'P23A' WHERE name = 'NSA I P23 A';
UPDATE paddocks SET name = 'P46' WHERE name = 'NSA I P46';
UPDATE paddocks SET name = 'P47' WHERE name = 'NSA I P47';
UPDATE paddocks SET name = 'P50' WHERE name = 'NSA I P50';
UPDATE paddocks SET name = 'P51' WHERE name = 'NSA I P51';
UPDATE paddocks SET name = 'P52' WHERE name = 'NSA I P52';
UPDATE paddocks SET name = 'P53' WHERE name = 'NSA I P53';
UPDATE paddocks SET name = 'P54' WHERE name = 'NSA I P54';
UPDATE paddocks SET name = 'P55' WHERE name = 'NSA I P55';
UPDATE paddocks SET name = 'P56' WHERE name = 'NSA I P56';
UPDATE paddocks SET name = 'P57' WHERE name = 'NSA I P57';
UPDATE paddocks SET name = 'P58' WHERE name = 'NSA I P58';
UPDATE paddocks SET name = 'P59' WHERE name = 'NSA I P59';
UPDATE paddocks SET name = 'P71' WHERE name = 'NSA I P71';
UPDATE paddocks SET name = 'P71A' WHERE name = 'NSA I P71A';
UPDATE paddocks SET name = 'P72' WHERE name = 'NSA I P72';
UPDATE paddocks SET name = 'P72A' WHERE name = 'NSA I P72A';
UPDATE paddocks SET name = 'P73' WHERE name = 'NSA I P73';
UPDATE paddocks SET name = 'P73A' WHERE name = 'NSA I P73A';
UPDATE paddocks SET name = 'P74' WHERE name = 'NSA I P74';
UPDATE paddocks SET name = 'P74A' WHERE name = 'NSA I P74A';
UPDATE paddocks SET name = 'P75' WHERE name = 'NSA I P75';
UPDATE paddocks SET name = 'P77' WHERE name = 'NSA I P77';
UPDATE paddocks SET name = 'P78' WHERE name = 'NSA I P78';
UPDATE paddocks SET name = 'P79' WHERE name = 'NSA I P79';
UPDATE paddocks SET name = 'P80' WHERE name = 'NSA I P80';
UPDATE paddocks SET name = 'P81' WHERE name = 'NSA I P81';
UPDATE paddocks SET name = 'P82' WHERE name = 'NSA I P82';
UPDATE paddocks SET name = 'P83' WHERE name = 'NSA I P83';
UPDATE paddocks SET name = 'P84' WHERE name = 'NSA I P84';
UPDATE paddocks SET name = 'P85' WHERE name = 'NSA I P85';
UPDATE paddocks SET name = 'P86' WHERE name = 'NSA I P86';
UPDATE paddocks SET name = 'PItalia' WHERE name = 'NSA I PItalia';

-- =================================================================
-- Parte 2: Insert dos 20 piquetes do T12
-- =================================================================

-- grass_type_id: usa o primeiro grass_type ativo (Brachiaria, mesmo default dos outros)
-- O Supabase gera UUIDs automaticamente; sync engine traz pros devices via supabase_id.

INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P01', 9.85, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2502592, -45.3646774, '{"type":"Polygon","coordinates":[[[-45.3667974,-15.2519472],[-45.3645658,-15.2517816],[-45.3615618,-15.2477315],[-45.3636646,-15.2478884],[-45.3667974,-15.2519472]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P02', 7.92, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2501083, -45.3626604, '{"type":"Polygon","coordinates":[[[-45.3645658,-15.2517816],[-45.3630209,-15.2516159],[-45.3595877,-15.2476399],[-45.3615618,-15.2477227],[-45.3645658,-15.2517816]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P03', 9.77, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2491061, -45.3600683, '{"type":"Polygon","coordinates":[[[-45.3596306,-15.2476399],[-45.357399,-15.2473914],[-45.3606606,-15.251326],[-45.3630209,-15.2515331],[-45.3596306,-15.2476399]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P04', 10.12, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2487747, -45.3577423, '{"type":"Polygon","coordinates":[[[-45.357399,-15.2473086],[-45.35508159999999,-15.2470187],[-45.3581715,-15.2509532],[-45.3606606,-15.2512846],[-45.357399,-15.2473086]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P05', 10.01, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2484537, -45.3553648, '{"type":"Polygon","coordinates":[[[-45.3550601,-15.246971],[-45.35280700000001,-15.2467432],[-45.35572530000001,-15.2506363],[-45.3581715,-15.250947],[-45.3550601,-15.246971]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P06', 9.24, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2481345, -45.3529830, '{"type":"Polygon","coordinates":[[[-45.3526568,-15.2467015],[-45.3502536,-15.2463495],[-45.3536439,-15.2503255],[-45.35570379999999,-15.2505947],[-45.3526568,-15.2467015]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P07', 10.26, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2478562, -45.3506183, '{"type":"Polygon","coordinates":[[[-45.35023210000001,-15.2464118],[-45.3479576,-15.2459718],[-45.35104750000001,-15.2500979],[-45.35362240000001,-15.2503878],[-45.35023210000001,-15.2464118]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P08', 9.56, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2475050, -45.3483525, '{"type":"Polygon","coordinates":[[[-45.3479791,-15.245956],[-45.3458333,-15.2456868],[-45.3489447,-15.2498699],[-45.35102610000001,-15.2500563],[-45.3479791,-15.245956]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P09', 9.98, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2472565, -45.3461766, '{"type":"Polygon","coordinates":[[[-45.3458548,-15.2457075],[-45.34366609999999,-15.2455004],[-45.34660580000001,-15.2495386],[-45.3489017,-15.2498285],[-45.3458548,-15.2457075]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P10', 10.0, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2470163, -45.3439193, '{"type":"Polygon","coordinates":[[[-45.3436446,-15.2455004],[-45.34126280000001,-15.2452519],[-45.3444386,-15.2492901],[-45.34660580000001,-15.2495386],[-45.3436446,-15.2455004]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P11', 8.55, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2456130, -45.3607121, '{"type":"Polygon","coordinates":[[[-45.358665,-15.2440301],[-45.36151889999999,-15.2477037],[-45.3636646,-15.2478383],[-45.36104679999999,-15.2444628],[-45.358665,-15.2440301]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P12', 9.29, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2453305, -45.3588559, '{"type":"Polygon","coordinates":[[[-45.3586864,-15.2440176],[-45.3560901,-15.2435413],[-45.3593087,-15.2473827],[-45.3615081,-15.2476934],[-45.3586864,-15.2440176]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P13', 8.29, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2457116, -45.3571694, '{"type":"Polygon","coordinates":[[[-45.3593087,-15.2473724],[-45.3570771,-15.2469893],[-45.3540838,-15.2432928],[-45.35606860000001,-15.2435309],[-45.3593087,-15.2473724]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P14', 8.98, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2454030, -45.3549786, '{"type":"Polygon","coordinates":[[[-45.3570879,-15.2469789],[-45.3548026,-15.2467097],[-45.3518414,-15.243065],[-45.35407299999999,-15.2432824],[-45.3570879,-15.2469789]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P15', 8.31, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2443675, -45.3521247, '{"type":"Polygon","coordinates":[[[-45.3518414,-15.2430546],[-45.3496957,-15.2427233],[-45.35246370000001,-15.2462955],[-45.3547812,-15.2467097],[-45.3518414,-15.2430546]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P16', 10.41, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2439989, -45.3497472, '{"type":"Polygon","coordinates":[[[-45.3496957,-15.2427233],[-45.346874,-15.2421848],[-45.3500068,-15.2460884],[-45.35246370000001,-15.2462748],[-45.3496957,-15.2427233]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P17', 8.48, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2435723, -45.3472774, '{"type":"Polygon","coordinates":[[[-45.346874,-15.2421641],[-45.3447926,-15.241781],[-45.3478396,-15.245695],[-45.3500068,-15.2460574],[-45.346874,-15.2421641]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P18', 8.93, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2432244, -45.3451660, '{"type":"Polygon","coordinates":[[[-45.3448033,-15.241781],[-45.34263609999999,-15.2414186],[-45.3457475,-15.2454465],[-45.3478396,-15.245695],[-45.3448033,-15.241781]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P19', 9.77, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2429117, -45.3429902, '{"type":"Polygon","coordinates":[[[-45.34263609999999,-15.2414083],[-45.34038309999999,-15.2410562],[-45.3435588,-15.2452394],[-45.3457367,-15.2454465],[-45.34263609999999,-15.2414083]]]}');
INSERT INTO paddocks (name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES ('T12 - P20', 9.78, (SELECT id FROM grass_types ORDER BY id LIMIT 1), true, -15.2425783, -45.3407757, '{"type":"Polygon","coordinates":[[[-45.34038309999999,-15.2410355],[-45.3382909,-15.2406731],[-45.3412521,-15.2449081],[-45.34356949999999,-15.2452394],[-45.34038309999999,-15.2410355]]]}');

commit;