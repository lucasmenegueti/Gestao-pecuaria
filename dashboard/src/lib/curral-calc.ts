// Operações de curral (app curral-nsa): síntese por sessão e ficha animal a animal.
// Funções puras, sem I/O — testáveis fora do Next.

/**
 * Primeiro dia de operação real. Antes disso o banco do Curral só tem a base
 * de teste semeada (ids `c0000000-…`) e os testes do Lucas de 20–22/09.
 */
export const INICIO_OPERACAO_REAL = '2026-09-23';

/** Intervalo entre dois bipes acima disto conta como pausa, não como ritmo. */
export const PAUSA_MS = 15 * 60_000;

/** Peso fora desta faixa é erro de digitação (ex.: 9.820 kg) — fica fora das médias. */
export const PESO_MIN_KG = 30;
export const PESO_MAX_KG = 1200;

export const OP_ORDER = ['pesagem', 'apartacao', 'entrada', 'venda', 'iatf', 'exame'] as const;

export const OP_LABELS: Record<string, string> = {
  pesagem: 'Pesagem',
  apartacao: 'Apartação',
  entrada: 'Entrada',
  venda: 'Venda',
  iatf: 'IATF',
  exame: 'Exame',
};

export const IATF_STAGE_LABELS: Record<string, string> = {
  implante: 'Implante',
  protocolo: 'Protocolo',
  inseminacao: 'Inseminação',
  diagnostico: 'DG',
  dg_final: 'DG final',
};

export const OVARY_LABELS: Record<string, string> = {
  CL: 'Corpo lúteo',
  FOLICULO: 'Folículo',
  ANESTRO: 'Anestro',
};

export interface SessaoRow {
  id: string;
  date: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  ops: string | null;
  lot_id: string | null;
  protocol_name: string | null;
  protocol_items: string | null;
  iatf_stage: string | null;
  default_category: string | null;
  buyer: string | null;
  vet: string | null;
  origin: string | null;
  sale_head_count: number | null;
  sale_total_kg: number | null;
  user_id: string | null;
  notes: string | null;
}

export interface PassagemRow {
  id: string;
  session_id: string;
  animal_id: string;
  event_at: string;
  eid: string | null;
  weight_kg: number | null;
  from_lot_id: string | null;
  to_lot_id: string | null;
  iatf_result: string | null;
  ovary_status: string | null;
  /** numeric no Postgres — PostgREST pode devolver como string. */
  body_score: number | string | null;
  exam_notes: string | null;
  notes: string | null;
  prev_state: string | null;
}

export interface AnimalRow {
  id: string;
  eid: string | null;
  category: string | null;
}

export interface Tempos {
  /** Primeiro e último bipe — o trabalho de fato, não a abertura/fechamento no app. */
  inicio: string | null;
  fim: string | null;
  duracaoMs: number;
  /** Duração menos as pausas longas. */
  ativoMs: number;
  pausas: number;
  pausaMs: number;
  /** Mediana dos intervalos entre bipes, sem as pausas. */
  ritmoSeg: number | null;
  /** Intervalos válidos — para a mediana geral. */
  intervalosSeg: number[];
}

export interface SessaoResumo {
  sessao: SessaoRow;
  ops: string[];
  animais: number;
  novos: number;
  /** Animal que já existia e saiu de um lote para outro. */
  mudaramLote: number;
  comPeso: number;
  pesoMedio: number | null;
  pesoMin: number | null;
  pesoMax: number | null;
  /** Pesos fora de [PESO_MIN_KG, PESO_MAX_KG], fora das médias. */
  pesosSuspeitos: number;
  /** Animais com pesagem anterior em outra sessão. */
  comPesagemAnterior: number;
  ganhoMedioKg: number | null;
  gmdMedio: number | null;
  tempos: Tempos;
  /** Categoria ATUAL do animal (o evento não grava a da data). */
  categorias: Array<{ categoria: string; n: number }>;
  destinos: Array<{ lotId: string | null; n: number }>;
  prenhas: number;
  vazias: number;
  ovarios: Array<{ status: string; n: number }>;
  eccMedio: number | null;
  comEcc: number;
  exames: number;
}

export interface PassagemDetalhe {
  ordem: number;
  passagem: PassagemRow;
  categoria: string | null;
  novo: boolean;
  pesoValido: boolean;
  /** Segundos desde o bipe anterior da mesma sessão. */
  intervaloSeg: number | null;
  anterior: { pesoKg: number; data: string; dias: number; ganhoKg: number; gmd: number | null } | null;
}

