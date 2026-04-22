-- =====================================================================
-- Migration: reset rebanho + estoque central para o estado do xlsx
-- (kml/2026-04-17_rebanho-por-piquete_v1.xlsx)
--
-- UPSERTA as 59 alocacoes de herd + 5 de inventory central com os valores
-- do xlsx. Linhas existentes sao sobrescritas (head_count, avg_weight_kg,
-- quantity_sacks, min_sacks). Linhas soft-deleted sao re-ativadas.
--
-- ATENCAO: sobrescreve mudancas feitas via app nestas 59 alocacoes + 5
-- inventarios central. Mudancas via morte/nascimento/venda/compra APOS
-- 2026-04-17 serao perdidas. Pool (paddock_id IS NULL) nao eh afetado.
-- Bombonas (location='bombona') tambem nao.
--
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- =====================================================================

-- Herd (59) ----------------------------------------------
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53d0b18d-1263-5245-b083-5ab077458e1a', 'bb7a53bf-69b5-5b4b-ae96-82323873a0b0', 'NOVILHA', 61, 198) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8061cb4b-9ace-5730-8c06-51801d6ee90d', 'd2a4d592-19e7-5570-8e24-b55b2513ff0c', 'GARROTE', 110, 375) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9d79cdbf-3e03-5149-9c88-3174ca88666b', '691cba5d-8854-5010-a21b-632612b614e1', 'GARROTE', 61, 330) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9e1e0152-41cd-504b-af23-ec88b2c7c64b', '2be70ed2-997e-5028-a24a-e77875f38b58', 'GARROTE', 77, 206) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b2e69288-58cb-5715-868d-29e2e7b23c10', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'VACA PARIDA', 73, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('788c9431-8582-50d6-b90c-f12822267a0c', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'BEZERRO MAMANDO', 37, 95) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8acca327-d759-500a-b160-6d886e069c87', 'ef23ec18-0f5a-57b9-bf50-7014fd55281f', 'BEZERRA MAMANDO', 27, 90) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('cdc027d4-55d7-54ad-9e26-12e3007fa55b', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'VACA PARIDA', 5, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('4f07ab15-82dc-5e17-8bbd-149c0696fecb', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'BEZERRA MAMANDO', 4, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('88783b87-65f8-509f-b6dd-dc1e11c38cf9', '3c483a50-04f5-5d9b-8035-ac2a362a7b2e', 'BEZERRO MAMANDO', 1, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('1372d76c-f13b-51bc-9c79-5570743acc53', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'BEZERRA MAMANDO', 13, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8b2ec0b9-ae8d-5090-8ac1-23d5054923e3', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'VACA PARIDA', 11, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5d9b47ab-b39b-548a-814f-f2c79a5256c5', '67b89a51-d2dc-5713-aabc-1fa06bf16cc7', 'BEZERRO MAMANDO', 4, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0863ac3b-93e4-5432-9205-be9b62957850', '582310fb-5249-51a7-82f8-ba3f50423d96', 'GARROTE', 90, 288) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('3b6486c3-801a-5817-b088-58efe19f26b7', '41169c83-b307-5397-b0a9-5ffed4044c0a', 'GARROTE', 71, 300) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('307a5c8b-3487-5644-bca0-226afce122d6', '74f49da2-72cc-5d4d-9cc8-959aeac47999', 'GARROTE', 74, 180) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('3295128b-720c-50fc-bbde-0cf0c2c2a116', '43387028-3f3e-5ad4-8d3a-d3a2233b5e05', 'GARROTE', 102, 254) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('1f6f4116-4693-5f7d-a5c4-55d2160a90ed', 'e3522ea2-a72e-5831-a20e-991da662a4cd', 'GARROTE', 90, 273) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('ec672d8e-c8b1-51e5-8726-f1cfa587c20c', 'e55dfd23-4cc1-5053-be46-d5b4fd0a47f5', 'GARROTE', 107, 338) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0464c274-6d1a-5041-9842-b62e7cddef02', '6a8d9b5c-5814-5242-8ac1-7588b6b9d0d4', 'GARROTE', 93, 216) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53099340-4881-5b16-a94a-3e19b1d340fd', '63bb6260-0c22-5f35-b987-e7688611b916', 'NOVILHA', 89, 319) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bc36b4d8-e186-5666-8323-c300aaa3ce9c', 'cc7a008d-5c24-5ed4-8055-27dfe72d3f74', 'NOVILHA', 84, 254) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('53ff0d2c-c39a-5fc6-b4b9-7a9026edc963', '5a13b932-2211-5681-a49e-2175f807a421', 'VACA SOLTEIRA', 23, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5adf7122-1314-5f1d-9460-40baec179973', 'ff9fb06d-1878-5ab0-8be2-435a45ada84d', 'GARROTE', 103, 350) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('7b4d04b6-600e-50e3-ba9e-d25b1ca071ec', 'c17230db-b817-5b91-95d8-054270dfabc2', 'GARROTE', 108, 375) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('07203519-9524-5c94-a796-48c322f56cd3', '112b688f-d4af-59d4-bca7-7df1350760a1', 'GARROTE', 87, 337) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('54b10b8d-ba4d-5920-8bf4-b3a8481fbd72', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'BEZERRO MAMANDO', 7, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('6b6b4b43-79e7-5e15-831b-ad8daf66e438', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'VACA PARIDA', 5, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('21b70d70-525c-523d-b1bb-0f4dbc7d9126', '75fb5bf7-3193-5cd2-bc5a-14893edf6ced', 'BEZERRA MAMANDO', 2, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('2a3e92fb-641e-5da7-b5bb-aa688c49b725', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'VACA PARIDA', 83, 470) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('43fbe01c-9585-5905-985b-d57247be4a36', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'BEZERRA MAMANDO', 54, 71) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('79748f63-07fd-5864-923c-c518179459f8', 'a07ea157-57ce-5f7b-b0d6-16a58e22491c', 'BEZERRO MAMANDO', 24, 80) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('314d54b9-2ab5-53c6-a61a-8af66d3b19d0', 'dc0e95e5-fb8d-5f67-bf9f-308ff3408661', 'NOVILHA', 45, 312) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9c719ae0-d21e-51f5-b586-02ecb89b3016', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'VACA PRENHA', 103, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('aea86e27-0eeb-5d52-92a6-10c02fc59cbd', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'BEZERRO MAMANDO', 45, 118) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('572d8bff-80bd-5a94-b2d2-cbd8b181902d', '1384682d-bfec-551f-a2f4-54fa47a1cccc', 'BEZERRA MAMANDO', 37, 114) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('2b01c65c-f20a-54ae-8be8-2384c3992091', 'bdd03053-e620-56f0-98d2-ad231f743414', 'VACA PRENHA', 98, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b446e852-91df-5619-9b62-98fa727235b8', 'bdd03053-e620-56f0-98d2-ad231f743414', 'BEZERRA MAMANDO', 34, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('0c9eba90-8d02-5b10-855f-b8cd87b55911', 'bdd03053-e620-56f0-98d2-ad231f743414', 'BEZERRO MAMANDO', 28, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('70054765-e29e-5b19-bdfa-28c5b8e8f072', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'VACA PRENHA', 93, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('ed65f8fe-8a1b-5862-a059-b76783829a21', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'BEZERRA MAMANDO', 48, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('37a9ee68-c0fe-59e9-a9d6-bb4ef6f6241b', '4394bc72-e73a-5f36-a982-9b8499b95b4f', 'BEZERRO MAMANDO', 44, 100) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('fc28269e-3aec-530a-9d40-e7bfc234d750', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'VACA PRENHA', 138, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('b8570c30-b1c1-5eb0-a9e3-64defe4c12e5', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'BEZERRO MAMANDO', 68, 120) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8d3bb00e-88a4-5ae1-adbc-901b82cacf9c', 'a6c43b1b-3d75-50e6-bab9-5d22b6c8d1e8', 'BEZERRA MAMANDO', 50, 130) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9008c221-7749-55a0-881b-edec9d3e8a6b', '96bb749b-0b00-595c-965a-6d952e0c2479', 'VACA PARIDA', 111, 420) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('57d39695-bff4-5976-ad4e-e29a9dec725e', '96bb749b-0b00-595c-965a-6d952e0c2479', 'BEZERRO MAMANDO', 109, 140) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9541f2b4-6b41-5122-acae-5893467da7bc', '96bb749b-0b00-595c-965a-6d952e0c2479', 'BEZERRA MAMANDO', 80, 130) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('f26cfa56-4292-5dd5-8d79-313153afcecf', 'b3ad10ab-b8ea-5f68-b6c4-1adbb3e4884b', 'NOVILHA', 136, 279) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8746f234-09e5-5e13-a39f-c81764fa2142', '7ffb308e-8a40-52dd-bb8c-43948c8c0e40', 'NOVILHA', 115, 201) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('9c0a4dc2-0d21-525e-a382-f533631164e0', '3b64f735-e203-5b64-b065-039c861051ec', 'VACA PARIDA', 149, 450) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('5d290c06-d556-52fb-850c-d560d15a1fcd', '3b64f735-e203-5b64-b065-039c861051ec', 'BEZERRO MAMANDO', 79, 120) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('fb313551-7b33-5d52-8168-bb9c8701432e', '3b64f735-e203-5b64-b065-039c861051ec', 'BEZERRA MAMANDO', 75, 115) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bd1a0a38-b3fe-56ce-94f5-7958ccd3cccb', '1b05b7d1-9790-5cfb-9793-97e7498f7eb6', 'NOVILHA', 129, 312) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('8b574f95-386d-5658-9b48-165d49648392', 'aba8a5a1-79ba-5b96-8c63-f464ca47a744', 'GARROTE', 110, 349) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('bdb22a0d-be76-52c9-a1ad-85e2d39ff61f', '21986dd2-b9a9-559b-8926-c9862dc2d9c7', 'GARROTE', 99, 387) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('12b8de7a-1667-529a-a23d-e62e11397b00', '91f4c970-8273-5d8f-a9e0-db514379542d', 'GARROTE', 110, 350) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('25f91896-be1c-5257-a6b5-e9705a9ecdbb', 'f927ffcb-498e-5e2b-b452-8c4271b683f8', 'GARROTE', 71, 221) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();
insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values ('029b9c6e-0f08-59e2-b0af-8ac2ed8a3499', '54c16c6f-dc05-566f-8749-6e7bb371f2e6', 'GARROTE', 71, 375) on conflict (id) do update set
    paddock_id = excluded.paddock_id,
    category = excluded.category,
    head_count = excluded.head_count,
    avg_weight_kg = excluded.avg_weight_kg,
    deleted_at = null,
    updated_at = now();


-- Inventory central (5) ---------------------------
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('ab233bdc-6d7f-5040-b919-0dd8b5bccfc9', '9d04102a-7694-56f0-b59f-1db52c50a81d', 400, 10, 'central') on conflict (id) do update set
    quantity_sacks = excluded.quantity_sacks,
    min_sacks = excluded.min_sacks,
    deleted_at = null,
    updated_at = now();
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('072a9f79-1649-5103-b1b0-1872c6ea4b1c', '6817a2fe-26cc-502a-a235-7d976b4cd7ae', 734, 10, 'central') on conflict (id) do update set
    quantity_sacks = excluded.quantity_sacks,
    min_sacks = excluded.min_sacks,
    deleted_at = null,
    updated_at = now();
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('8aec4d6c-b0a9-5997-9326-45f557c36101', '44f4b28e-d039-5d7f-aa72-c695ab0f06fb', 0, 5, 'central') on conflict (id) do update set
    quantity_sacks = excluded.quantity_sacks,
    min_sacks = excluded.min_sacks,
    deleted_at = null,
    updated_at = now();
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('fd71e6be-8aa6-5e02-a6d6-22784148ff37', 'c8f7e250-be2b-579b-ad99-cff3e906afa8', 0, 5, 'central') on conflict (id) do update set
    quantity_sacks = excluded.quantity_sacks,
    min_sacks = excluded.min_sacks,
    deleted_at = null,
    updated_at = now();
insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values ('2a8f8246-53cf-5979-8ee6-2270282c90d9', 'd0ee0fe4-c08d-5092-affc-d49e71939144', 0, 5, 'central') on conflict (id) do update set
    quantity_sacks = excluded.quantity_sacks,
    min_sacks = excluded.min_sacks,
    deleted_at = null,
    updated_at = now();


notify pgrst, 'reload schema';
