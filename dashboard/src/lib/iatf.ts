import 'server-only';

import { sbList, sbListAll, type SbConn } from './supabase/client';
import { INICIO_OPERACAO_REAL, type PassagemRow } from './curral-calc';
import {
  calcularCenarioIatf,
  dedupePassagens,
  ehSessaoValida,
  estacaoAtual,
  estacoesDisponiveis,
  type CenarioIatf,
  type IatfAnimalRow,
  type IatfEventoRow,
  type IatfSessaoRow,
  type TouroRow,
} from './iatf-calc';

// Mesmo banco do Curral (CURRAL_SUPABASE_URL) e o mesmo token da aba Curral.
function conn(): SbConn | null {
  const url = process.env.CURRAL_SUPABASE_URL;
  const anonKey = process.env.CURRAL_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export interface IatfData {
  cenario: CenarioIatf;
  loteNome: Map<string, string>;
  touros: TouroRow[];
  /** Passagens com peso (todas as sessões válidas), para o GMD do lote. */
  pesagens: PassagemRow[];
}

/** Hoje no relógio de Brasília. */
export function hojeBrt(): string {
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export async function loadIatfData(accessToken: string, estacao: string | null): Promise<IatfData | null> {
  const c = conn();
  if (!c) return null;
  const q = { conn: c, accessToken };

  const [sessoes, eventos, animais, lotes, touros] = await Promise.all([
    sbListAll<IatfSessaoRow>('curral_sessions', {
      ...q,
      select: 'id,date,lot_id,status,ops,iatf_stage,vet',
      filters: { deleted_at: 'is.null' },
      order: 'started_at,id',
    }),
    // Etapas de IATF e pesagens (GMD do lote) — o resto das passagens não interessa aqui.
    sbListAll<IatfEventoRow>('animal_events', {
      ...q,
      select: 'id,session_id,animal_id,event_at,iatf_stage,iatf_result,bull_id,ovary_status,body_score,implant_lost,weight_kg',
      filters: {
        deleted_at: 'is.null',
        kind: 'eq.passagem',
        event_at: `gte.${INICIO_OPERACAO_REAL}T00:00:00-03:00`,
        or: '(iatf_stage.not.is.null,weight_kg.not.is.null)',
      },
      order: 'event_at,id',
    }),
    sbListAll<IatfAnimalRow>('animals', {
      ...q,
      select: 'id,eid,category',
      filters: { deleted_at: 'is.null' },
      order: 'id',
    }),
    sbList<{ id: string; name: string }>('lots', { ...q, select: 'id,name' }),
    sbList<TouroRow>('bulls', { ...q, select: 'id,name,breed' }),
  ]);

  const hoje = hojeBrt();
  // Estação pedida na URL, se existir; senão a atual.
  const est = estacao && estacoesDisponiveis(sessoes, eventos, hoje).includes(estacao) ? estacao : estacaoAtual(hoje);
  const cenario = calcularCenarioIatf(sessoes, eventos, animais, est, hoje);

  // Pesagens no formato do curral-calc (pesagensAnteriores), só de sessões válidas.
  const validas = new Set(sessoes.filter(ehSessaoValida).map((s) => s.id));
  const pesagens: PassagemRow[] = dedupePassagens(eventos.filter((e) => e.weight_kg != null && validas.has(e.session_id)))
    .eventos.map((e) => ({
      id: e.id,
      session_id: e.session_id,
      animal_id: e.animal_id,
      event_at: e.event_at,
      eid: null,
      weight_kg: e.weight_kg,
      from_lot_id: null,
      to_lot_id: null,
      iatf_result: null,
      ovary_status: null,
      body_score: null,
      exam_notes: null,
      notes: null,
      prev_state: null,
    }));

  return { cenario, loteNome: new Map(lotes.map((l) => [l.id, l.name])), touros, pesagens };
}