export interface CurralCenario {
  sessoes: SessaoResumo[];
  /** Sessões de teste (antes de INICIO_OPERACAO_REAL) e canceladas, não mostradas. */
  ocultas: number;
  totais: {
    sessoes: number;
    passagens: number;
    animaisDistintos: number;
    ativoMs: number;
    ritmoSeg: number | null;
    pesosSuspeitos: number;
  };
}

export function opsDe(s: SessaoRow): string[] {
  const set = new Set((s.ops ?? '').split(',').map((o) => o.trim()).filter(Boolean));
  return [...OP_ORDER.filter((o) => set.has(o)), ...[...set].filter((o) => !(OP_ORDER as readonly string[]).includes(o))];
}

export function ehNovo(p: PassagemRow): boolean {
  if (!p.prev_state) return false;
  try {
    return JSON.parse(p.prev_state)?.novo === true;
  } catch {
    return false;
  }
}

export function pesoValido(kg: number | null): kg is number {
  return kg != null && kg >= PESO_MIN_KG && kg <= PESO_MAX_KG;
}

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function media(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function contar<K>(xs: K[]): Array<{ k: K; n: number }> {
  const m = new Map<K, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
}

export function calcularTempos(passagens: PassagemRow[]): Tempos {
  const ts = passagens.map((p) => Date.parse(p.event_at)).sort((a, b) => a - b);
  if (ts.length === 0) {
    return { inicio: null, fim: null, duracaoMs: 0, ativoMs: 0, pausas: 0, pausaMs: 0, ritmoSeg: null, intervalosSeg: [] };
  }
  let pausas = 0;
  let pausaMs = 0;
  const intervalosSeg: number[] = [];
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i]! - ts[i - 1]!;
    if (d > PAUSA_MS) {
      pausas++;
      pausaMs += d;
    } else {
      intervalosSeg.push(d / 1000);
    }
  }
  const primeiro = ts[0]!;
  const ultimo = ts[ts.length - 1]!;
  const duracaoMs = ultimo - primeiro;
  return {
    inicio: new Date(primeiro).toISOString(),
    fim: new Date(ultimo).toISOString(),
    duracaoMs,
    ativoMs: duracaoMs - pausaMs,
    pausas,
    pausaMs,
    ritmoSeg: mediana(intervalosSeg),
    intervalosSeg,
  };
}

/**
 * Pesagem anterior de cada passagem: a última com peso válido do mesmo animal,
 * em outra sessão e antes dela. Chave = id da passagem.
 */
export function pesagensAnteriores(todas: PassagemRow[]): Map<string, PassagemDetalhe['anterior']> {
  const porAnimal = new Map<string, PassagemRow[]>();
  for (const p of todas) {
    const l = porAnimal.get(p.animal_id) ?? [];
    l.push(p);
    porAnimal.set(p.animal_id, l);
  }
  const out = new Map<string, PassagemDetalhe['anterior']>();
  for (const lista of porAnimal.values()) {
    lista.sort((a, b) => a.event_at.localeCompare(b.event_at));
    for (let i = 0; i < lista.length; i++) {
      const atual = lista[i]!;
      if (!pesoValido(atual.weight_kg)) continue;
      for (let j = i - 1; j >= 0; j--) {
        const ant = lista[j]!;
        if (ant.session_id === atual.session_id || !pesoValido(ant.weight_kg)) continue;
        const dias = (Date.parse(atual.event_at) - Date.parse(ant.event_at)) / 86_400_000;
        const ganhoKg = atual.weight_kg - ant.weight_kg;
        out.set(atual.id, {
          pesoKg: ant.weight_kg,
          data: ant.event_at,
          dias: Math.round(dias),
          ganhoKg,
          gmd: dias >= 1 ? ganhoKg / dias : null,
        });
        break;
      }
    }
  }
  return out;
}

