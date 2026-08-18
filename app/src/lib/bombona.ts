import type * as SQLite from 'expo-sqlite';

// Quanto DEVERIA ter na bombona (reservatório do cocho) de um piquete.
//
// `inventory` guarda o que a rota ENTREGOU e nada nunca debita: a ronda de
// Suplementação registra os sacos que foram pro cocho, mas esses sacos saem da
// bombona e ninguém subtrai. Então o saldo gravado é o da última entrega, não o
// de hoje.
//
// A conta aqui fecha essa lacuna pelo próprio ledger da ronda:
//
//     deveria ter = saldo da última entrega − sacos que a Suplementação tirou desde então
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
