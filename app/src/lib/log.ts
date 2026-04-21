import type * as SQLite from 'expo-sqlite';
import { useAuthStore } from '@/stores/authStore';

// Logger global que persiste em SQLite pra debug posterior.
// Também espelha no console.log pro Metro. Máximo 2000 entries (rolling).

type Level = 'info' | 'warn' | 'error';
type Category = 'auth' | 'sync' | 'mutation' | 'ui' | 'net' | 'db';

let _db: SQLite.SQLiteDatabase | null = null;
const MAX_ENTRIES = 2000;

export function setLogDb(db: SQLite.SQLiteDatabase) {
  _db = db;
}

export function logAction(level: Level, category: Category, action: string, data?: unknown) {
  const dataStr = data == null ? null : (() => {
    try { return JSON.stringify(data).slice(0, 10000); } catch { return String(data); }
  })();
  const userId = useAuthStore.getState().user?.id ?? null;

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(`[${category}:${action}]`, data ?? '');
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(`[${category}:${action}]`, data ?? '');
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${category}:${action}]`, data ?? '');
  }

  if (!_db) return;
  _db.runAsync(
    'INSERT INTO activity_log (level, category, action, data, user_id) VALUES (?, ?, ?, ?, ?)',
    [level, category, action, dataStr, userId]
  ).catch(() => {});

  // Trim à janela
  _db.runAsync(
    `DELETE FROM activity_log WHERE id IN (
       SELECT id FROM activity_log ORDER BY id DESC LIMIT -1 OFFSET ?
     )`,
    [MAX_ENTRIES]
  ).catch(() => {});
}

export const logInfo = (cat: Category, action: string, data?: unknown) =>
  logAction('info', cat, action, data);
export const logWarn = (cat: Category, action: string, data?: unknown) =>
  logAction('warn', cat, action, data);
export const logError = (cat: Category, action: string, data?: unknown) =>
  logAction('error', cat, action, data);

export interface LogEntry {
  id: number;
  ts: string;
  level: Level;
  category: Category;
  action: string;
  data: string | null;
  user_id: string | null;
}

export async function fetchLogs(limit = 200): Promise<LogEntry[]> {
  if (!_db) return [];
  return _db.getAllAsync<LogEntry>(
    'SELECT * FROM activity_log ORDER BY id DESC LIMIT ?',
    [limit]
  );
}

export async function clearLogs(): Promise<void> {
  if (!_db) return;
  await _db.runAsync('DELETE FROM activity_log');
}
