import 'server-only';

import { sbList, sbListAll, sbUpsert } from './supabase/client';
import {
  calcularCustoMedio,
  ehCompraPorPadrao,
  ehEntradaDeMercadoria,
  type CustoRacaoResultado,
  type EstoqueEventoRow,
  type PrecoEntradaRow,
} from './custo-racao';

// Leitura e escrita dos preços de entrada de ração (aba Configurações).

interface FormulaRow {
  id: string;
  name: string;
  kg_per_sack: number;
}

export interface EntradaEstoque {
  eventId: string;
  formulaId: string;
  formulaName: string;
  kgPorSaco: number;
  sacos: number;
  data: string;
  eventType: string;
  reason: string | null;
  /** true = já classificada (preço informado ou marcada como não-compra). */
  classificada: boolean;
  isPurchase: boolean;
  precoPorSaco: number | null;
  /** Sugestão de classificação — ajuste de contagem não é compra por padrão. */
  compraPorPadrao: boolean;
}

export interface CustoFormula {
  formulaId: string;
  formulaName: string;
  kgPorSaco: number;
  custoMedio: number | null;
  custoPorKg: number | null;
  saldoSacos: number;
  /** Sacos em estoque sem custo conhecido — puxam o médio pra indefinido. */
  saldoSemCusto: number;
  valorEstoque: number | null;
  entradasPendentes: number;
}

export interface PrecosData {
  entradas: EntradaEstoque[];
  custos: CustoFormula[];
  pendentes: number;
  serie: CustoRacaoResultado['serie'];
}

async function carregarBase(accessToken?: string) {
  const auth = { accessToken };
  const [formulas, eventos, precos] = await Promise.all([
    sbList<FormulaRow>('formulas', { ...auth, select: 'id,name,kg_per_sack' }),
    // Todo o ledger do central desde o começo — o custo médio é acumulativo.
    sbListAll<EstoqueEventoRow>('inventory_events', {
      ...auth,
      select: 'id,formula_id,event_type,sacks_delta,reason,created_at',
      filters: { deleted_at: 'is.null', paddock_id: 'is.null' },
      order: 'created_at,id',
    }),
    sbListAll<PrecoEntradaRow>('inventory_entry_prices', {
      ...auth,
      select: 'inventory_event_id,is_purchase,price_per_sack',
      order: 'inventory_event_id',
    }),
  ]);
  return { formulas, eventos, precos };
}

/** Só a contagem de entradas sem preço — usada no badge do menu. */
export async function contarEntradasSemPreco(accessToken?: string): Promise<number> {
  const { eventos, precos } = await carregarBase(accessToken);
  return calcularCustoMedio(eventos, precos).pendentes.size;
}

/** Série de custo médio pronta pra custear consumo por data. */
export async function loadSerieCusto(accessToken?: string): Promise<CustoRacaoResultado['serie']> {
  const { eventos, precos } = await carregarBase(accessToken);
  return calcularCustoMedio(eventos, precos).serie;
}

export async function loadPrecosData(accessToken?: string): Promise<PrecosData> {
  const { formulas, eventos, precos } = await carregarBase(accessToken);
  const formulaById = new Map(formulas.map((f) => [f.id, f]));
  const precoPorEvento = new Map(precos.map((p) => [p.inventory_event_id, p]));

  const { atual, serie, pendentes } = calcularCustoMedio(eventos, precos);

  const entradas: EntradaEstoque[] = eventos
    .filter((e) => ehEntradaDeMercadoria(e.event_type, e.sacks_delta))
    .map((e) => {
      const preco = precoPorEvento.get(e.id);
      const formula = formulaById.get(e.formula_id);
      return {
        eventId: e.id,
        formulaId: e.formula_id,
        formulaName: formula?.name ?? '—',
        kgPorSaco: formula?.kg_per_sack ?? 0,
        sacos: e.sacks_delta,
        data: e.created_at,
        eventType: e.event_type,
        reason: e.reason,
        classificada: preco != null,
        isPurchase: preco?.is_purchase ?? ehCompraPorPadrao(e.event_type),
        precoPorSaco: preco?.price_per_sack ?? null,
        compraPorPadrao: ehCompraPorPadrao(e.event_type),
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));

  const pendentesPorFormula = new Map<string, number>();
  for (const e of entradas) {
    if (!e.classificada) {
      pendentesPorFormula.set(e.formulaId, (pendentesPorFormula.get(e.formulaId) ?? 0) + 1);
    }
  }

  const custos: CustoFormula[] = formulas
    .map((f) => {
      const st = atual.get(f.id);
      const saldo = st?.saldo ?? 0;
      const custoMedio = st?.custoMedio ?? null;
      return {
        formulaId: f.id,
        formulaName: f.name,
        kgPorSaco: f.kg_per_sack,
        custoMedio,
        custoPorKg: custoMedio != null && f.kg_per_sack > 0 ? custoMedio / f.kg_per_sack : null,
        saldoSacos: saldo,
        saldoSemCusto: Math.max(0, saldo - (st?.saldoCusteado ?? 0)),
        valorEstoque: st != null && st.saldoCusteado > 0 ? st.valor : null,
        entradasPendentes: pendentesPorFormula.get(f.id) ?? 0,
      };
    })
    .filter((c) => c.saldoSacos > 0 || c.custoMedio != null || c.entradasPendentes > 0)
    .sort((a, b) => b.saldoSacos - a.saldoSacos);

  return { entradas, custos, pendentes: pendentes.size, serie };
}

/** Grava (ou regrava) a classificação de preço de uma entrada de estoque. */
export async function salvarPrecoEntrada(
  args: { eventId: string; isPurchase: boolean; precoPorSaco: number | null; nota?: string | null },
  accessToken?: string,
): Promise<void> {
  await sbUpsert(
    'inventory_entry_prices',
    [{
      inventory_event_id: args.eventId,
      is_purchase: args.isPurchase,
      price_per_sack: args.isPurchase ? args.precoPorSaco : null,
      note: args.nota ?? null,
    }],
    { onConflict: 'inventory_event_id', accessToken },
  );
}
