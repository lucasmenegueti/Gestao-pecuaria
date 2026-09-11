import type * as SQLite from 'expo-sqlite';
import { SUPPLEMENT_EXCLUDED_CATEGORIES, CONFINEMENT_GRASS } from '@/constants';
import { loadSettings } from '@/lib/settings';
import { loadBombonaExpectations, loadMeasuredConsumption, daysBetween } from '@/lib/bombona';

// Alertas agregados pra o Painel. Cada função é autônoma e retorna lista pronta.
// Todas as seções podem ficar vazias — UI mostra "Sem alertas" quando for o caso.

export interface RondaIssue {
  paddockName: string;
  paddockId: number;
  kind: 'agua' | 'sanidade' | 'cerca' | 'biologico' | 'ronda_atrasada';
  detail: string;
  severity: 'warning' | 'danger';
}

export interface DesalocatedEntry {
  category: string;
  heads: number;
}

export interface BombonaRisk {
  paddockName: string;
  paddockId: number;
  formulaName: string;
  daysLeft: number; // pode ser negativo (já deveria estar vazio)
  severity: 'warning' | 'danger';
}

export interface CentralLowEntry {
  formulaName: string;
  have: number; // sacos no central
  need: number; // sacos projetados p/ 30 dias
  daysLeft: number;
  severity: 'warning' | 'danger';
}

export interface OpenRouteEntry {
  routeId: number;
  daysOpen: number;
  severity: 'warning' | 'danger';
}

export interface BombonaLedgerEntry {
  paddockId: number;
  paddockName: string;
  formulaName: string;
}

export interface HerdKpi {
  totalHeads: number;
  paddocksWithCattle: number;
  /** Cabeças alocadas ÷ hectares dos piquetes com gado. 0 sem área. */
  cabPerHa: number;
}

export interface AlertsData {
  /** Piquetes com gado que receberam ≥1 avaliação hoje (completa OU incompleta). */
  rondasToday: number;
  /** Piquetes com gado que cobriram TODAS as 3 obrigatórias hoje (Suplementação + Aguada + Cerca). */
  rondasCompletas: number;
  /** Piquetes com gado com ≥1 avaliação mas faltando alguma obrigatória. = rondasToday − rondasCompletas. */
  rondasIncompletas: number;
  paddocksWithCattle: number;
  ronda: RondaIssue[];
  desalocated: DesalocatedEntry[];
  desalocatedTotal: number;
  bombonas: BombonaRisk[];
  central: CentralLowEntry[];
  /** Rotas de reabastecimento abertas há tempo demais (guarda contra rota fantasma). */
  rotasAbertas: OpenRouteEntry[];
  /** Horas desde o último sync bem-sucedido, quando acima do limiar. */
  syncStale: { hours: number; severity: 'warning' | 'danger' } | null;
  /** Bombonas cujo ledger ficou negativo — o sistema perdeu a conta (admin). */
  bombonasSemConta: BombonaLedgerEntry[];
  /** Números do rebanho pro painel do admin. */
  herdKpi: HerdKpi;
}

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAY_LABELS_PT = [
  'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado',
];

