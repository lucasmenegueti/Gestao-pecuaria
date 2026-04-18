import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { setLogDb, logInfo } from '@/lib/log';
// Seed local foi removido: dados vêm do Supabase via pullDelta no login.
// Deixar seed local criaria duplicatas / conflitos ao sincronizar.

const DB_NAME = 'gestao_pecuaria.db';
const SCHEMA_VERSION = 16;

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
