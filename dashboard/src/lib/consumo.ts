import 'server-only';

import { sbList, sbListAll } from './supabase/client';
import {
  addDaysIso,
  calcularCabecasDia,
  diffDays,
  hojeBRT,
  loteKey,
  somaCustos,
  type HerdEventRow,
  type HerdRow,
} from './consumo-calc';
import { KG_PESO_VIVO_POR_ARROBA, PESO_PADRAO_KG } from './precos-racao';
import { custoMedioNaData, diaBRT } from './custo-racao';
import { loadSerieCusto } from './precos';
import type { Period } from './period';

// Consumo de ração por período móvel: quanto foi posto no cocho, quantas
// cabeças-dia havia ali, quanto cada cabeça consumiu, quanto ganhou em @ e
// quanto custou a arroba.
//
// Fonte do consumo: `supplement_evals` com `restocked = true` — no app o passo é
// literalmente "Quantos sacos colocou no cocho?". `resupply_deliveries` é a etapa
// anterior (abastecer a bombona do talhão); somar as duas contaria em dobro.
//
// IDs no banco são UUID (os tipos em supabase/types.ts declaram number — legado).

interface PaddockRow {
  id: string;
  name: string;
  area_hectares: number;
  active: boolean;
}

interface FormulaRow {
  id: string;
  name: string;
  kg_per_sack: number;
}

interface InventoryEventRow {
  formula_id: string;
  sacks_delta: number;
}

interface RondaRow {
  id: string;
  paddock_id: string;
}

interface SupplementRow {
  ronda_id: string;
  formula_id: string | null;
  sacks_in_trough: number | null;
  restocked: boolean;
  created_at: string;
}

interface WeightRow {
  ronda_id: string;
  category: string;
  estimated_weight_kg: number;
  previous_weight_kg: number | null;
  previous_date: string | null;
  created_at: string;
}

export interface ConsumoFormula {
  formulaId: string;
  formulaName: string;
  sacos: number;
  kg: number;
  /** null = fórmula sem preço em precos-racao.ts */
  custo: number | null;
}

/** Confronto entre o que saiu do almoxarifado e o que foi registrado no cocho. */
export interface CoberturaFormula {
  formulaName: string;
  saidaEstoque: number;
  registradoNoCocho: number;
  /** null quando não houve saída de estoque no período. */
  cobertura: number | null;
}

export interface LoteConsumo {
  key: string;
  paddockId: string;
  paddockName: string;
  category: string;
  /** Soma das cabeças presentes em cada dia do período. */
  cabecasDia: number;
  cabecasMedias: number;
  pesoMedioKg: number;
  /** Fatia do consumo do talhão atribuída a este lote (peso vivo). */
  fracao: number;
  sacos: number;
  kg: number;
  custo: number | null;
  gPorCabDia: number | null;
  gmd: number | null;
  arrobas: number | null;
  custoPorArroba: number | null;
}

export interface PiqueteConsumo {
  paddockId: string;
  paddockName: string;
  areaHectares: number;
  cabecasDia: number;
  cabecasMedias: number;
  formulas: ConsumoFormula[];
  sacos: number;
  kg: number;
  custo: number | null;
  gPorCabDia: number | null;
  /** Consumo como % do peso vivo do talhão — g de ração por kg de PV por dia. */
  gPorKgPvDia: number | null;
  gmd: number | null;
  arrobas: number | null;
  custoPorArroba: number | null;
  lotes: LoteConsumo[];
}

export interface ConsumoData {
  period: Period;
  /** Dias efetivamente contabilizados (o período é cortado em "hoje"). */
  dias: number;
  porFormula: ConsumoFormula[];
  piquetes: PiqueteConsumo[];
  kpis: {
    sacos: number;
    kg: number;
    custo: number | null;
    cabecasDia: number;
    cabecasMedias: number;
    gPorCabDia: number | null;
    arrobas: number | null;
    custoPorArroba: number | null;
    piquetesComConsumo: number;
    piquetesComGmd: number;
    /** Talhões que têm ração E peso visual — os únicos que entram no R$/@. */
    piquetesComCustoPorArroba: number;
  };
  /** Fórmulas consumidas no período que estão sem preço cadastrado. */
  formulasSemPreco: string[];
  /** Saída de estoque × registro de cocho, por fórmula que teve um ou outro. */
  cobertura: CoberturaFormula[];
  avisos: string[];
}

