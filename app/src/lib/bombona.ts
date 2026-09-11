import type * as SQLite from 'expo-sqlite';

// Quanto DEVERIA ter na bombona (reservatório do cocho) de um piquete.
//
// Desde 09/2026 a Suplementação DEBITA a bombona na hora (evento CONSUMO_COCHO
// via `settleBombona` + débito direto) — o saldo gravado tende a ser o real e
// `usedSacks` tende a 0. A conta abaixo continua necessária como ponte:
//
//     deveria ter = saldo na âncora − sacos que a Suplementação tirou depois dela
//
// porque avaliações vindas de devices com versão antiga (que não debitam) só
// aparecem aqui, e porque a âncora ordena o dia — avaliação com `r.date` igual
// à âncora já está embutida no saldo e não pode ser descontada de novo.
//
// Fonte única: o alerta do Painel (`alerts.ts`) e a ronda de Bombona leem daqui.
// Se cada um derivasse a sua, os dois mostrariam números diferentes pro mesmo
// piquete — pior do que um número errado só.

export function daysBetween(fromIso: string | null | undefined, toIso: string): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!isFinite(from) || !isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

export interface BombonaExpectation {
  inventoryId: number;
  paddockId: number;
  paddockName: string;
  formulaId: number;
  formulaName: string;
  kgPerSack: number;
  gPerKgBodyDay: number;
  /** Saldo gravado na última entrega (ou na última contagem da ronda). */
  balanceSacks: number;
  /** Data desse saldo — o marco a partir do qual o consumo conta. */
  balanceDate: string | null;
  daysSince: number;
  /** Sacos que a ronda de Suplementação tirou dessa bombona desde `balanceDate`. */
  usedSacks: number;
  /**
   * Quanto deveria ter hoje, cortado em zero. Fica negativo no cru quando saiu
   * mais ração do que a bombona recebeu (aconteceu: ração que veio direto do
   * trator, ou reabastecimento não registrado) — mostrar "−90 sacos" pro peão
   * não significa nada, então o piso é 0 e a divergência aparece na base
   * (`balanceSacks` × `usedSacks`), que é legível.
   */
  expectedSacks: number;
  /** Verdadeiro quando o cru deu negativo: o sistema perdeu a conta dessa bombona. */
  ledgerNegative: boolean;
}

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * O que o sistema acha que tem nas bombonas, uma linha por (piquete, fórmula).
 * Sem `paddockId` devolve a fazenda inteira — é assim que o alerta do Painel lê.
 */
