import 'server-only';

import { sbList, sbListAll, type SbConn } from './supabase/client';
import {
  INICIO_OPERACAO_REAL,
  calcularCenarioCurral,
  detalharSessao,
  type AnimalRow,
  type CurralCenario,
  type PassagemDetalhe,
  type PassagemRow,
  type SessaoResumo,
  type SessaoRow,
} from './curral-calc';

// O Curral (app curral-nsa) grava em outro projeto Supabase — hoje o branch QA,
// que é a produção de fato do Curral até a virada para prod (espera importar o
// histórico da PRODAP). Quando virar, basta apontar CURRAL_SUPABASE_URL para prod.

function conn(): SbConn | null {
  const url = process.env.CURRAL_SUPABASE_URL;
  const anonKey = process.env.CURRAL_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export interface LoteInfo {
  nome: string;
  piquete: string | null;
}

export interface CurralData {
  cenario: CurralCenario;
  loteById: Map<string, LoteInfo>;
  usuarioById: Map<string, string>;
  /** Sessão escolhida (mesmo fora do período filtrado) e a ficha dela. */
  selecionada: SessaoResumo | null;
  detalhe: PassagemDetalhe[] | null;
}

export async function loadCurralData(
  accessToken: string,
  janela?: { start: string; end: string },
  sessaoId?: string,
): Promise<CurralData | null> {
  const c = conn();
  if (!c) return null;
  const q = { conn: c, accessToken };

  const [sessoes, passagens, animais, lotes, piquetes, perfis] = await Promise.all([
    sbListAll<SessaoRow>('curral_sessions', {
      ...q,
      select:
        'id,date,started_at,closed_at,status,ops,lot_id,protocol_name,protocol_items,iatf_stage,default_category,buyer,vet,origin,sale_head_count,sale_total_kg,user_id,notes',
      filters: { deleted_at: 'is.null' },
      order: 'started_at,id',
    }),
    sbListAll<PassagemRow>('animal_events', {
      ...q,
      select:
        'id,session_id,animal_id,event_at,eid,weight_kg,from_lot_id,to_lot_id,iatf_result,ovary_status,body_score,exam_notes,notes,prev_state',
      filters: {
        deleted_at: 'is.null',
        kind: 'eq.passagem',
        // Antes disso é a base de teste; puxar ela inventaria "pesagem anterior".
        event_at: `gte.${INICIO_OPERACAO_REAL}T00:00:00-03:00`,
      },
      order: 'event_at,id',
    }),
    sbListAll<AnimalRow>('animals', {
      ...q,
      select: 'id,eid,category',
      filters: { deleted_at: 'is.null' },
      order: 'id',
    }),
    sbList<{ id: string; name: string; paddock_id: string | null }>('lots', {
      ...q,
      select: 'id,name,paddock_id',
    }),
    sbListAll<{ id: string; name: string }>('paddocks', { ...q, select: 'id,name', order: 'id' }),
    sbList<{ id: string; username: string | null }>('profiles', { ...q, select: 'id,username' }),
  ]);

  const piqueteById = new Map(piquetes.map((p) => [p.id, p.name]));
  const loteById = new Map<string, LoteInfo>(
    lotes.map((l) => [l.id, { nome: l.name, piquete: l.paddock_id ? piqueteById.get(l.paddock_id) ?? null : null }]),
  );
  const usuarioById = new Map(perfis.filter((p) => p.username).map((p) => [p.id, p.username!]));

  return {
    cenario: calcularCenarioCurral(sessoes, passagens, animais, janela),
    loteById,
    usuarioById,
    selecionada: sessaoId
      ? calcularCenarioCurral(sessoes, passagens, animais).sessoes.find((r) => r.sessao.id === sessaoId) ?? null
      : null,
    detalhe: sessaoId ? detalharSessao(sessaoId, passagens, animais) : null,
  };
}
