import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { SEED_SQL } from './seed';

const DB_NAME = 'gestao_pecuaria.db';
const SCHEMA_VERSION = 2;

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
        await database.execAsync(`
          DROP TABLE IF EXISTS supplement_evals;
          DROP TABLE IF EXISTS health_evals;
          DROP TABLE IF EXISTS washing_evals;
          DROP TABLE IF EXISTS bombona_evals;
        `);
        await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }

      // Create tables
      await database.execAsync(CREATE_TABLES_SQL);

      // Check if seed data exists
      const result = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM users'
      );

      if (!result || result.count === 0) {
        await database.execAsync(SEED_SQL);
      }

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