export async function loadBombonaExpectations(
  db: SQLite.SQLiteDatabase,
  paddockId?: number,
): Promise<BombonaExpectation[]> {
  // `r.date > i.last_resupply_date` é estritamente maior, e isso tem um custo
  // conhecido. `last_resupply_date` é DATE (sem hora), então não dá pra ordenar
  // entrega/contagem e abastecimento dentro do mesmo dia. Incluir o dia da
  // âncora (`>=`) contaria em dobro um abastecimento da manhã que já estava
  // embutido no saldo observado; excluir deixa de contar um da tarde.
  //
  // Optamos por excluir. Consequência: se a contagem da ronda DIVERGIR (só aí a
  // âncora anda pra hoje) e o peão abastecer o cocho DEPOIS, no mesmo dia,
  // aqueles sacos não saem desta conta. Erra pra cima — mostra mais do que tem,
  // nunca manda reabastecer bombona cheia — e a contagem da ronda seguinte
  // corrige. Quando a contagem confirma o sistema, a âncora não se move e o
  // abastecimento do dia entra normal.
  //
  // A âncora com hora exigiria uma coluna datetime que sincronizasse:
  // `created_at` está em REMOTE_ONLY_COLS e é reescrito na pull, então seria
  // menos confiável que `rondas.date` entre devices.
  const rows = await db.getAllAsync<{
    inventory_id: number; paddock_id: number; paddock_name: string;
    formula_id: number; formula_name: string;
    kg_per_sack: number; g_per_kg_body_day: number;
    quantity_sacks: number; last_resupply_date: string | null;
    used: number | null;
  }>(
    `SELECT i.id AS inventory_id, p.id AS paddock_id, p.name AS paddock_name,
            f.id AS formula_id, f.name AS formula_name,
            f.kg_per_sack, f.target_g_per_kg_body_day AS g_per_kg_body_day,
            i.quantity_sacks, i.last_resupply_date,
            (SELECT SUM(se.sacks_in_trough)
               FROM supplement_evals se JOIN rondas r ON r.id = se.ronda_id
              WHERE r.paddock_id = i.paddock_id
                AND se.formula_id = i.formula_id
                AND se.restocked = 1
                AND se.deleted_at IS NULL AND r.deleted_at IS NULL
                AND (i.last_resupply_date IS NULL OR r.date > i.last_resupply_date)
            ) AS used
     FROM inventory i
       JOIN formulas f ON f.id = i.formula_id
       JOIN paddocks p ON p.id = i.paddock_id
     WHERE i.location = 'bombona' AND p.active = 1
       AND (? IS NULL OR i.paddock_id = ?)
     ORDER BY p.name, f.name`,
    [paddockId ?? null, paddockId ?? null]
  );

  const today = todayIsoDate();
  return rows.map((r) => {
    const usedSacks = r.used ?? 0;
    const raw = r.quantity_sacks - usedSacks;
    return {
      inventoryId: r.inventory_id,
      paddockId: r.paddock_id,
      paddockName: r.paddock_name,
      formulaId: r.formula_id,
      formulaName: r.formula_name,
      kgPerSack: r.kg_per_sack,
      gPerKgBodyDay: r.g_per_kg_body_day,
      balanceSacks: r.quantity_sacks,
      balanceDate: r.last_resupply_date,
      daysSince: daysBetween(r.last_resupply_date, today),
      usedSacks,
      expectedSacks: Math.max(0, Math.round(raw * 2) / 2),
      ledgerNegative: raw < 0,
    };
  });
}

export interface SettledBombona {
  inventoryId: number;
  /** Saldo real após liquidar o consumo pendente (sem arredondar, piso 0). */
  expectedSacks: number;
}

/**
 * Liquida o consumo pendente de uma bombona ANTES de qualquer escrita de saldo.
 *
 * O que "liquidar" significa: os sacos que a Suplementação tirou desde a âncora
 * viram um evento `CONSUMO_COCHO` (o servidor deriva o saldo da soma dos
 * eventos — sem o evento, o débito não existe lá), o saldo local desce pro
 * valor real e a âncora anda pra hoje.
 *
 * Por que antes de escrever: a entrega da rota fazia `novo = saldo_bruto +
 * entregue` e re-ancorava — o consumo desde a âncora anterior era descartado e
 * o saldo inflava a cada ciclo (bug reportado em 09/2026: "a contagem da
 * bombona não conta corretamente"). Qualquer fluxo que re-ancora sem liquidar
 * repete esse bug; este helper é a única porta pra isso.
 *
 * Devolve null quando o piquete não tem bombona dessa fórmula (nada a liquidar).
 */
export async function settleBombona(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
  formulaId: number,
  userId: string | null,
): Promise<SettledBombona | null> {
  const row = await db.getFirstAsync<{ id: number; quantity_sacks: number; last_resupply_date: string | null }>(
    `SELECT id, quantity_sacks, last_resupply_date FROM inventory
     WHERE location = 'bombona' AND paddock_id = ? AND formula_id = ?`,
    [paddockId, formulaId]
  );
  if (!row) return null;

  const usedRow = await db.getFirstAsync<{ used: number | null }>(
    `SELECT SUM(se.sacks_in_trough) AS used
       FROM supplement_evals se JOIN rondas r ON r.id = se.ronda_id
      WHERE r.paddock_id = ? AND se.formula_id = ? AND se.restocked = 1
        AND se.deleted_at IS NULL AND r.deleted_at IS NULL
        AND (? IS NULL OR r.date > ?)`,
    [paddockId, formulaId, row.last_resupply_date, row.last_resupply_date]
  );
  const used = usedRow?.used ?? 0;
  const expected = Math.max(0, row.quantity_sacks - used);
  const delta = expected - row.quantity_sacks;

  if (delta !== 0) {
    await db.runAsync(
      `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
       VALUES ('CONSUMO_COCHO', ?, ?, ?, ?, ?)`,
      [formulaId, paddockId, delta, 'Suplementação desde a última âncora', userId]
    );
  }
  // Âncora SEMPRE anda pra hoje, mesmo com delta 0: quem chamou vai escrever
  // saldo/eventos referentes a hoje, e uma avaliação de hoje com âncora antiga
  // seria contada de novo pelo `r.date > âncora` (débito em dobro).
  await db.runAsync(
    `UPDATE inventory SET quantity_sacks = ?, last_resupply_date = date('now','localtime') WHERE id = ?`,
    [expected, row.id]
  );
  return { inventoryId: row.id, expectedSacks: expected };
}