function resumir(
  sessao: SessaoRow,
  passagens: PassagemRow[],
  categoriaDe: Map<string, string | null>,
  anteriores: Map<string, PassagemDetalhe['anterior']>,
): SessaoResumo {
  const pesos = passagens.map((p) => p.weight_kg).filter(pesoValido);
  const ganhos = passagens.map((p) => anteriores.get(p.id)).filter((a): a is NonNullable<typeof a> => a != null);
  const ecc = passagens
    .map((p) => (p.body_score == null ? null : Number(p.body_score)))
    .filter((x): x is number => x != null && Number.isFinite(x));

  return {
    sessao,
    ops: opsDe(sessao),
    animais: passagens.length,
    novos: passagens.filter(ehNovo).length,
    mudaramLote: passagens.filter((p) => !ehNovo(p) && p.from_lot_id != null && p.from_lot_id !== p.to_lot_id).length,
    comPeso: pesos.length,
    pesoMedio: media(pesos),
    pesoMin: pesos.length ? Math.min(...pesos) : null,
    pesoMax: pesos.length ? Math.max(...pesos) : null,
    pesosSuspeitos: passagens.filter((p) => p.weight_kg != null && !pesoValido(p.weight_kg)).length,
    comPesagemAnterior: ganhos.length,
    ganhoMedioKg: media(ganhos.map((g) => g.ganhoKg)),
    gmdMedio: media(ganhos.map((g) => g.gmd).filter((x): x is number => x != null)),
    tempos: calcularTempos(passagens),
    categorias: contar(passagens.map((p) => categoriaDe.get(p.animal_id) ?? 'Sem categoria')).map(({ k, n }) => ({
      categoria: k,
      n,
    })),
    destinos: contar(passagens.map((p) => p.to_lot_id)).map(({ k, n }) => ({ lotId: k, n })),
    prenhas: passagens.filter((p) => p.iatf_result === 'PRENHA').length,
    vazias: passagens.filter((p) => p.iatf_result === 'VAZIA').length,
    ovarios: contar(passagens.map((p) => p.ovary_status).filter((x): x is string => !!x)).map(({ k, n }) => ({
      status: k,
      n,
    })),
    eccMedio: media(ecc),
    comEcc: ecc.length,
    exames: passagens.filter((p) => p.exam_notes?.trim()).length,
  };
}

export function ehSessaoReal(s: SessaoRow): boolean {
  return s.date >= INICIO_OPERACAO_REAL && s.status !== 'cancelada';
}

/**
 * Síntese das sessões reais. `todasPassagens` deve trazer o histórico inteiro
 * (não só o da janela), para achar a pesagem anterior de cada animal.
 */
export function calcularCenarioCurral(
  sessoes: SessaoRow[],
  todasPassagens: PassagemRow[],
  animais: AnimalRow[],
  janela?: { start: string; end: string },
): CurralCenario {
  const categoriaDe = new Map(animais.map((a) => [a.id, a.category]));
  const anteriores = pesagensAnteriores(todasPassagens);
  const porSessao = new Map<string, PassagemRow[]>();
  for (const p of todasPassagens) {
    const l = porSessao.get(p.session_id) ?? [];
    l.push(p);
    porSessao.set(p.session_id, l);
  }

  const reais = sessoes.filter(ehSessaoReal);
  const naJanela = janela ? reais.filter((s) => s.date >= janela.start && s.date <= janela.end) : reais;
  const resumos = naJanela
    .map((s) => resumir(s, porSessao.get(s.id) ?? [], categoriaDe, anteriores))
    .sort((a, b) => b.sessao.started_at.localeCompare(a.sessao.started_at));

  const animaisDistintos = new Set<string>();
  for (const r of resumos) for (const p of porSessao.get(r.sessao.id) ?? []) animaisDistintos.add(p.animal_id);

  return {
    sessoes: resumos,
    ocultas: sessoes.length - reais.length,
    totais: {
      sessoes: resumos.length,
      passagens: resumos.reduce((a, r) => a + r.animais, 0),
      animaisDistintos: animaisDistintos.size,
      ativoMs: resumos.reduce((a, r) => a + r.tempos.ativoMs, 0),
      ritmoSeg: mediana(resumos.flatMap((r) => r.tempos.intervalosSeg)),
      pesosSuspeitos: resumos.reduce((a, r) => a + r.pesosSuspeitos, 0),
    },
  };
}

/** Ficha animal a animal de uma sessão, na ordem dos bipes. */
export function detalharSessao(
  sessaoId: string,
  todasPassagens: PassagemRow[],
  animais: AnimalRow[],
): PassagemDetalhe[] {
  const categoriaDe = new Map(animais.map((a) => [a.id, a.category]));
  const anteriores = pesagensAnteriores(todasPassagens);
  const lista = todasPassagens
    .filter((p) => p.session_id === sessaoId)
    .sort((a, b) => a.event_at.localeCompare(b.event_at));
  return lista.map((p, i) => ({
    ordem: i + 1,
    passagem: p,
    categoria: categoriaDe.get(p.animal_id) ?? null,
    novo: ehNovo(p),
    pesoValido: pesoValido(p.weight_kg),
    intervaloSeg: i > 0 ? (Date.parse(p.event_at) - Date.parse(lista[i - 1]!.event_at)) / 1000 : null,
    anterior: anteriores.get(p.id) ?? null,
  }));
}