// ISO da ocorrência mais recente do dia da semana informado (inclui hoje).
// weekday: 0 = domingo, 1 = segunda, ..., 6 = sábado. Fora desse range devolve null.
function mostRecentWeekdayIso(weekday: number): string | null {
  if (weekday < 0 || weekday > 6) return null;
  const today = new Date();
  const daysBack = (today.getDay() - weekday + 7) % 7;
  today.setDate(today.getDate() - daysBack);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Última avaliação de cada tipo por piquete via ROW_NUMBER() OVER (...)
async function latestEvalPerPaddock<T>(
  db: SQLite.SQLiteDatabase,
  evalTable: string,
  selectCols: string,
): Promise<T[]> {
  return db.getAllAsync<T>(`
    WITH ranked AS (
      SELECT r.paddock_id, ${selectCols}, e.created_at,
        ROW_NUMBER() OVER (PARTITION BY r.paddock_id ORDER BY e.created_at DESC) AS rn
      FROM ${evalTable} e
      JOIN rondas r ON r.id = e.ronda_id
    )
    SELECT * FROM ranked WHERE rn = 1
  `);
}

export async function loadAlerts(db: SQLite.SQLiteDatabase): Promise<AlertsData> {
  const today = todayIsoDate();
  const settings = await loadSettings(db);

  // Currais de confinamento são tratados à parte (decisão do Lucas, 09/2026):
  // nenhum alerta POR PIQUETE do Painel considera piquete cujo capim é
  // "Confinamento". O KPI de rondas e o estoque central (fazenda inteira)
  // continuam contando com eles.
  const confinementRows = await db.getAllAsync<{ id: number }>(
    `SELECT p.id FROM paddocks p JOIN grass_types gt ON gt.id = p.grass_type_id WHERE gt.name = ?`,
    [CONFINEMENT_GRASS]
  );
  const confinement = new Set(confinementRows.map((r) => r.id));

  // Regra: piquetes "ronda completa" = TODAS as 3 obrigatórias avaliadas hoje
  // (Suplementação + Aguada + Cerca, alinhadas com EVAL_ITEMS.category=obrigatorio
  // em app/src/app/ronda/[paddockId]/menu.tsx). Sob-demanda (bombona, forragem,
  // biológico, sanidade, peso visual, lavagem) NÃO contam pra completude — são
  // resolvidas só quando o admin solicita ou o peão julga necessário.
  //
  // "Incompleta" = piquete com gado tocou pelo menos 1 das obrigatórias mas não
  // cobriu as 3. Mostrado separado pra ficar honesto: 17 incompletas é melhor
  // sinal que "0 rondas hoje" quando o peão fez a manhã toda só de Suplementação.
  //
  // Considera DISTINCT por (ronda_id, tipo) — múltiplas rows da mesma seção numa
  // ronda (ex: Rafael salvando 2x suplementação no P50) contam como 1.
  const rondaProgress = await db.getAllAsync<{ paddock_id: number; covered: number }>(
    `SELECT r.paddock_id, COUNT(DISTINCT t) as covered
       FROM rondas r
       JOIN (
         SELECT DISTINCT ronda_id, 'supplement' AS t FROM supplement_evals WHERE deleted_at IS NULL
         UNION ALL SELECT DISTINCT ronda_id, 'water' FROM water_evals WHERE deleted_at IS NULL
         UNION ALL SELECT DISTINCT ronda_id, 'fence' FROM fence_evals WHERE deleted_at IS NULL
       ) e ON e.ronda_id = r.id
      WHERE r.date = ?
      GROUP BY r.paddock_id`,
    [today]
  );
  const completasSet = new Set<number>();
  const todaySet = new Set<number>();
  for (const row of rondaProgress) {
    todaySet.add(row.paddock_id);
    if (row.covered >= 3) completasSet.add(row.paddock_id);
  }
  const rondasToday = todaySet.size;
  const rondasCompletas = completasSet.size;
  const rondasIncompletas = rondasToday - rondasCompletas;
  const paddocksWithCattleRow = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM paddocks p
    JOIN herd h ON h.paddock_id = p.id
    WHERE p.active = 1 AND h.head_count > 0
  `);

  // --- Ronda: água / sanidade / cerca em aberto (última avaliação ruim) ---

  const ronda: RondaIssue[] = [];

  const lastWater = await latestEvalPerPaddock<{ paddock_id: number; quality: string | null; available: number; created_at: string }>(
    db,
    'water_evals',
    'e.quality, e.available',
  );
  // Lavagens (washing_evals) resolvem alertas de água. Pega a mais recente por piquete.
  const lastWashing = await latestEvalPerPaddock<{ paddock_id: number; was_washed: number; created_at: string }>(
    db,
    'washing_evals',
    'e.was_washed',
  );
  const lastWashByPaddock: Record<number, string> = {};
  lastWashing.forEach((w) => {
    if (w.was_washed) lastWashByPaddock[w.paddock_id] = w.created_at;
  });
  const lastHealth = await latestEvalPerPaddock<{ paddock_id: number; parasite_free: number; affected_pct: number | null }>(
    db,
    'health_evals',
    'e.parasite_free, e.affected_pct',
  );
  const lastFence = await latestEvalPerPaddock<{ paddock_id: number; classification: string; prevents_mixing: number }>(
    db,
    'fence_evals',
    'e.classification, e.prevents_mixing',
  );
  const paddockNames = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM paddocks WHERE active = 1'
  );
  const nameOf: Record<number, string> = {};
  paddockNames.forEach((p) => { nameOf[p.id] = p.name; });

  if (settings.agua.enabled) {
    lastWater.forEach((w) => {
      if (confinement.has(w.paddock_id)) return;
      // Lavagem posterior ao último water_eval ruim limpa o alerta.
      const washingAt = lastWashByPaddock[w.paddock_id];
      const washedAfter = washingAt && washingAt > w.created_at;
      if (!w.available) {
        // "sem água" não se resolve com lavagem — só com nova avaliação.
        ronda.push({
          paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
          kind: 'agua', detail: 'Sem água', severity: 'danger',
        });
        return;
      }
      if (washedAfter || !w.quality) return;
      if (settings.agua.dangerQualities.includes(w.quality)) {
        ronda.push({
          paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
          kind: 'agua', detail: `Água ${w.quality.toLowerCase()}`, severity: 'danger',
        });
      } else if (settings.agua.warnQualities.includes(w.quality)) {
        ronda.push({
          paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
          kind: 'agua', detail: `Água ${w.quality.toLowerCase()}`, severity: 'warning',
        });
      }
    });
  }

  if (settings.sanidade.enabled) {
    lastHealth.forEach((h) => {
      if (confinement.has(h.paddock_id)) return;
      const pct = h.affected_pct ?? 0;
      if (h.parasite_free && pct <= settings.sanidade.warnPct) return;
      const severity: 'danger' | 'warning' = pct >= settings.sanidade.dangerPct ? 'danger' : 'warning';
      ronda.push({
        paddockId: h.paddock_id, paddockName: nameOf[h.paddock_id] || `#${h.paddock_id}`,
        kind: 'sanidade',
        detail: pct > 0 ? `${pct.toFixed(0)}% do gado afetado` : 'Parasitas presentes',
        severity,
      });
    });
  }

  if (settings.cerca.enabled) {
    lastFence.forEach((f) => {
      if (confinement.has(f.paddock_id)) return;
      if (f.prevents_mixing === 0) {
        ronda.push({
          paddockId: f.paddock_id, paddockName: nameOf[f.paddock_id] || `#${f.paddock_id}`,
          kind: 'cerca', detail: 'Cerca não evita mistura', severity: 'danger',
        });
        return;
      }
      if (settings.cerca.dangerClassifications.includes(f.classification)) {
        ronda.push({
          paddockId: f.paddock_id, paddockName: nameOf[f.paddock_id] || `#${f.paddock_id}`,
          kind: 'cerca', detail: `Cerca ${f.classification.toLowerCase()}`, severity: 'danger',
        });
      } else if (settings.cerca.warnClassifications.includes(f.classification)) {
        ronda.push({
          paddockId: f.paddock_id, paddockName: nameOf[f.paddock_id] || `#${f.paddock_id}`,
          kind: 'cerca', detail: `Cerca ${f.classification.toLowerCase()}`, severity: 'warning',
        });
      }
    });
  }

  // --- Ronda: biológico pendente desde o último dia agendado ---
  // Só sai o alerta depois que applied=1 é registrado; não aplicar no dia ou
  // responder "Não" continua deixando o piquete na lista até a próxima aplicação.
  if (settings.biologico.enabled) {
    const lastScheduled = mostRecentWeekdayIso(settings.biologico.weekday);
    if (lastScheduled) {
      const pending = await db.getAllAsync<{ paddock_id: number; paddock_name: string }>(`
        SELECT p.id AS paddock_id, p.name AS paddock_name
        FROM paddocks p
        JOIN herd h ON h.paddock_id = p.id
        WHERE p.active = 1 AND h.head_count > 0
        GROUP BY p.id
        HAVING NOT EXISTS (
          SELECT 1 FROM biological_water_evals e
          JOIN rondas r ON r.id = e.ronda_id
          WHERE r.paddock_id = p.id
            AND e.applied = 1
            AND substr(e.created_at, 1, 10) >= ?
        )
        ORDER BY p.name
      `, [lastScheduled]);
      const label = WEEKDAY_LABELS_PT[settings.biologico.weekday];
      pending.forEach((p) => {
        if (confinement.has(p.paddock_id)) return;
        ronda.push({
          paddockId: p.paddock_id,
          paddockName: p.paddock_name,
          kind: 'biologico',
          detail: `Pendente desde ${label}`,
          severity: 'warning',
        });
      });
    }
  }

  // --- Ronda: piquete com gado sem ronda há N dias ---
  // "Ronda" = pelo menos 1 avaliação gravada. MAX(rondas.date) não serve:
  // abrir o menu já INSERTa uma ronda vazia (menu.tsx), que seria um falso
  // "visitei". A régua conta dias corridos; o warn default (4) absorve fim de
  // semana sem ronda.
  if (settings.rondaAtrasada.enabled) {
    const lastEvalRows = await db.getAllAsync<{
      paddock_id: number; paddock_name: string; last_eval: string | null;
    }>(`
      WITH evald AS (
        SELECT ronda_id FROM supplement_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM bombona_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM forage_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM water_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM health_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM fence_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM visual_weight_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM washing_evals WHERE deleted_at IS NULL
        UNION SELECT ronda_id FROM biological_water_evals WHERE deleted_at IS NULL
      )
      SELECT p.id AS paddock_id, p.name AS paddock_name, MAX(r.date) AS last_eval
      FROM paddocks p
      JOIN herd h ON h.paddock_id = p.id AND h.head_count > 0
      LEFT JOIN rondas r ON r.paddock_id = p.id AND r.id IN (SELECT ronda_id FROM evald)
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.name
    `);
    for (const row of lastEvalRows) {
      if (confinement.has(row.paddock_id)) continue;
      if (!row.last_eval) {
        ronda.push({
          paddockId: row.paddock_id, paddockName: row.paddock_name,
          kind: 'ronda_atrasada', detail: 'nunca registrada', severity: 'warning',
        });
        continue;
      }
      const days = daysBetween(row.last_eval, today);
      if (days < settings.rondaAtrasada.warnDays) continue;
      ronda.push({
        paddockId: row.paddock_id, paddockName: row.paddock_name,
        kind: 'ronda_atrasada',
        detail: `atrasada há ${days} dias`,
        severity: days >= settings.rondaAtrasada.dangerDays ? 'danger' : 'warning',
      });
    }
  }

  // --- Rebanho: gado desalocado ---

  let desalocated: DesalocatedEntry[] = [];
  let desalocatedTotal = 0;
  if (settings.desalocados.enabled) {
    const desalocatedRows = await db.getAllAsync<{ category: string; heads: number }>(
      'SELECT category, SUM(head_count) as heads FROM herd WHERE paddock_id IS NULL GROUP BY category'
    );
    desalocated = desalocatedRows.map((r) => ({ category: r.category, heads: r.heads }));
    desalocatedTotal = desalocated.reduce((s, d) => s + d.heads, 0);
  }

  // --- Ronda: bombonas em risco ---

  // Consumo diário: MEDIDO pelo ledger de abastecimentos quando há histórico
  // (≥2 abastecimentos no lote atual — lib/bombona.ts); senão, cabeças que
  // comem do cocho × alvo da fórmula. O alvo é g por CABEÇA/dia — o nome da
  // coluna mente (gotcha no CLAUDE.md). A versão anterior multiplicava pelo
  // peso vivo total e superestimava ~400×, deixando bombona e central em
  // danger permanente pras fórmulas cadastradas por cabeça.
  const allLots = await db.getAllAsync<{
    paddock_id: number; category: string; head_count: number;
  }>(`SELECT paddock_id, category, head_count FROM herd WHERE paddock_id IS NOT NULL AND head_count > 0`);

  const headsByPaddock: Record<number, number> = {};
  for (const l of allLots) {
    if (SUPPLEMENT_EXCLUDED_CATEGORIES.has(l.category)) continue;
    headsByPaddock[l.paddock_id] = (headsByPaddock[l.paddock_id] || 0) + l.head_count;
  }
  const measured = await loadMeasuredConsumption(db);
  const dailyKgFor = (paddockId: number, formulaId: number, gPerHeadDay: number): number => {
    const m = measured.get(`${paddockId}:${formulaId}`);
    if (m && m > 0) return m;
    if (gPerHeadDay < 1) return 0; // resquício da unidade antiga — sem régua utilizável
    return ((headsByPaddock[paddockId] || 0) * gPerHeadDay) / 1000;
  };

  const bombonas: BombonaRisk[] = [];
  const bombonasSemConta: BombonaLedgerEntry[] = [];
  if (settings.bombona.enabled || settings.bombonaLedger.enabled) {
    // Quanto ainda tem: ledger da Suplementação (fonte única em lib/bombona.ts).
    // Quanto dura: consumo do lote deste piquete. Antes o "quanto ainda tem"
    // também era estimado pelo consumo — o alerta e a ronda derivavam o saldo
    // por caminhos diferentes e podiam discordar sobre o mesmo piquete.
    const bombonaRows = await loadBombonaExpectations(db);

    // Ledger negativo = saiu mais ração do que a bombona recebeu; o sistema
    // perdeu a conta e só uma contagem na ronda de Bombona re-ancora.
    if (settings.bombonaLedger.enabled) {
      for (const b of bombonaRows) {
        if (!b.ledgerNegative || confinement.has(b.paddockId)) continue;
        bombonasSemConta.push({
          paddockId: b.paddockId, paddockName: b.paddockName, formulaName: b.formulaName,
        });
      }
    }

    for (const b of settings.bombona.enabled ? bombonaRows : []) {
      if (confinement.has(b.paddockId)) continue;
      const dailyKg = dailyKgFor(b.paddockId, b.formulaId, b.gPerKgBodyDay);
      if (dailyKg <= 0) continue;
      const remainingKg = b.expectedSacks * b.kgPerSack;
      const daysLeft = Math.floor(remainingKg / dailyKg);
      if (daysLeft > settings.bombona.warnDays) continue;
      bombonas.push({
        paddockId: b.paddockId,
        paddockName: b.paddockName,
        formulaName: b.formulaName,
        daysLeft,
        severity: daysLeft <= settings.bombona.dangerDays ? 'danger' : 'warning',
      });
    }
    bombonas.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // --- Estoque central: threshold configurável por fórmula ---

  const central: CentralLowEntry[] = [];
  if (settings.central.enabled) {
    const formulaUsage = await db.getAllAsync<{
      formula_id: number; paddock_id: number;
    }>(`SELECT formula_id, paddock_id FROM inventory WHERE location = 'bombona'`);

    const paddocksByFormula: Record<number, number[]> = {};
    for (const u of formulaUsage) {
      (paddocksByFormula[u.formula_id] ||= []).push(u.paddock_id);
    }

    const formulaRows = await db.getAllAsync<{
      id: number; name: string; kg_per_sack: number; g_per_kg_body_day: number; central_sacks: number;
    }>(`
      SELECT f.id, f.name, f.kg_per_sack, f.target_g_per_kg_body_day AS g_per_kg_body_day,
        COALESCE((SELECT SUM(ic.quantity_sacks) FROM inventory ic
                  WHERE ic.location = 'central' AND ic.formula_id = f.id), 0) AS central_sacks
      FROM formulas f
      WHERE f.active = 1
    `);

    for (const f of formulaRows) {
      let dailyKg = 0;
      for (const pid of paddocksByFormula[f.id] || []) {
        dailyKg += dailyKgFor(pid, f.id, f.g_per_kg_body_day);
      }
      if (dailyKg <= 0) continue;
      const dailySacks = dailyKg / f.kg_per_sack;
      const needForWindow = dailySacks * settings.central.warnDays;
      if (f.central_sacks >= needForWindow) continue;
      const daysLeft = Math.floor(f.central_sacks / dailySacks);
      central.push({
        formulaName: f.name,
        have: Math.round(f.central_sacks * 10) / 10,
        need: Math.round(needForWindow * 10) / 10,
        daysLeft,
        severity: daysLeft <= settings.central.dangerDays ? 'danger' : 'warning',
      });
    }
    central.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // --- Rota de reabastecimento esquecida aberta ---
  // start_time é gravado no device que abriu a rota (created_at é reescrito no
  // pull — REMOTE_ONLY — e mentiria pra rotas vindas de outro aparelho).
  const rotasAbertas: OpenRouteEntry[] = [];
  if (settings.rotaAberta.enabled) {
    const openRoutes = await db.getAllAsync<{ id: number; start_time: string }>(
      `SELECT id, start_time FROM resupply_routes WHERE status = 'in_progress' AND deleted_at IS NULL`
    );
    for (const r of openRoutes) {
      const daysOpen = daysBetween(r.start_time.slice(0, 10), today);
      if (daysOpen < settings.rotaAberta.warnDays) continue;
      rotasAbertas.push({
        routeId: r.id,
        daysOpen,
        severity: daysOpen >= settings.rotaAberta.dangerDays ? 'danger' : 'warning',
      });
    }
    rotasAbertas.sort((a, b) => b.daysOpen - a.daysOpen);
  }

  // --- Sem sincronizar há N horas ---
  // Estado local do device (sync_state não sincroniza). last_sync_at null =
  // device recém-instalado antes do primeiro ciclo — sem alerta pra não gritar
  // no primeiro boot.
  let syncStale: AlertsData['syncStale'] = null;
  if (settings.sync.enabled) {
    const ss = await db.getFirstAsync<{ last_sync_at: string | null }>(
      'SELECT last_sync_at FROM sync_state WHERE id = 1'
    );
    if (ss?.last_sync_at) {
      const ms = Date.now() - new Date(ss.last_sync_at).getTime();
      if (Number.isFinite(ms)) {
        const hours = Math.floor(ms / 3600000);
        if (hours >= settings.sync.warnHours) {
          syncStale = {
            hours,
            severity: hours >= settings.sync.dangerHours ? 'danger' : 'warning',
          };
        }
      }
    }
  }

  // --- KPI do rebanho (linha compacta do admin) ---
  const herdTotals = await db.getFirstAsync<{
    total: number; allocated: number; area: number | null;
  }>(`
    SELECT
      COALESCE(SUM(h.head_count), 0) AS total,
      COALESCE(SUM(CASE WHEN h.paddock_id IS NOT NULL THEN h.head_count END), 0) AS allocated,
      (SELECT SUM(p.area_hectares) FROM paddocks p
        WHERE p.active = 1 AND p.id IN (SELECT paddock_id FROM herd WHERE head_count > 0 AND paddock_id IS NOT NULL)
      ) AS area
    FROM herd h
    WHERE h.head_count > 0
  `);
  const area = herdTotals?.area ?? 0;
  const herdKpi: HerdKpi = {
    totalHeads: herdTotals?.total ?? 0,
    paddocksWithCattle: paddocksWithCattleRow?.count ?? 0,
    cabPerHa: area > 0 ? (herdTotals?.allocated ?? 0) / area : 0,
  };

  return {
    rondasToday,
    rondasCompletas,
    rondasIncompletas,
    paddocksWithCattle: paddocksWithCattleRow?.count ?? 0,
    ronda,
    desalocated,
    desalocatedTotal,
    bombonas,
    central,
    rotasAbertas,
    syncStale,
    bombonasSemConta,
    herdKpi,
  };
}
