import type * as SQLite from 'expo-sqlite';

// Defaults inline — mesma fonte de verdade do INSERT OR IGNORE em schema.ts.
// Usado pra fallback quando a leitura do DB retorna vazio (caso raro, e.g. DB
// recém-criado ainda carregando).
export const DEFAULT_SETTINGS = {
  'fence.voltage_forte': 4000,
  'fence.voltage_adequado': 2000,
  'fence.voltage_fraco': 1,
  'alert.bombona.enabled': 1,
  'alert.bombona.warn_days': 3,
  'alert.bombona.danger_days': 0,
  'alert.central.enabled': 1,
  'alert.central.warn_days': 30,
  'alert.central.danger_days': 7,
  'alert.sanidade.enabled': 1,
  'alert.sanidade.warn_pct': 0,
  'alert.sanidade.danger_pct': 20,
  'alert.agua.enabled': 1,
  'alert.agua.warn_qualities': ['MEDIANA'] as string[],
  'alert.agua.danger_qualities': ['RUIM'] as string[],
  'alert.cerca.enabled': 1,
  'alert.cerca.warn_classifications': ['FRACO'] as string[],
  'alert.cerca.danger_classifications': ['SEM CHOQUE'] as string[],
  'alert.desalocados.enabled': 1,
  'alert.biologico.enabled': 1,
  'alert.biologico.weekday': 4, // 0=dom ... 4=qui (default) ... 6=sáb
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

/** Snapshot completo de settings (faz 1 query, devolve objeto tipado). */
export interface AppSettings {
  fence: { voltageForte: number; voltageAdequado: number; voltageFraco: number };
  bombona: { enabled: boolean; warnDays: number; dangerDays: number };
  central: { enabled: boolean; warnDays: number; dangerDays: number };
  sanidade: { enabled: boolean; warnPct: number; dangerPct: number };
  agua: { enabled: boolean; warnQualities: string[]; dangerQualities: string[] };
  cerca: { enabled: boolean; warnClassifications: string[]; dangerClassifications: string[] };
  desalocados: { enabled: boolean };
  biologico: { enabled: boolean; weekday: number };
}

function num(v: string | undefined, def: number): number {
  if (v == null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function bool(v: string | undefined, def: number): boolean {
  return num(v, def) === 1;
}

function jsonArr(v: string | undefined, def: readonly string[]): string[] {
  if (!v) return [...def];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [...def];
  } catch {
    return [...def];
  }
}

export async function loadSettings(db: SQLite.SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings'
  );
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;
  return {
    fence: {
      voltageForte: num(m['fence.voltage_forte'], DEFAULT_SETTINGS['fence.voltage_forte']),
      voltageAdequado: num(m['fence.voltage_adequado'], DEFAULT_SETTINGS['fence.voltage_adequado']),
      voltageFraco: num(m['fence.voltage_fraco'], DEFAULT_SETTINGS['fence.voltage_fraco']),
    },
    bombona: {
      enabled: bool(m['alert.bombona.enabled'], DEFAULT_SETTINGS['alert.bombona.enabled']),
      warnDays: num(m['alert.bombona.warn_days'], DEFAULT_SETTINGS['alert.bombona.warn_days']),
      dangerDays: num(m['alert.bombona.danger_days'], DEFAULT_SETTINGS['alert.bombona.danger_days']),
    },
    central: {
      enabled: bool(m['alert.central.enabled'], DEFAULT_SETTINGS['alert.central.enabled']),
      warnDays: num(m['alert.central.warn_days'], DEFAULT_SETTINGS['alert.central.warn_days']),
      dangerDays: num(m['alert.central.danger_days'], DEFAULT_SETTINGS['alert.central.danger_days']),
    },
    sanidade: {
      enabled: bool(m['alert.sanidade.enabled'], DEFAULT_SETTINGS['alert.sanidade.enabled']),
      warnPct: num(m['alert.sanidade.warn_pct'], DEFAULT_SETTINGS['alert.sanidade.warn_pct']),
      dangerPct: num(m['alert.sanidade.danger_pct'], DEFAULT_SETTINGS['alert.sanidade.danger_pct']),
    },
    agua: {
      enabled: bool(m['alert.agua.enabled'], DEFAULT_SETTINGS['alert.agua.enabled']),
      warnQualities: jsonArr(m['alert.agua.warn_qualities'], DEFAULT_SETTINGS['alert.agua.warn_qualities']),
      dangerQualities: jsonArr(m['alert.agua.danger_qualities'], DEFAULT_SETTINGS['alert.agua.danger_qualities']),
    },
    cerca: {
      enabled: bool(m['alert.cerca.enabled'], DEFAULT_SETTINGS['alert.cerca.enabled']),
      warnClassifications: jsonArr(m['alert.cerca.warn_classifications'], DEFAULT_SETTINGS['alert.cerca.warn_classifications']),
      dangerClassifications: jsonArr(m['alert.cerca.danger_classifications'], DEFAULT_SETTINGS['alert.cerca.danger_classifications']),
    },
    desalocados: {
      enabled: bool(m['alert.desalocados.enabled'], DEFAULT_SETTINGS['alert.desalocados.enabled']),
    },
    biologico: {
      enabled: bool(m['alert.biologico.enabled'], DEFAULT_SETTINGS['alert.biologico.enabled']),
      weekday: Math.min(6, Math.max(0, num(m['alert.biologico.weekday'], DEFAULT_SETTINGS['alert.biologico.weekday']))),
    },
  };
}

/** Upsert uma chave. Value sempre armazenado como TEXT. */
export async function setSetting(
  db: SQLite.SQLiteDatabase,
  key: SettingKey,
  value: number | boolean | string | string[]
): Promise<void> {
  let serialized: string;
  if (typeof value === 'boolean') serialized = value ? '1' : '0';
  else if (Array.isArray(value)) serialized = JSON.stringify(value);
  else serialized = String(value);
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, serialized]
  );
}

/** Classifica voltagem usando settings carregadas. */
export function classifyFenceWith(
  voltage: number,
  fence: AppSettings['fence']
): 'FORTE' | 'ADEQUADO' | 'FRACO' | 'SEM CHOQUE' {
  if (voltage >= fence.voltageForte) return 'FORTE';
  if (voltage >= fence.voltageAdequado) return 'ADEQUADO';
  if (voltage >= fence.voltageFraco) return 'FRACO';
  return 'SEM CHOQUE';
}
