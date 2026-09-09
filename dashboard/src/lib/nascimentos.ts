import 'server-only';

import { sbList, sbListAll } from './supabase/client';
import type { HerdEventRow } from './consumo-calc';
import {
  CATEGORIA_CRIA_FEMEA,
  CATEGORIA_CRIA_MACHO,
  CATEGORIA_MATRIZ_PARIDA,
  CATEGORIAS_MATRIZ_PRENHA,
  calcularCenarioNascimentos,
  type CenarioNascimentos,
} from './nascimentos-calc';

// Estação de cria: nascimentos, mortalidade e maternidade por piquete.
// I/O próprio pra não inchar o pacotão de queries.ts (que corta herd_events
// em 50 linhas — insuficiente pra estação inteira).

interface PaddockRow {
  id: string;
  name: string;
}

interface HerdLocRow {
  paddock_id: string | null;
  category: string;
  head_count: number;
}

/** Estado de hoje de um piquete da maternidade — crias e matrizes presentes. */
export interface MaternidadePiquete {
  paddockId: string;
  paddockName: string;
  bezerros: number;
  bezerras: number;
  vacasParidas: number;
  /** VACA PRENHA + NOVILHA PRENHA. */
  matrizesPrenhas: number;
}

export interface NascimentosData {
  cenario: CenarioNascimentos;
  paddockNameById: Map<string, string>;
  /** Piquetes com cria ou matriz hoje, ordenados por crias. */
  maternidade: MaternidadePiquete[];
  /** Totais da fazenda hoje. */
  matrizes: { prenhas: number; paridas: number };
}

export async function loadNascimentosData(accessToken?: string): Promise<NascimentosData> {
  const auth = { accessToken };

  const [paddocks, herd, eventos] = await Promise.all([
    sbList<PaddockRow>('paddocks', { ...auth, select: 'id,name', order: 'name' }),
    sbList<HerdLocRow>('herd', {
      ...auth,
      select: 'paddock_id,category,head_count',
      filters: { deleted_at: 'is.null', head_count: 'gt.0' },
    }),
    sbListAll<HerdEventRow>('herd_events', {
      ...auth,
      select: 'paddock_id,target_paddock_id,event_type,category,head_count,notes,date',
      filters: { event_type: 'in.(NASCIMENTO,MORTE)', deleted_at: 'is.null' },
      order: 'date,id',
    }),
  ]);

  const cenario = calcularCenarioNascimentos(eventos);
  const paddockNameById = new Map(paddocks.map((p) => [p.id, p.name]));

  const maternidadeMap = new Map<string, MaternidadePiquete>();
  let prenhas = 0;
  let paridas = 0;
  for (const h of herd) {
    const ehMacho = h.category === CATEGORIA_CRIA_MACHO;
    const ehFemea = h.category === CATEGORIA_CRIA_FEMEA;
    const ehParida = h.category === CATEGORIA_MATRIZ_PARIDA;
    const ehPrenha = CATEGORIAS_MATRIZ_PRENHA.includes(h.category);
    if (ehPrenha) prenhas += h.head_count;
    if (ehParida) paridas += h.head_count;
    if (!h.paddock_id || !(ehMacho || ehFemea || ehParida || ehPrenha)) continue;

    const m = maternidadeMap.get(h.paddock_id) ?? {
      paddockId: h.paddock_id,
      paddockName: paddockNameById.get(h.paddock_id) ?? '—',
      bezerros: 0,
      bezerras: 0,
      vacasParidas: 0,
      matrizesPrenhas: 0,
    };
    if (ehMacho) m.bezerros += h.head_count;
    else if (ehFemea) m.bezerras += h.head_count;
    else if (ehParida) m.vacasParidas += h.head_count;
    else m.matrizesPrenhas += h.head_count;
    maternidadeMap.set(h.paddock_id, m);
  }

  const maternidade = Array.from(maternidadeMap.values()).sort(
    (a, b) => (b.bezerros + b.bezerras) - (a.bezerros + a.bezerras) ||
      a.paddockName.localeCompare(b.paddockName, 'pt-BR'),
  );

  return { cenario, paddockNameById, maternidade, matrizes: { prenhas, paridas } };
}
