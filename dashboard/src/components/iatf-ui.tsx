// Peças da aba IATF, usadas pela página e pelos relatórios de impressão. Server-friendly.

import type { ReactNode } from 'react';
import { OVARY_LABELS } from '@/lib/curral-calc';
import {
  AMOSTRA_MINIMA,
  ETAPA_LABELS,
  pct,
  type Contagem,
  type Funil,
  type LinhaTouro,
  type Taxa,
} from '@/lib/iatf-calc';

export const num = (x: number, casas = 0) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "62%" de uma fração; "—" sem denominador. */
export function fmtPct(x: number | null, casas = 0): string {
  return x == null ? '—' : `${num(x * 100, casas)}%`;
}

export const fmtTaxa = (t: Taxa, casas = 0) => fmtPct(pct(t), casas);
export const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const brinco = (eid: string | null) => (eid ? eid.slice(-6) : '—');
/** Lote sem id (sessão sem lote) vira este valor na URL. */
export const SEM_LOTE = 'sem-lote';

export function nomeLote(id: string | null, nomes: Map<string, string>): string {
  return id ? nomes.get(id) ?? '—' : 'Sem lote';
}

export const rotuloOvario = (k: string) => OVARY_LABELS[k] ?? k;

export function Rotulo({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{children}</p>;
}

/** Barras horizontais de uma série só (magnitude), com o número escrito ao lado. */
export function Barras({
  itens,
  max,
  larguraRotulo = '10rem',
}: {
  itens: Array<{ rotulo: string; n: number; extra?: string }>;
  max?: number;
  larguraRotulo?: string;
}) {
  const teto = Math.max(1, max ?? Math.max(0, ...itens.map((i) => i.n)));
  return (
    <ul className="space-y-1.5">
      {itens.map((i) => (
        <li
          key={i.rotulo}
          className="grid items-center gap-3 text-[13px]"
          style={{ gridTemplateColumns: `minmax(0,${larguraRotulo}) 1fr 6.5rem` }}
          title={`${i.rotulo}: ${num(i.n)}${i.extra ? ` (${i.extra})` : ''}`}
        >
          <span className="truncate text-fg">{i.rotulo}</span>
          <span className="h-2 overflow-hidden rounded-full bg-border-subtle print:border print:border-border">
            <span className="block h-full rounded-full bg-nsa-green-500" style={{ width: `${(i.n / teto) * 100}%` }} />
          </span>
          <span className="tabular whitespace-nowrap text-right">
            <span className="font-medium text-fg">{num(i.n)}</span>
            {i.extra ? <span className="ml-1.5 text-fg-muted">{i.extra}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Distribuição com % do total, a partir de contagens. */
export function Distribuicao({ itens, rotulo }: { itens: Contagem[]; rotulo?: (k: string) => string }) {
  const total = itens.reduce((a, i) => a + i.n, 0);
  return (
    <Barras
      itens={itens.map((i) => ({
        rotulo: rotulo ? rotulo(i.rotulo) : i.rotulo,
        n: i.n,
        extra: fmtPct(total ? i.n / total : null),
      }))}
    />
  );
}

// ----------------------------------------------------------------------------
// Funil

interface LinhaFunil {
  etapa: string;
  n: number;
  /** % sobre a etapa anterior. */
  base: number | null;
  detalhe?: string;
  vazio?: string;
}

export function linhasFunil(f: Funil): LinhaFunil[] {
  const t = f.triagem;
  const temTriagem = t.uteroSujo + t.prenha + t.descarte > 0;
  const p = (n: number, d: number) => (d ? ` ${fmtPct(n / d)}` : '');
  return [
    {
      etapa: 'Triagem',
      n: f.matrizes,
      base: null,
      detalhe: temTriagem
        ? `Aptas ${num(t.aptas)}${p(t.aptas, f.matrizes)} · útero sujo ${num(t.uteroSujo)}${p(t.uteroSujo, f.matrizes)} · já prenhas ${num(t.prenha)}${p(t.prenha, f.matrizes)} · descarte ${num(t.descarte)}${p(t.descarte, f.matrizes)}`
        : 'Sem triagem registrada: todas as matrizes contam como aptas',
    },
    { etapa: ETAPA_LABELS.d0, n: f.implante, base: f.matrizes },
    {
      etapa: ETAPA_LABELS.d8,
      n: f.d8,
      base: f.implante,
      detalhe: f.literal.d8 !== f.d8 ? `${num(f.literal.d8)} com registro de D8; as demais seguiram para a inseminação` : undefined,
    },
    { etapa: ETAPA_LABELS.inseminacao, n: f.inseminacao, base: f.d8 },
    {
      etapa: 'DG',
      n: f.dg.total,
      base: f.inseminacao,
      detalhe: f.dg.total
        ? `Prenhas ${num(f.dg.prenha)}${p(f.dg.prenha, f.dg.total)} · vazias → D8 ${num(f.dg.vazia)}${p(f.dg.vazia, f.dg.total)} · descarte ${num(f.dg.descarte)}${p(f.dg.descarte, f.dg.total)}`
        : undefined,
      vazio: 'Aguardando o DG',
    },
    { etapa: '2ª IATF', n: f.segundaIatf, base: f.dg.vazia, vazio: f.dg.total ? 'Nenhuma vazia reinseminada ainda' : 'Depois do DG' },
    {
      etapa: 'DG final',
      n: f.dgFinal.total,
      base: null,
      detalhe: f.dgFinal.total
        ? `Prenhas ${num(f.dgFinal.prenha)}${p(f.dgFinal.prenha, f.dgFinal.total)} · vazias (descarte) ${num(f.dgFinal.vazia)}${p(f.dgFinal.vazia, f.dgFinal.total)}`
        : undefined,
      vazio: 'Ainda não houve DG final',
    },
  ];
}

export function FunilView({ f }: { f: Funil }) {
  const linhas = linhasFunil(f);
  const teto = Math.max(1, f.matrizes);
  return (
    <ol className="space-y-3">
      {linhas.map((l) => (
        <li key={l.etapa} className="grid grid-cols-[6.5rem_1fr_7rem] items-start gap-3 text-[13px]">
          <span className="pt-0.5 font-medium text-fg">{l.etapa}</span>
          <div>
            {l.n === 0 && l.vazio ? (
              <span className="text-fg-muted">{l.vazio}</span>
            ) : (
              <>
                <span className="block h-2.5 overflow-hidden rounded-full bg-border-subtle print:border print:border-border">
                  <span className="block h-full rounded-full bg-nsa-green-500" style={{ width: `${(l.n / teto) * 100}%` }} />
                </span>
                {l.detalhe ? <span className="mt-1 block text-[12px] text-fg-muted">{l.detalhe}</span> : null}
              </>
            )}
          </div>
          <span className="tabular whitespace-nowrap text-right">
            {l.n === 0 && l.vazio ? null : (
              <>
                <span className="font-semibold text-fg">{num(l.n)}</span>
                {l.base != null ? <span className="ml-1.5 text-fg-muted">{fmtPct(l.base ? l.n / l.base : null)}</span> : null}
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ----------------------------------------------------------------------------
// Touros

export function TabelaTouros({ linhas, total, comRaca }: { linhas: LinhaTouro[]; total: number; comRaca?: boolean }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-fg-muted">
          <th className="py-1.5 text-left font-medium">{comRaca ? 'Touro' : 'Raça'}</th>
          {comRaca ? <th className="py-1.5 text-left font-medium">Raça</th> : null}
          <th className="py-1.5 text-right font-medium">Doses</th>
          <th className="py-1.5 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className="border-b border-border-subtle last:border-b-0">
            <td className="py-1.5 text-fg">{l.rotulo}</td>
            {comRaca ? <td className="py-1.5 text-fg-muted">{l.raca ?? '—'}</td> : null}
            <td className="tabular py-1.5 text-right font-medium">{num(l.doses)}</td>
            <td className="tabular py-1.5 text-right text-fg-muted">{fmtPct(total ? l.doses / total : null)}</td>
          </tr>
        ))}
        <tr className="border-t border-border">
          <td className="py-1.5 font-medium text-fg">Total</td>
          {comRaca ? <td /> : null}
          <td className="tabular py-1.5 text-right font-semibold">{num(total)}</td>
          <td className="tabular py-1.5 text-right text-fg-muted">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Concepção por touro, com n de doses e aviso de amostra pequena. */
export function TabelaConcepcao({ linhas }: { linhas: LinhaTouro[] }) {
  const comDado = linhas.filter((l) => l.comResultado > 0);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-fg-muted">
          <th className="py-1.5 text-left font-medium">Touro</th>
          <th className="py-1.5 text-right font-medium">Doses com DG</th>
          <th className="py-1.5 text-right font-medium">Prenhas</th>
          <th className="py-1.5 text-right font-medium">Concepção</th>
        </tr>
      </thead>
      <tbody>
        {comDado.map((l) => (
          <tr key={l.chave} className="border-b border-border-subtle last:border-b-0">
            <td className="py-1.5 text-fg">{l.rotulo}</td>
            <td className="tabular py-1.5 text-right">{num(l.comResultado)}</td>
            <td className="tabular py-1.5 text-right">{num(l.prenhas)}</td>
            <td className="tabular py-1.5 text-right font-medium">
              {fmtPct(l.prenhas / l.comResultado)}
              {l.comResultado < AMOSTRA_MINIMA ? (
                <span className="ml-1.5 text-[11px] font-normal text-warning" title={`Menos de ${AMOSTRA_MINIMA} doses: amostra pequena`}>
                  amostra pequena
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Prenhez no 1º DG por grupo (ovário, ECC, categoria, lote). */
export function TabelaPrenhez({ itens, titulo, rotulo }: { itens: Contagem[]; titulo: string; rotulo?: (k: string) => string }) {
  const comDg = itens.filter((i) => i.dg.d > 0);
  if (comDg.length === 0) return null;
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-fg-muted">
          <th className="py-1.5 text-left font-medium">{titulo}</th>
          <th className="py-1.5 text-right font-medium">Com DG</th>
          <th className="py-1.5 text-right font-medium">Prenhas</th>
          <th className="py-1.5 text-right font-medium">Prenhez</th>
        </tr>
      </thead>
      <tbody>
        {comDg.map((i) => (
          <tr key={i.rotulo} className="border-b border-border-subtle last:border-b-0">
            <td className="py-1.5 text-fg">{rotulo ? rotulo(i.rotulo) : i.rotulo}</td>
            <td className="tabular py-1.5 text-right">{num(i.dg.d)}</td>
            <td className="tabular py-1.5 text-right">{num(i.dg.n)}</td>
            <td className="tabular py-1.5 text-right font-medium">{fmtTaxa(i.dg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
