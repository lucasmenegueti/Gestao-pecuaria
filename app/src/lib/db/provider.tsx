import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { setLogDb, logInfo, logWarn } from '@/lib/log';
// Seed local foi removido: dados vêm do Supabase via pullDelta no login.
// Deixar seed local criaria duplicatas / conflitos ao sincronizar.

const DB_NAME = 'gestao_pecuaria.db';
const SCHEMA_VERSION = 23;

const DatabaseContext = createContext<SQLite.SQLiteDatabase | null>(null);

export function useDatabase(): SQLite.SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const database = await SQLite.openDatabaseAsync(DB_NAME);

      // Enable WAL mode for better performance
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await database.execAsync('PRAGMA foreign_keys = ON;');

      // Schema migration: drop tables whose shape changed when version bumps.
      // Keeps seed tables (users, formulas, grass_types, paddocks, herd) intact.
      const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const currentVersion = versionRow?.user_version ?? 0;
      if (currentVersion < SCHEMA_VERSION) {
        // Antes de destruir qualquer tabela, conta quantas rows com pending_sync=1
        // ficariam órfãs. Se houver, loga WARN com detalhes — peão pode perder
        // trabalho local não sincronizado. No futuro, esse hook é onde faríamos
        // backup→restore. Hoje só emite alerta pro log de atividade.
        if (currentVersion > 0) {
          try {
            const tables = ['herd', 'herd_events', 'rondas', 'inventory', 'inventory_events',
              'supplement_evals', 'bombona_evals', 'forage_evals', 'water_evals', 'health_evals',
              'fence_evals', 'visual_weight_evals', 'washing_evals', 'biological_water_evals',
              'resupply_routes', 'resupply_loads', 'resupply_deliveries'];
            for (const t of tables) {
              const r = await database.getFirstAsync<{ n: number }>(
                `SELECT COUNT(*) as n FROM ${t} WHERE pending_sync = 1`
              ).catch(() => null);
              if (r && r.n > 0) {
                logWarn('db', 'migration_pending_sync_lost', {
                  table: t, count: r.n, from_version: currentVersion, to_version: SCHEMA_VERSION,
                });
              }
            }
          } catch {
            // Tabela ainda não existe (primeira boot após fresh install) — ok.
          }
        }
        logInfo('db', 'migration_start', { from: currentVersion, to: SCHEMA_VERSION });
        // Desliga FKs durante a migração — drops encadeados de paddocks/herd/etc
        // disparariam restrições porque inventory/resupply_deliveries referenciam paddocks.
        // Religa no final do bloco.
        await database.execAsync('PRAGMA foreign_keys = OFF;');
        await database.execAsync(`
          DROP TABLE IF EXISTS supplement_evals;
          DROP TABLE IF EXISTS health_evals;
          DROP TABLE IF EXISTS washing_evals;
          DROP TABLE IF EXISTS bombona_evals;
        `);
        if (currentVersion > 0 && currentVersion < 3) {
          // v3: herd.paddock_id virou nullable + herd_events.paddock_id nullable.
          // SQLite não permite ALTER COLUMN, então recria ambas e re-semeia herd.
          await database.execAsync(`
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS herd_events;
          `);
        }
        if (currentVersion < 5) {
          await database.execAsync(`
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS herd;
          `);
        }
        if (currentVersion < 4) {
          // v4: paddocks ganha colunas geo + re-seed a partir do KML.
          // Dropa paddocks (FKs herd/rondas/herd_events/inventory/resupply_deliveries ficam órfãs; em dev ok).
          await database.execAsync(`
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS rondas;
          `);
        }
        if (currentVersion < 6) {
          // v6: KML v5 da fazenda (125 piquetes, antes 37) — re-seeda paddocks/water_tanks/boundaries.
          // Dropa também inventory e resupply_deliveries (FK para paddocks) + tabelas dependentes
          // para evitar FKs órfãs após renumeração de IDs.
          await database.execAsync(`
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_routes;
          `);
        }
        if (currentVersion < 7) {
          // v7: geometrias dos piquetes editadas no editor KML — re-seeda paddocks.
          // IDs são reatribuídos, dropa tabelas com FK.
          await database.execAsync(`
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_routes;
          `);
        }
        if (currentVersion < 8) {
          // v8: novas categorias de gado (VACA PARIDA/PRENHA/SOLTEIRA substituem VACA;
          // BEZERRO/BOI/BEZERRA/TOURO removidos). Dropa herd/herd_events pra re-seed
          // com dados do xlsx de rebanho.
          await database.execAsync(`
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS herd_events;
          `);
        }
        if (currentVersion < 9) {
          // v9: formulas.target_consumption_g_per_day renomeado p/ target_g_per_kg_body_day.
          // Drop de formulas + tabelas dependentes pra re-seed c/ nova semântica.
          await database.execAsync(`
            DROP TABLE IF EXISTS formulas;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_routes;
          `);
        }
        if (currentVersion < 10) {
          // v10: estoque central atualizado pros valores reais da fazenda (2026-04-17);
          // fórmula "Recria Top Most" renomeada para "Probeef Topmost Golden" + kg_per_sack 25→30.
          // Dropa formulas + inventory pra re-seed.
          await database.execAsync(`
            DROP TABLE IF EXISTS formulas;
            DROP TABLE IF EXISTS inventory;
          `);
        }
        if (currentVersion < 11) {
          // v11: nova tabela inventory_events — ledger de movimentações. Nada a dropar.
          // CREATE_TABLES_SQL cria ao final do init.
        }
        if (currentVersion < 12) {
          // v12: auth migrou pra Supabase. user_id em rondas/inventory_events/resupply_routes
          // virou TEXT (UUID). users vira cache de profiles (TEXT id).
          await database.execAsync(`
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS inventory_events;
            DROP TABLE IF EXISTS resupply_routes;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_deliveries;
          `);
        }
        if (currentVersion < 17) {
          // v17: herd_events ganha coluna weight_kg pra eventos de venda (peso
          // de balança ou estimado). ALTER ADD COLUMN é aditivo — preserva dados
          // existentes. Tolerante: tabela pode não existir se usuário tiver
          // vindo de um estado anterior que a dropou.
          try {
            await database.execAsync('ALTER TABLE herd_events ADD COLUMN weight_kg REAL');
          } catch {
            // coluna já existe ou tabela não existe ainda — CREATE_TABLES_SQL cuida.
          }
        }
        if (currentVersion < 18) {
          // v18: app_settings table pra configurações de cerca + alertas.
          // CREATE_TABLES_SQL cria e insere defaults via INSERT OR IGNORE — nada a dropar.
        }
        if (currentVersion < 19) {
          // v19: biological_water_evals pra registrar aplicação de biológico na água.
          // CREATE_TABLES_SQL cria — nada a dropar.
        }
        if (currentVersion < 20) {
          // v20: inspection_requests — admin delega quais piquetes precisam de
          // inspeção "sob demanda". CREATE_TABLES_SQL cria — nada a dropar.
        }
        if (currentVersion < 22) {
          // v22: app_settings vira tabela sincronizada. Ganha colunas SYNC
          // (supabase_id, local_updated_at, deleted_at, pending_sync, sync_rev).
          // Drop + re-create — defaults voltam via INSERT OR IGNORE no schema.ts,
          // depois pull do Supabase sobrescreve com valores do servidor.
          await database.execAsync('DROP TABLE IF EXISTS app_settings;');
        }
        if (currentVersion < 23) {
          // v23: app_settings PK muda de `key` para `id INTEGER AUTOINCREMENT`
          // pra alinhar com o sync engine (que faz WHERE id = ? em toda tabela
          // SYNCED). `key` continua UNIQUE — settings.ts não muda.
          // DBs que boot-aram em v22 com a PK antiga (key) precisam dropar.
          await database.execAsync('DROP TABLE IF EXISTS app_settings;');
        }
        if (currentVersion < 21) {
          // v21: Reset pra produção — Supabase foi limpo (migration
          // 2026-04-26_reset_pra_producao.sql). Localmente, dropa tabelas de
          // movimento + herd/inventory + sync_state pra forçar repull completo
          // do estado limpo. Catálogos (paddocks/water_tanks/farm_boundaries/
          // grass_types/formulas) não precisam dropar — vão ser atualizados
          // pelo delta sync se mudaram. Mas dropamos sync_state pra reiniciar
          // o cursor de pull (last_pull_at = NULL → pull tudo).
          await database.execAsync(`
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS biological_water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS inspection_requests;
            DROP TABLE IF EXISTS resupply_routes;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS inventory_events;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS sync_state;
          `);
        }
        if (currentVersion < 16) {
          // v16: sync_state ganha last_sync_at (timestamp de última sincronização
          // bem-sucedida — separado do cursor last_pull_at). Drop limpo da tabela
          // (só metadata, sem dados do usuário).
          await database.execAsync('DROP TABLE IF EXISTS sync_state;');
        }
        if (currentVersion < 15) {
          // v15: adiciona sync_rev (marker pra trigger) + activity_log. Drop limpo.
          await database.execAsync(`
            DROP TABLE IF EXISTS grass_types;
            DROP TABLE IF EXISTS formulas;
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS inventory_events;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS resupply_routes;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS sync_state;
            DROP TABLE IF EXISTS activity_log;
          `);
        }
        if (currentVersion < 14) {
          // v14: limpa estado inconsistente de tentativas anteriores.
          // - Dados do seed antigo (grass_types, formulas) sem supabase_id ficaram órfãos
          // - last_pull_at foi setado prematuramente, impedindo repull
          // Drop de dados + reset do sync_state força repull completo do Supabase.
          await database.execAsync(`
            DROP TABLE IF EXISTS grass_types;
            DROP TABLE IF EXISTS formulas;
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS inventory_events;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS resupply_routes;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS sync_state;
          `);
        }
        if (currentVersion < 13) {
          // v13: colunas de sync (supabase_id, local_updated_at, deleted_at, pending_sync)
          // em todas as tabelas sincronizadas + sync_state + triggers.
          // Dropamos tudo pra recriar limpo; pull inicial repopula.
          await database.execAsync(`
            DROP TABLE IF EXISTS grass_types;
            DROP TABLE IF EXISTS formulas;
            DROP TABLE IF EXISTS paddocks;
            DROP TABLE IF EXISTS water_tanks;
            DROP TABLE IF EXISTS farm_boundaries;
            DROP TABLE IF EXISTS herd;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS herd_events;
            DROP TABLE IF EXISTS inventory_events;
            DROP TABLE IF EXISTS rondas;
            DROP TABLE IF EXISTS supplement_evals;
            DROP TABLE IF EXISTS bombona_evals;
            DROP TABLE IF EXISTS forage_evals;
            DROP TABLE IF EXISTS water_evals;
            DROP TABLE IF EXISTS health_evals;
            DROP TABLE IF EXISTS fence_evals;
            DROP TABLE IF EXISTS visual_weight_evals;
            DROP TABLE IF EXISTS washing_evals;
            DROP TABLE IF EXISTS resupply_routes;
            DROP TABLE IF EXISTS resupply_loads;
            DROP TABLE IF EXISTS resupply_deliveries;
            DROP TABLE IF EXISTS sync_state;
            DROP TABLE IF EXISTS sync_queue;
          `);
        }
        await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
        await database.execAsync('PRAGMA foreign_keys = ON;');
      }

      // Cria as tabelas com FKs desligadas (sync_state INSERT roda dentro do CREATE_TABLES_SQL)
      await database.execAsync('PRAGMA foreign_keys = OFF;');
      await database.execAsync(CREATE_TABLES_SQL);
      await database.execAsync('PRAGMA foreign_keys = ON;');

      // Tabelas de dados ficam vazias; pullDelta (em engine.ts) popula via Supabase
      // no primeiro login.

      setLogDb(database);
      logInfo('ui', 'db_ready', { schema_version: SCHEMA_VERSION });
      setDb(database);
      setReady(true);
    }
    init();
  }, []);

  if (!ready || !db) {
    return null; // Could show a loading screen here
  }

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}