/**
 * Consumo MEDIDO em kg/dia por (piquete, fórmula), a partir dos abastecimentos
 * do ledger da Suplementação — mesma âncora conceitual do `supplementRate` da
 * Ficha do Piquete: soma tudo menos o último abastecimento (ainda no cocho)
 * dividido pelo intervalo entre o primeiro e o último.
 *
 * Janela: últimos 60 dias, cortada no último `herd_event` que tocou o piquete
 * (entrada/saída de lote muda o consumo — medir através da troca leria o lote
 * anterior). Precisa de ≥2 datas de abastecimento dentro da janela; sem isso a
 * chave não aparece no mapa e o chamador cai no alvo por cabeça.
 */
export async function loadMeasuredConsumption(
  db: SQLite.SQLiteDatabase,
): Promise<Map<string, number>> {
  const lotBoundRows = await db.getAllAsync<{ paddock_id: number; last: string }>(
    `SELECT paddock_id, MAX(date) AS last FROM (
       SELECT paddock_id, date FROM herd_events WHERE paddock_id IS NOT NULL AND deleted_at IS NULL
       UNION ALL
       SELECT target_paddock_id AS paddock_id, date FROM herd_events WHERE target_paddock_id IS NOT NULL AND deleted_at IS NULL
     ) GROUP BY paddock_id`
  );
  const lotBound = new Map<number, string>();
  for (const r of lotBoundRows) lotBound.set(r.paddock_id, r.last);

  const fills = await db.getAllAsync<{ paddock_id: number; formula_id: number; d: string; kg: number }>(
    `SELECT r.paddock_id, se.formula_id, r.date AS d,
            SUM(se.sacks_in_trough * f.kg_per_sack) AS kg
       FROM supplement_evals se
       JOIN rondas r ON r.id = se.ronda_id
       JOIN formulas f ON f.id = se.formula_id
      WHERE se.restocked = 1 AND se.sacks_in_trough > 0
        AND se.deleted_at IS NULL AND r.deleted_at IS NULL
        AND r.date >= date('now','localtime','-60 days')
      GROUP BY r.paddock_id, se.formula_id, r.date
      ORDER BY r.paddock_id, se.formula_id, r.date`
  );

  const byKey = new Map<string, Array<{ d: string; kg: number }>>();
  for (const f of fills) {
    const bound = lotBound.get(f.paddock_id);
    if (bound && f.d < bound) continue;
    const key = `${f.paddock_id}:${f.formula_id}`;
    const arr = byKey.get(key) || [];
    arr.push({ d: f.d, kg: f.kg });
    byKey.set(key, arr);
  }

  const out = new Map<string, number>();
  for (const [key, rows] of byKey) {
    if (rows.length < 2) continue;
    const span = daysBetween(rows[0].d, rows[rows.length - 1].d);
    if (span <= 0) continue;
    const kgCounted = rows.slice(0, -1).reduce((s, r) => s + r.kg, 0);
    if (kgCounted <= 0) continue;
    out.set(key, kgCounted / span);
  }
  return out;
}

/**
 * Total de passos do wizard de Bombona — depende das respostas, porque os
 * caminhos têm comprimentos diferentes: bombona vazia encerra no resumo,
 * fórmula sem registro pula a confirmação, e só quem discorda do sistema chega
 * na contagem manual.
 */
export function bombonaTotalSteps(b: {
  hasStock: boolean | null;
  expected: BombonaExpectation | null;
  matchesExpected: boolean | null;
}): number {
  if (!b.hasStock) return 2;
  if (!b.expected) return 4;
  return b.matchesExpected === false ? 5 : 4;
}