// ----------------------------------------------------------------------------

export async function loadConsumoData(period: Period, accessToken?: string): Promise<ConsumoData> {
  const hoje = hojeBRT();
  // Não dá pra contar dias que ainda não aconteceram.
  const fim = period.end > hoje ? hoje : period.end;
  const inicio = period.start > fim ? fim : period.start;
  const dias = diffDays(fim, inicio) + 1;

  const startIso = `${inicio}T00:00:00-03:00`;
  const endIso = `${fim}T23:59:59-03:00`;
  const auth = { accessToken };
  const janela = { created_at: `gte.${startIso}`, and: `(created_at.lte.${endIso},deleted_at.is.null)` };

  // Dispara junto com o resto; só é consumida depois de montar o consumo.
  const serieCustoPromise = loadSerieCusto(accessToken);

  const [paddocks, formulas, herd, rondas, herdEvents, supplements, weights, saidasEstoque] = await Promise.all([
    sbList<PaddockRow>('paddocks', { ...auth, select: 'id,name,area_hectares,active', order: 'name' }),
    sbList<FormulaRow>('formulas', { ...auth, select: 'id,name,kg_per_sack' }),
    sbList<HerdRow>('herd', {
      ...auth,
      select: 'paddock_id,category,head_count,avg_weight_kg',
      filters: { deleted_at: 'is.null' },
    }),
    // Sem filtro de data: a ronda de um eval pode ter sido sincronizada com
    // atraso e cair fora da janela. São poucos milhares de linhas de 2 colunas.
    sbListAll<RondaRow>('rondas', {
      ...auth,
      select: 'id,paddock_id',
      filters: { deleted_at: 'is.null' },
      order: 'id',
    }),
    // Replay reverso precisa de TODO evento entre o início do período e hoje.
    sbListAll<HerdEventRow>('herd_events', {
      ...auth,
      select: 'paddock_id,target_paddock_id,event_type,category,head_count,notes,date',
      filters: { date: `gte.${inicio}`, deleted_at: 'is.null' },
      order: 'date,id',
    }),
    sbListAll<SupplementRow>('supplement_evals', {
      ...auth,
      select: 'ronda_id,formula_id,sacks_in_trough,restocked,created_at',
      filters: { ...janela, restocked: 'is.true' },
      order: 'created_at,id',
    }),
    sbListAll<WeightRow>('visual_weight_evals', {
      ...auth,
      select: 'ronda_id,category,estimated_weight_kg,previous_weight_kg,previous_date,created_at',
      filters: janela,
      order: 'created_at,id',
    }),
    // Baixa de estoque no período — serve de contraprova do registro de cocho.
    sbListAll<InventoryEventRow>('inventory_events', {
      ...auth,
      select: 'formula_id,sacks_delta',
      filters: { ...janela, sacks_delta: 'lt.0' },
      order: 'created_at,id',
    }),
  ]);

  const avisos: string[] = [];
  const paddockById = new Map(paddocks.map((p) => [p.id, p]));
  const formulaById = new Map(formulas.map((f) => [f.id, f]));
  const paddockDaRonda = new Map(rondas.map((r) => [r.id, r.paddock_id]));

  // ---------- Cabeças-dia por (talhão, categoria) ----------
  const { cabecasDia, evolucoesSemDestino, eventosDuplicados } =
    calcularCabecasDia(herd, herdEvents, inicio, fim, hoje);
  if (evolucoesSemDestino > 0) {
    avisos.push(
      `${evolucoesSemDestino} evento(s) de evolução sem categoria de destino legível — ` +
      'a divisão entre lotes desses talhões pode estar deslocada (o total do talhão não muda).',
    );
  }
  if (eventosDuplicados > 0) {
    avisos.push(
      `${eventosDuplicados} movimentação(ões) de rebanho vieram duplicadas do sync do app e foram ` +
      'contadas uma vez só. É o mesmo bug de duplicação já reportado no app — a origem segue por corrigir.',
    );
  }

  // ---------- Peso médio e GMD por (talhão, categoria) ----------
  const pesoVisual = new Map<string, number>();
  const gmdPorLote = new Map<string, { soma: number; n: number }>();
  for (const w of weights) {
    const pid = paddockDaRonda.get(w.ronda_id);
    if (!pid) continue;
    const key = loteKey(pid, w.category);
    pesoVisual.set(key, w.estimated_weight_kg); // ordenado por created_at → fica o mais recente
    if (w.previous_weight_kg != null && w.previous_date) {
      const intervalo = diffDays(w.created_at.slice(0, 10), w.previous_date);
      if (intervalo > 0) {
        const cur = gmdPorLote.get(key) ?? { soma: 0, n: 0 };
        cur.soma += (w.estimated_weight_kg - w.previous_weight_kg) / intervalo;
        cur.n += 1;
        gmdPorLote.set(key, cur);
      }
    }
  }

  const pesoDoHerd = new Map<string, number>();
  for (const h of herd) {
    if (!h.paddock_id || !h.avg_weight_kg || h.avg_weight_kg <= 0) continue;
    pesoDoHerd.set(loteKey(h.paddock_id, h.category), h.avg_weight_kg);
  }

  function pesoMedioKg(paddockId: string, category: string): number {
    const key = loteKey(paddockId, category);
    return pesoVisual.get(key) ?? pesoDoHerd.get(key) ?? PESO_PADRAO_KG[category] ?? 400;
  }

  function gmdDoLote(paddockId: string, category: string): number | null {
    const g = gmdPorLote.get(loteKey(paddockId, category));
    return g && g.n > 0 ? g.soma / g.n : null;
  }

  // ---------- Consumo por (talhão, fórmula) ----------
  // Cada reposição é custeada pelo custo médio vigente NA DATA em que aconteceu:
  // uma compra de hoje não pode reprecificar o que foi consumido semana passada.
  const serieCusto = await serieCustoPromise;
  const consumoPorPiquete = new Map<string, Map<string, { sacos: number; kg: number; custo: number | null }>>();
  let evalsSemVinculo = 0;
  for (const s of supplements) {
    const pid = paddockDaRonda.get(s.ronda_id);
    const sacos = s.sacks_in_trough ?? 0;
    if (!pid || !s.formula_id || sacos <= 0) {
      if (sacos > 0) evalsSemVinculo += 1;
      continue;
    }
    const formula = formulaById.get(s.formula_id);
    if (!formula) continue;
    const porFormula = consumoPorPiquete.get(pid) ?? new Map();
    const cur = porFormula.get(s.formula_id) ?? { sacos: 0, kg: 0, custo: 0 as number | null };
    cur.sacos += sacos;
    cur.kg += sacos * formula.kg_per_sack;
    const custoMedio = custoMedioNaData(serieCusto, s.formula_id, diaBRT(s.created_at));
    if (custoMedio == null) cur.custo = null;
    else if (cur.custo != null) cur.custo += sacos * custoMedio;
    porFormula.set(s.formula_id, cur);
    consumoPorPiquete.set(pid, porFormula);
  }
  if (evalsSemVinculo > 0) {
    avisos.push(`${evalsSemVinculo} reposição(ões) sem fórmula ou sem talhão — ficaram de fora do cálculo.`);
  }

  // ---------- Montagem por talhão ----------
  const piquetes: PiqueteConsumo[] = [];
  const idsComMovimento = new Set<string>([
    ...consumoPorPiquete.keys(),
    ...Array.from(cabecasDia.keys()).map((k) => k.split('|')[0]!),
  ]);

  for (const paddockId of idsComMovimento) {
    const paddock = paddockById.get(paddockId);
    if (!paddock) continue;

    const consumo = consumoPorPiquete.get(paddockId);
    const lotesDoPiquete = Array.from(cabecasDia.entries())
      .filter(([k, v]) => k.startsWith(`${paddockId}|`) && v > 0)
      .map(([k, v]) => ({ category: k.slice(paddockId.length + 1), cabDia: v }));

    const cabecasDiaPiquete = lotesDoPiquete.reduce((s, l) => s + l.cabDia, 0);
    if (!consumo && cabecasDiaPiquete === 0) continue;

    const formulasDoPiquete: ConsumoFormula[] = Array.from(consumo?.entries() ?? []).map(([fid, v]) => ({
      formulaId: fid,
      formulaName: formulaById.get(fid)?.name ?? '—',
      sacos: v.sacos,
      kg: v.kg,
      custo: v.custo,
    })).sort((a, b) => b.kg - a.kg);

    const sacos = formulasDoPiquete.reduce((s, f) => s + f.sacos, 0);
    const kg = formulasDoPiquete.reduce((s, f) => s + f.kg, 0);
    const custo = somaCustos(formulasDoPiquete.map((f) => f.custo));

    // Rateio entre lotes proporcional ao peso vivo acumulado (cab-dia × peso médio).
    const pesoVivoDia = lotesDoPiquete.map((l) => ({
      ...l,
      pesoMedio: pesoMedioKg(paddockId, l.category),
      pv: l.cabDia * pesoMedioKg(paddockId, l.category),
    }));
    const pvTotal = pesoVivoDia.reduce((s, l) => s + l.pv, 0);

    const lotes: LoteConsumo[] = pesoVivoDia.map((l) => {
      const fracao = pvTotal > 0 ? l.pv / pvTotal : 0;
      const loteSacos = sacos * fracao;
      const loteKg = kg * fracao;
      const loteCusto = custo == null ? null : custo * fracao;
      const gmd = gmdDoLote(paddockId, l.category);
      const arrobas = gmd == null ? null : (gmd * l.cabDia) / KG_PESO_VIVO_POR_ARROBA;
      return {
        key: loteKey(paddockId, l.category),
        paddockId,
        paddockName: paddock.name,
        category: l.category,
        cabecasDia: l.cabDia,
        cabecasMedias: l.cabDia / dias,
        pesoMedioKg: l.pesoMedio,
        fracao,
        sacos: loteSacos,
        kg: loteKg,
        custo: loteCusto,
        gPorCabDia: l.cabDia > 0 ? (loteKg * 1000) / l.cabDia : null,
        gmd,
        arrobas,
        custoPorArroba: loteCusto != null && arrobas != null && arrobas > 0 ? loteCusto / arrobas : null,
      };
    }).sort((a, b) => b.cabecasDia - a.cabecasDia);

    // @ e R$/@ do talhão saem só dos lotes com peso visual medido — misturar
    // lote sem GMD no denominador inventaria arroba que ninguém pesou.
    const lotesComGmd = lotes.filter((l) => l.arrobas != null);
    const arrobasPiquete = lotesComGmd.length > 0
      ? lotesComGmd.reduce((s, l) => s + (l.arrobas ?? 0), 0)
      : null;
    const custoComGmd = lotesComGmd.length > 0 ? somaCustos(lotesComGmd.map((l) => l.custo)) : null;
    const gmdPiquete = lotesComGmd.length > 0
      ? lotesComGmd.reduce((s, l) => s + (l.gmd ?? 0) * l.cabecasDia, 0) /
        lotesComGmd.reduce((s, l) => s + l.cabecasDia, 0)
      : null;

    piquetes.push({
      paddockId,
      paddockName: paddock.name,
      areaHectares: paddock.area_hectares,
      cabecasDia: cabecasDiaPiquete,
      cabecasMedias: cabecasDiaPiquete / dias,
      formulas: formulasDoPiquete,
      sacos,
      kg,
      custo,
      gPorCabDia: cabecasDiaPiquete > 0 && kg > 0 ? (kg * 1000) / cabecasDiaPiquete : null,
      gPorKgPvDia: pvTotal > 0 && kg > 0 ? (kg * 1000) / pvTotal : null,
      gmd: gmdPiquete,
      arrobas: arrobasPiquete,
      custoPorArroba:
        custoComGmd != null && arrobasPiquete != null && arrobasPiquete > 0
          ? custoComGmd / arrobasPiquete
          : null,
      lotes,
    });
  }

  piquetes.sort((a, b) => b.kg - a.kg || a.paddockName.localeCompare(b.paddockName, 'pt-BR'));

  // ---------- Totais por fórmula ----------
  const totalPorFormula = new Map<string, ConsumoFormula>();
  for (const p of piquetes) {
    for (const f of p.formulas) {
      const cur = totalPorFormula.get(f.formulaId);
      if (cur) {
        cur.sacos += f.sacos;
        cur.kg += f.kg;
        cur.custo = somaCustos([cur.custo, f.custo]);
      } else {
        totalPorFormula.set(f.formulaId, { ...f });
      }
    }
  }
  const porFormula = Array.from(totalPorFormula.values()).sort((a, b) => b.kg - a.kg);

  // ---------- KPIs da fazenda ----------
  const comConsumo = piquetes.filter((p) => p.kg > 0);
  const sacosTotal = porFormula.reduce((s, f) => s + f.sacos, 0);
  const kgTotal = porFormula.reduce((s, f) => s + f.kg, 0);
  const custoTotal = somaCustos(porFormula.map((f) => f.custo));
  const cabecasDiaTotal = piquetes.reduce((s, p) => s + p.cabecasDia, 0);
  // Denominador do g/cab/dia = só quem recebeu ração; senão o pasto sem cocho dilui.
  const cabecasDiaComConsumo = comConsumo.reduce((s, p) => s + p.cabecasDia, 0);
  const comGmd = piquetes.filter((p) => p.arrobas != null);
  const arrobasTotal = comGmd.length > 0 ? comGmd.reduce((s, p) => s + (p.arrobas ?? 0), 0) : null;
  // R$/@ da fazenda só pode cruzar talhão que tem AS DUAS pontas: ração posta no
  // cocho e peso visual medido. Somar a arroba de um confinamento sem reposição
  // no período com o custo de outro talhão produziria um R$/@ fantasia.
  const comAmbos = piquetes.filter((p) => p.arrobas != null && p.kg > 0);
  const arrobasComAmbos = comAmbos.reduce((s, p) => s + (p.arrobas ?? 0), 0);
  const custoComAmbos = somaCustos(
    comAmbos.flatMap((p) => p.lotes.filter((l) => l.arrobas != null).map((l) => l.custo)),
  );

  // Fórmula consumida cujo custo não pôde ser apurado — falta preço de compra
  // lançado antes daquela reposição.
  const formulasSemPreco = porFormula.filter((f) => f.custo == null).map((f) => f.formulaName);

  // ---------- Cobertura: saída de estoque × registro de cocho ----------
  const saidaPorFormula = new Map<string, number>();
  for (const ev of saidasEstoque) {
    saidaPorFormula.set(ev.formula_id, (saidaPorFormula.get(ev.formula_id) ?? 0) - ev.sacks_delta);
  }
  const cochoPorFormula = new Map(porFormula.map((f) => [f.formulaId, f.sacos]));
  const cobertura: CoberturaFormula[] = Array.from(
    new Set([...saidaPorFormula.keys(), ...cochoPorFormula.keys()]),
  ).map((fid) => {
    const saidaEstoque = saidaPorFormula.get(fid) ?? 0;
    const registradoNoCocho = cochoPorFormula.get(fid) ?? 0;
    return {
      formulaName: formulaById.get(fid)?.name ?? '—',
      saidaEstoque,
      registradoNoCocho,
      cobertura: saidaEstoque > 0 ? registradoNoCocho / saidaEstoque : null,
    };
  }).sort((a, b) => b.saidaEstoque - a.saidaEstoque);

  return {
    period,
    dias,
    porFormula,
    piquetes,
    kpis: {
      sacos: sacosTotal,
      kg: kgTotal,
      custo: custoTotal,
      cabecasDia: cabecasDiaTotal,
      cabecasMedias: cabecasDiaTotal / dias,
      gPorCabDia: cabecasDiaComConsumo > 0 ? (kgTotal * 1000) / cabecasDiaComConsumo : null,
      arrobas: arrobasTotal,
      custoPorArroba:
        custoComAmbos != null && arrobasComAmbos > 0 ? custoComAmbos / arrobasComAmbos : null,
      piquetesComCustoPorArroba: comAmbos.length,
      piquetesComConsumo: comConsumo.length,
      piquetesComGmd: comGmd.length,
    },
    formulasSemPreco,
    cobertura,
    avisos,
  };
}
