// Relatórios de impressão da IATF: o do lote (no formato dos relatórios do Pedro, com a paleta
// NSA) e o geral da estação. "Exportar PDF" = imprimir do navegador e salvar como PDF.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AlertCard } from '@/components/ui-primitives';
import { PrintButton } from '@/components/print-button';
import { SEM_LOTE, brinco, fmtData, fmtPct, nomeLote, num, rotuloOvario } from '@/components/iatf-ui';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { hojeBrt, loadIatfData } from '@/lib/iatf';
import {
  ETAPA_LABELS,
  FAIXAS_ECC,
  OVARIO_ORDEM,
  calcularFatores,
  calcularFunil,
  calcularIndicadores,
  calcularTouros,
  faixaEcc,
  filtrarGrupo,
  quemFaltou,
  resumirLote,
  resumirLotes,
  type Funil,
  type LinhaTouro,
  type ResumoLote,
} from '@/lib/iatf-calc';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ estacao?: string; lote?: string }>;
}

export default async function RelatorioIatfPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionOrRedirect();
  const voltar = `/iatf?${new URLSearchParams({ ...(params.estacao ? { estacao: params.estacao } : {}), ...(params.lote ? { lote: params.lote } : {}) })}`;

  const barra = (
    <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
      <Link href={voltar} className="inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg">
        <ArrowLeft size={14} strokeWidth={1.75} /> Voltar à IATF
      </Link>
      <PrintButton label="Exportar PDF" />
    </div>
  );

  if (!session.curralAccessToken) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {barra}
        <AlertCard kind="warning" title="Sem acesso ao banco do Curral nesta sessão" body="Saia e entre de novo." />
      </main>
    );
  }
  const data = await loadIatfData(session.curralAccessToken, params.estacao ?? null);
  if (!data) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {barra}
        <AlertCard kind="warning" title="Curral não configurado" />
      </main>
    );
  }

  const est = data.cenario.estacao;
  const emitido = fmtData(hojeBrt());
  let folha: ReactNode;
  if (params.lote) {
    const loteId = params.lote === SEM_LOTE ? null : params.lote;
    const lista = data.cenario.animais.filter((a) => a.loteId === loteId);
    folha = lista.length ? (
      <RelatorioLote r={resumirLote(loteId, lista)} nome={nomeLote(loteId, data.loteNome)} estacao={est} emitido={emitido} touros={calcularTouros(lista, data.touros).porTouro} />
    ) : (
      <AlertCard kind="warning" title="Lote sem IATF nesta estação" />
    );
  } else {
    folha = <RelatorioGeral data={data} estacao={est} emitido={emitido} />;
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8 print:p-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print { html, body { background: #fff; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>
      {barra}
      <div className="mx-auto max-w-[800px] rounded-lg border border-border bg-bg-elevated p-6 print:max-w-none print:rounded-none print:border-0 print:p-0">
        {folha}
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------------

function Cabecalho({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <header className="mb-5 rounded-md bg-nsa-green-800 px-5 py-4 text-fg-inverse">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-80">Fazenda NSA · Pecuária</p>
      <h1 className="mt-1 text-h2 font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-0.5 text-[13px] opacity-85">{sub}</p>
    </header>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 border-b-2 border-nsa-green-500 pb-1 text-[14px] font-semibold uppercase tracking-[0.04em] text-fg-brand">{titulo}</h2>
      {children}
    </section>
  );
}

/** Tabela de quantidade e %, com linha de total. */
function TabelaQtd({ linhas, cabecalho = 'Classificação' }: { linhas: Array<{ rotulo: string; n: number }>; cabecalho?: string }) {
  const total = linhas.reduce((a, l) => a + l.n, 0);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="bg-nsa-green-100 text-[11px] uppercase tracking-wider text-nsa-green-800">
          <th className="px-2 py-1.5 text-left font-semibold">{cabecalho}</th>
          <th className="px-2 py-1.5 text-right font-semibold">Qtd</th>
          <th className="px-2 py-1.5 text-right font-semibold">%</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.rotulo} className="border-b border-border-subtle">
            <td className="px-2 py-1.5">{l.rotulo}</td>
            <td className="tabular px-2 py-1.5 text-right">{num(l.n)}</td>
            <td className="tabular px-2 py-1.5 text-right">{fmtPct(total ? l.n / total : null, 1)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="px-2 py-1.5">Total</td>
          <td className="tabular px-2 py-1.5 text-right">{num(total)}</td>
          <td className="tabular px-2 py-1.5 text-right">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

function linhasFunilImpressao(f: Funil): Array<{ etapa: string; n: number; base: number | null }> {
  const out = [
    { etapa: 'Matrizes no programa', n: f.matrizes, base: null as number | null },
    { etapa: 'Implante', n: f.implante, base: f.matrizes },
    { etapa: 'D8', n: f.d8, base: f.implante },
    { etapa: 'Inseminação', n: f.inseminacao, base: f.d8 },
  ];
  if (f.dg.total) {
    out.push(
      { etapa: 'DG', n: f.dg.total, base: f.inseminacao },
      { etapa: 'DG · prenhas', n: f.dg.prenha, base: f.dg.total },
      { etapa: 'DG · vazias → D8', n: f.dg.vazia, base: f.dg.total },
      { etapa: 'DG · descarte', n: f.dg.descarte, base: f.dg.total },
    );
  }
  if (f.segundaIatf) out.push({ etapa: '2ª IATF', n: f.segundaIatf, base: f.dg.vazia });
  if (f.dgFinal.total) {
    out.push(
      { etapa: 'DG final', n: f.dgFinal.total, base: null },
      { etapa: 'DG final · prenhas', n: f.dgFinal.prenha, base: f.dgFinal.total },
      { etapa: 'DG final · descarte', n: f.dgFinal.vazia, base: f.dgFinal.total },
    );
  }
  return out;
}

function TabelaFunil({ colunas }: { colunas: Array<{ titulo: string; f: Funil }> }) {
  const linhas = colunas.map((c) => linhasFunilImpressao(c.f));
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="bg-nsa-green-100 text-[11px] uppercase tracking-wider text-nsa-green-800">
          <th className="px-2 py-1.5 text-left font-semibold">Etapa</th>
          {colunas.map((c) => (
            <th key={c.titulo} className="px-2 py-1.5 text-right font-semibold" colSpan={2}>
              {c.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas[0]!.map((l, i) => (
          <tr key={l.etapa} className="border-b border-border-subtle">
            <td className="px-2 py-1.5">{l.etapa}</td>
            {linhas.map((col, j) => {
              const x = col[i];
              return [
                <td key={`${j}n`} className="tabular px-2 py-1.5 text-right font-medium">
                  {x ? num(x.n) : '—'}
                </td>,
                <td key={`${j}p`} className="tabular px-2 py-1.5 text-right text-fg-muted">
                  {x && x.base != null ? fmtPct(x.base ? x.n / x.base : null, 1) : ''}
                </td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaDoses({ linhas, comRaca }: { linhas: LinhaTouro[]; comRaca?: boolean }) {
  const total = linhas.reduce((a, l) => a + l.doses, 0);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="bg-nsa-green-100 text-[11px] uppercase tracking-wider text-nsa-green-800">
          <th className="px-2 py-1.5 text-left font-semibold">{comRaca ? 'Touro' : 'Raça'}</th>
          {comRaca ? <th className="px-2 py-1.5 text-left font-semibold">Raça</th> : null}
          <th className="px-2 py-1.5 text-right font-semibold">Doses</th>
          <th className="px-2 py-1.5 text-right font-semibold">%</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className="border-b border-border-subtle">
            <td className="px-2 py-1.5">{l.rotulo}</td>
            {comRaca ? <td className="px-2 py-1.5 text-fg-muted">{l.raca ?? '—'}</td> : null}
            <td className="tabular px-2 py-1.5 text-right">{num(l.doses)}</td>
            <td className="tabular px-2 py-1.5 text-right">{fmtPct(total ? l.doses / total : null, 1)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="px-2 py-1.5">Total</td>
          {comRaca ? <td /> : null}
          <td className="tabular px-2 py-1.5 text-right">{num(total)}</td>
          <td className="tabular px-2 py-1.5 text-right">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

// ----------------------------------------------------------------------------

function RelatorioLote({
  r,
  nome,
  estacao,
  emitido,
  touros,
}: {
  r: ResumoLote;
  nome: string;
  estacao: string;
  emitido: string;
  touros: LinhaTouro[];
}) {
  const f = r.funil;
  const aptas = r.animais.filter((a) => a.apta);
  const ovario = OVARIO_ORDEM.map((k) => ({ rotulo: rotuloOvario(k), n: aptas.filter((a) => a.ciclos[0]!.ovario === k).length }));
  const semOvario = aptas.filter((a) => !a.ciclos[0]!.ovario).length;
  const ecc = FAIXAS_ECC.map((k) => ({ rotulo: k, n: aptas.filter((a) => a.ciclos[0]!.ecc != null && faixaEcc(a.ciclos[0]!.ecc) === k).length }));
  const semEcc = aptas.filter((a) => a.ciclos[0]!.ecc == null).length;
  const eccs = aptas.map((a) => a.ciclos[0]!.ecc).filter((x): x is number => x != null);
  const ind = calcularIndicadores(r.animais);
  const faltas = quemFaltou(r);

  const obs: string[] = [];
  if (ind.perdaImplante.d) obs.push(`Perda de implante no D8: ${num(ind.perdaImplante.n)} de ${num(ind.perdaImplante.d)} (${fmtPct(ind.perdaImplante.n / ind.perdaImplante.d, 1)}).`);
  for (const x of faltas)
    obs.push(
      x.animais.length
        ? `${ETAPA_LABELS[x.etapa]} de ${fmtData(x.dia)}: ${num(x.animais.length)} não passaram (brincos ${x.animais.map((a) => brinco(a.eid)).join(', ')}).`
        : `${ETAPA_LABELS[x.etapa]} de ${fmtData(x.dia)}: todas as matrizes da etapa anterior passaram.`,
    );
  if (f.literal.d8 !== f.d8) obs.push(`${num(f.d8 - f.literal.d8)} matriz(es) seguiram para a inseminação sem registro de D8.`);
  if (semOvario) obs.push(`${num(semOvario)} matriz(es) implantadas sem ovário registrado.`);
  if (semEcc) obs.push(`${num(semEcc)} matriz(es) implantadas sem ECC registrado.`);

  return (
    <article>
      <Cabecalho titulo={`${nome.toUpperCase()} | IATF ${estacao}`} sub={`${r.categoria ?? 'Sem categoria'} · ${num(f.matrizes)} matrizes · emitido em ${emitido}`} />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Etapa atual</p>
          <p className="mt-1 text-[15px] font-semibold text-fg">{r.atual ? `${ETAPA_LABELS[r.atual.etapa]} · ${fmtData(r.atual.dia)}` : '—'}</p>
        </div>
        <div className="rounded-md border border-nsa-green-500 bg-nsa-green-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Próxima etapa</p>
          <p className="mt-1 text-[15px] font-semibold text-fg">
            {r.proxima ? `${r.proxima.rotulo}${r.proxima.prevista ? ` · prevista ${fmtData(r.proxima.prevista)}` : ''}` : 'Programa encerrado'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 print:grid-cols-2">
        <Secao titulo="Classificação da triagem">
          <TabelaQtd
            linhas={[
              { rotulo: 'Aptas', n: f.triagem.aptas },
              { rotulo: 'Útero sujo', n: f.triagem.uteroSujo },
              { rotulo: 'Já prenhas', n: f.triagem.prenha },
              { rotulo: 'Descarte', n: f.triagem.descarte },
            ]}
          />
          {f.triagem.uteroSujo + f.triagem.prenha + f.triagem.descarte === 0 ? (
            <p className="mt-1 text-[12px] text-fg-muted">Sem triagem registrada: todas as matrizes contam como aptas.</p>
          ) : null}
        </Secao>
        <Secao titulo="Implantadas por ovário">
          <TabelaQtd cabecalho="Ovário" linhas={[...ovario, ...(semOvario ? [{ rotulo: 'Sem registro', n: semOvario }] : [])]} />
        </Secao>
        <Secao titulo="Escore de condição corporal">
          <TabelaQtd cabecalho="ECC" linhas={[...ecc, ...(semEcc ? [{ rotulo: 'Sem registro', n: semEcc }] : [])]} />
          {eccs.length ? <p className="mt-1 text-[12px] text-fg-muted">Média {num(eccs.reduce((a, b) => a + b, 0) / eccs.length, 2)}</p> : null}
        </Secao>
        <Secao titulo="Funil">
          <TabelaFunil colunas={[{ titulo: 'Qtd · %', f }]} />
          <p className="mt-1 text-[12px] text-fg-muted">% sobre a etapa anterior. Chegou à etapa ou além.</p>
        </Secao>
      </div>

      <Secao titulo="Touros">
        {touros.length ? <TabelaDoses linhas={touros} comRaca /> : <p className="text-[13px] text-fg-muted">Nenhuma inseminação ainda.</p>}
      </Secao>

      <Secao titulo="Linha do tempo">
        <p className="text-[13px] text-fg">
          {r.etapas.map((e) => `${fmtData(e.dia)} ${ETAPA_LABELS[e.etapa]} (${num(e.animais)})`).join(' · ')}
        </p>
      </Secao>

      <Secao titulo="Observações">
        {obs.length ? (
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg">
            {obs.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-fg-muted">Nada a registrar.</p>
        )}
      </Secao>
    </article>
  );
}

function RelatorioGeral({ data, estacao, emitido }: { data: NonNullable<Awaited<ReturnType<typeof loadIatfData>>>; estacao: string; emitido: string }) {
  const todos = data.cenario.animais;
  const vacas = filtrarGrupo(todos, 'vacas');
  const novilhas = filtrarGrupo(todos, 'novilhas');
  const ind = calcularIndicadores(todos);
  const touros = calcularTouros(todos, data.touros);
  const fatores = calcularFatores(todos);
  const lotes = resumirLotes(todos).sort((a, b) =>
    nomeLote(a.loteId, data.loteNome).localeCompare(nomeLote(b.loteId, data.loteNome), 'pt-BR', { numeric: true }),
  );

  return (
    <article>
      <Cabecalho titulo={`RELATÓRIO GERAL | IATF ${estacao}`} sub={`${num(ind.matrizes)} matrizes em ${num(lotes.length)} lotes · emitido em ${emitido}`} />

      <div className="mb-5 grid grid-cols-3 gap-3 text-[13px]">
        {[
          ['Implantadas', num(ind.implantadas)],
          ['Inseminadas', `${num(ind.inseminadas)} · serviço ${fmtPct(ind.taxaServico.d ? ind.taxaServico.n / ind.taxaServico.d : null)}`],
          ['Perda de implante', ind.perdaImplante.d ? `${num(ind.perdaImplante.n)} · ${fmtPct(ind.perdaImplante.n / ind.perdaImplante.d, 1)}` : '—'],
          ['Prenhas (DG)', ind.temDg ? `${num(ind.prenhas)} · ${fmtPct(ind.prenhez.d ? ind.prenhez.n / ind.prenhez.d : null)}` : 'Aguardando DG'],
          ['Descartes', num(ind.descartes.total)],
          ['Doses de sêmen', num(touros.doses)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{k}</p>
            <p className="tabular mt-0.5 text-[15px] font-semibold text-fg">{v}</p>
          </div>
        ))}
      </div>

      <Secao titulo="Lotes">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-nsa-green-100 text-[11px] uppercase tracking-wider text-nsa-green-800">
              <th className="px-2 py-1.5 text-left font-semibold">Lote</th>
              <th className="px-2 py-1.5 text-left font-semibold">Etapa atual</th>
              <th className="px-2 py-1.5 text-left font-semibold">Próxima</th>
              <th className="px-2 py-1.5 text-right font-semibold">Matr.</th>
              <th className="px-2 py-1.5 text-right font-semibold">Impl.</th>
              <th className="px-2 py-1.5 text-right font-semibold">D8</th>
              <th className="px-2 py-1.5 text-right font-semibold">Insem.</th>
              <th className="px-2 py-1.5 text-right font-semibold">Prenhas</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => (
              <tr key={l.loteId ?? SEM_LOTE} className="border-b border-border-subtle">
                <td className="px-2 py-1.5">{nomeLote(l.loteId, data.loteNome)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{l.atual ? `${ETAPA_LABELS[l.atual.etapa]} ${fmtData(l.atual.dia).slice(0, 5)}` : '—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {l.proxima ? `${l.proxima.rotulo}${l.proxima.prevista ? ` ${fmtData(l.proxima.prevista).slice(0, 5)}` : ''}` : '—'}
                </td>
                <td className="tabular px-2 py-1.5 text-right">{num(l.funil.matrizes)}</td>
                <td className="tabular px-2 py-1.5 text-right">{num(l.funil.implante)}</td>
                <td className="tabular px-2 py-1.5 text-right">{num(l.funil.d8)}</td>
                <td className="tabular px-2 py-1.5 text-right">{num(l.funil.inseminacao)}</td>
                <td className="tabular px-2 py-1.5 text-right">{l.funil.dg.total ? num(l.funil.dg.prenha) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao titulo="Vacas × novilhas">
        <TabelaFunil
          colunas={[
            { titulo: 'Vacas', f: calcularFunil(vacas) },
            { titulo: 'Novilhas', f: calcularFunil(novilhas) },
            { titulo: 'Total', f: calcularFunil(todos) },
          ]}
        />
        <p className="mt-1 text-[12px] text-fg-muted">% sobre a etapa anterior. Novilhas = categoria atual que começa com NOVILHA.</p>
      </Secao>

      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 print:grid-cols-2">
        <Secao titulo="Sêmen por touro">
          {touros.doses ? <TabelaDoses linhas={touros.porTouro} comRaca /> : <p className="text-[13px] text-fg-muted">Nenhuma inseminação ainda.</p>}
        </Secao>
        <div>
          <Secao titulo="Sêmen por raça">
            {touros.doses ? <TabelaDoses linhas={touros.porRaca} /> : <p className="text-[13px] text-fg-muted">Nenhuma inseminação ainda.</p>}
          </Secao>
          <Secao titulo="Ovário no implante">
            <TabelaQtd cabecalho="Ovário" linhas={fatores.ovario.map((o) => ({ rotulo: rotuloOvario(o.rotulo), n: o.n }))} />
          </Secao>
        </div>
      </div>
    </article>
  );
}
