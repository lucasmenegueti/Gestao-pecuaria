import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Syringe } from 'lucide-react';
import { AlertCard, Card, EmptyState, KPICard } from '@/components/ui-primitives';
import {
  Barras,
  Distribuicao,
  FunilView,
  Rotulo,
  TabelaConcepcao,
  TabelaPrenhez,
  TabelaTouros,
  brinco,
  fmtData,
  fmtDia,
  fmtPct,
  fmtTaxa,
  num,
  nomeLote,
  rotuloOvario,
  SEM_LOTE,
} from '@/components/iatf-ui';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { loadIatfData, type IatfData } from '@/lib/iatf';
import {
  AMOSTRA_MINIMA,
  ETAPA_LABELS,
  FRACAO_MINIMA_ETAPA,
  calcularFatores,
  calcularFunil,
  filtrarGrupo,
  calcularIndicadores,
  calcularTouros,
  gmdDoLote,
  intervaloEstacao,
  quemFaltou,
  resumirLote,
  resumirLotes,
  type ResumoLote,
} from '@/lib/iatf-calc';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ estacao?: string; grupo?: string; lote?: string }>;
}

/** Primeira data prevista de DG entre os lotes que estão na inseminação. */
function primeiroDgPrevisto(lotes: ResumoLote[]): string | null {
  const ds = lotes.filter((l) => l.proxima?.rotulo === 'DG' && l.proxima.prevista).map((l) => l.proxima!.prevista!);
  return ds.length ? ds.sort()[0]! : null;
}

function Pilulas({ opcoes, ativo }: { opcoes: Array<{ valor: string; rotulo: string; href: string }>; ativo: string }) {
  return (
    <div className="inline-flex rounded-md border border-border-strong bg-bg-elevated p-0.5">
      {opcoes.map((o) => (
        <Link
          key={o.valor}
          href={o.href}
          className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${
            o.valor === ativo ? 'bg-nsa-green-800 text-fg-inverse' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.rotulo}
        </Link>
      ))}
    </div>
  );
}

export default async function IatfPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionOrRedirect();
  const grupo = params.grupo === 'vacas' || params.grupo === 'novilhas' ? params.grupo : 'todas';

  const href = (mudar: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    const base: Record<string, string | undefined> = { estacao: params.estacao, grupo: grupo === 'todas' ? undefined : grupo, lote: params.lote };
    for (const [k, v] of Object.entries({ ...base, ...mudar })) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/iatf?${s}` : '/iatf';
  };

  const titulo = (sub: string, acoes?: ReactNode) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Pecuária · reprodução</p>
        <h1 className="mt-1 text-h2 font-semibold tracking-tight text-fg md:text-h1">IATF</h1>
        <p className="mt-1 text-small text-fg-muted">{sub}</p>
      </div>
      {acoes}
    </div>
  );

  if (!session.curralAccessToken) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {titulo('Inseminação em tempo fixo')}
        <AlertCard
          kind="warning"
          title="Sem acesso ao banco do Curral nesta sessão"
          body="A IATF é registrada no app do Curral, que fica num banco separado; o acesso a ele é feito no login. Saia e entre de novo."
        />
      </main>
    );
  }

  const data = await loadIatfData(session.curralAccessToken, params.estacao ?? null);
  if (!data) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {titulo('Inseminação em tempo fixo')}
        <Card>
          <EmptyState icon={Syringe} title="Curral não configurado" body="Faltam CURRAL_SUPABASE_URL e CURRAL_SUPABASE_ANON_KEY no ambiente." />
        </Card>
      </main>
    );
  }

  const est = data.cenario.estacao;
  const { inicio, fim } = intervaloEstacao(est);
  const animais = filtrarGrupo(data.cenario.animais, grupo);
  const qsRelatorio = new URLSearchParams({ estacao: est });

  const acoes = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Pilulas
        ativo={grupo}
        opcoes={[
          { valor: 'todas', rotulo: 'Todas', href: href({ grupo: null }) },
          { valor: 'vacas', rotulo: 'Vacas', href: href({ grupo: 'vacas' }) },
          { valor: 'novilhas', rotulo: 'Novilhas', href: href({ grupo: 'novilhas' }) },
        ]}
      />
      {data.cenario.estacoes.length > 1 ? (
        <Pilulas
          ativo={est}
          opcoes={data.cenario.estacoes.map((e) => ({ valor: e, rotulo: e, href: href({ estacao: e, lote: null }) }))}
        />
      ) : null}
      <Link
        href={`/iatf/relatorio?${params.lote ? new URLSearchParams({ estacao: est, lote: params.lote }) : qsRelatorio}`}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-strong bg-bg-elevated px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:bg-grey-50"
      >
        <FileText size={14} strokeWidth={1.75} />
        <span>{params.lote ? 'PDF do lote' : 'Relatório da estação'}</span>
      </Link>
    </div>
  );

  const sub = `Estação ${est} · ${fmtData(inicio)} a ${fmtData(fim)}${grupo === 'todas' ? '' : ` · só ${grupo}`}`;

  if (params.lote) {
    const loteId = params.lote === SEM_LOTE ? null : params.lote;
    const lista = animais.filter((a) => a.loteId === loteId);
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {titulo(sub, acoes)}
        <Link href={href({ lote: null })} className="mb-3 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg print:hidden">
          <ArrowLeft size={14} strokeWidth={1.75} /> Todos os lotes
        </Link>
        {lista.length === 0 ? (
          <Card>
            <EmptyState icon={Syringe} title="Lote sem IATF nesta estação" body="Confira a estação ou o filtro de vacas e novilhas." />
          </Card>
        ) : (
          <DetalheLote r={resumirLote(loteId, lista)} data={data} estacao={est} />
        )}
      </main>
    );
  }

  const ind = calcularIndicadores(animais);
  const lotes = resumirLotes(animais).sort((a, b) =>
    nomeLote(a.loteId, data.loteNome).localeCompare(nomeLote(b.loteId, data.loteNome), 'pt-BR', { numeric: true }),
  );
  const funil = calcularFunil(animais);
  const touros = calcularTouros(animais, data.touros);
  const fatores = calcularFatores(animais);
  const dgPrevisto = primeiroDgPrevisto(lotes);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      {titulo(sub, acoes)}

      {animais.length === 0 ? (
        <Card>
          <EmptyState
            icon={Syringe}
            title="Nenhuma IATF nesta estação"
            body="As etapas aparecem aqui quando o app do Curral registra uma sessão de IATF (implante, D8, inseminação ou DG)."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KPICard
              label="Matrizes no programa"
              value={num(ind.matrizes)}
              unit="cab"
              hint={`${num(ind.aptas)} aptas · ${num(ind.triadasNaoAptas)} triadas não aptas`}
            />
            <KPICard label="Implantadas" value={num(ind.implantadas)} unit="cab" hint={`${fmtPct(ind.matrizes ? ind.implantadas / ind.matrizes : null)} das matrizes`} />
            <KPICard
              label="Inseminadas"
              value={num(ind.inseminadas)}
              unit="cab"
              hint={`Taxa de serviço ${fmtTaxa(ind.taxaServico)} (${num(ind.taxaServico.n)} de ${num(ind.taxaServico.d)} implantadas nos lotes que já inseminaram)`}
            />
            <KPICard
              label="Perda de implante"
              value={fmtTaxa(ind.perdaImplante, 1)}
              accent={ind.perdaImplante.n > 0 ? 'warn' : undefined}
              hint={ind.perdaImplante.d ? `${num(ind.perdaImplante.n)} de ${num(ind.perdaImplante.d)} no D8` : 'Sem D8 registrado'}
            />
            <KPICard
              label="Prenhas (DG)"
              value={ind.temDg ? num(ind.prenhas) : '—'}
              unit={ind.temDg ? 'cab' : undefined}
              hint={ind.temDg ? `Prenhez ${fmtTaxa(ind.prenhez)} das aptas dos lotes com DG` : dgPrevisto ? `1º DG previsto para ${fmtData(dgPrevisto)}` : 'Aguardando o DG'}
            />
            <KPICard
              label="Descartes"
              value={num(ind.descartes.total)}
              unit="cab"
              hint={`DG ${num(ind.descartes.dg)} · DG final ${num(ind.descartes.dgFinal)} · triagem ${num(ind.descartes.triagem)}`}
            />
          </div>

          {data.cenario.descartados > 0 ? (
            <p className="mb-4 text-[12px] text-fg-muted">
              {num(data.cenario.descartados)} passagem(ns) repetida(s) do mesmo animal na mesma sessão desconsiderada(s): vale a última.
            </p>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
            <Card title="Funil da estação" subtitle="Chegou a esta etapa ou além · % sobre a etapa anterior">
              <FunilView f={funil} />
            </Card>
            <Card title="Indicadores da estação" subtitle="Aparecem depois do primeiro DG">
              {ind.temDg ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Indicador rotulo="Concepção 1ª IATF" valor={fmtTaxa(ind.concepcao1)} nota={`${num(ind.concepcao1.n)} de ${num(ind.concepcao1.d)} inseminadas no 1º ciclo`} />
                  <Indicador rotulo="Concepção 2ª IATF" valor={fmtTaxa(ind.concepcao2)} nota={ind.concepcao2.d ? `${num(ind.concepcao2.n)} de ${num(ind.concepcao2.d)}` : 'Sem DG do 2º ciclo'} />
                  <Indicador rotulo="Prenhez acumulada" valor={fmtTaxa(ind.prenhez)} nota={`${num(ind.prenhez.n)} de ${num(ind.prenhez.d)} aptas`} />
                  <Indicador rotulo="Perda gestacional" valor={fmtTaxa(ind.perdaGestacional)} nota={ind.perdaGestacional.d ? `${num(ind.perdaGestacional.n)} de ${num(ind.perdaGestacional.d)} no DG final` : 'Sem DG final'} />
                  <Indicador rotulo="Doses por prenhez" valor={ind.dosesPorPrenhez != null ? num(ind.dosesPorPrenhez, 2) : '—'} nota="Nos lotes com DG" />
                </dl>
              ) : (
                <EmptyState
                  title="Sem DG nesta estação ainda"
                  body={`Concepção, prenhez acumulada, perda gestacional e doses por prenhez saem do diagnóstico.${dgPrevisto ? ` Primeiro DG previsto para ${fmtData(dgPrevisto)}.` : ''}`}
                />
              )}
            </Card>
          </div>

          <Card title="Lotes" subtitle="Lote da sessão do implante · clique para ver o detalhe" padding="" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 text-left font-medium">Lote</th>
                    <th className="px-4 py-2 text-left font-medium">Categoria</th>
                    <th className="px-4 py-2 text-left font-medium">Etapa atual</th>
                    <th className="px-4 py-2 text-left font-medium">Próxima (prevista)</th>
                    <th className="px-4 py-2 text-right font-medium">Matrizes</th>
                    <th className="px-4 py-2 text-right font-medium">Implante</th>
                    <th className="px-4 py-2 text-right font-medium">D8</th>
                    <th className="px-4 py-2 text-right font-medium">Insem.</th>
                    <th className="px-4 py-2 text-right font-medium">DG prenhas</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((l) => {
                    const link = href({ lote: l.loteId ?? SEM_LOTE });
                    return (
                      <tr key={l.loteId ?? SEM_LOTE} className="border-b border-border-subtle last:border-b-0 hover:bg-grey-25">
                        <td className="px-4 py-2.5">
                          <Link href={link} className="font-medium text-fg-brand hover:underline">
                            {nomeLote(l.loteId, data.loteNome)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-fg-muted">{l.categoria ?? '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {l.atual ? (
                            <>
                              {ETAPA_LABELS[l.atual.etapa]} <span className="tabular text-fg-muted">· {fmtDia(l.atual.dia)}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {l.proxima ? (
                            <>
                              {l.proxima.rotulo}
                              {l.proxima.prevista ? <span className="tabular text-fg-muted"> · {fmtDia(l.proxima.prevista)}</span> : null}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right">{num(l.funil.matrizes)}</td>
                        <td className="tabular px-4 py-2.5 text-right">{num(l.funil.implante)}</td>
                        <td className="tabular px-4 py-2.5 text-right">{l.funil.d8 ? num(l.funil.d8) : <span className="text-fg-muted">—</span>}</td>
                        <td className="tabular px-4 py-2.5 text-right">
                          {l.funil.inseminacao ? (
                            <>
                              {num(l.funil.inseminacao)}
                              <span className="ml-1 text-fg-muted">{fmtPct(l.funil.inseminacao / l.funil.implante)}</span>
                            </>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right">
                          {l.funil.dg.total ? (
                            <>
                              {num(l.funil.dg.prenha)}
                              <span className="ml-1 text-fg-muted">{fmtPct(l.funil.dg.prenha / l.funil.dg.total)}</span>
                            </>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Sêmen por touro" subtitle={`${num(touros.doses)} doses na estação`}>
              {touros.doses ? <TabelaTouros linhas={touros.porTouro} total={touros.doses} comRaca /> : <EmptyState title="Nenhuma inseminação ainda" />}
            </Card>
            <Card title="Sêmen por raça">
              {touros.doses ? <TabelaTouros linhas={touros.porRaca} total={touros.doses} /> : <EmptyState title="Nenhuma inseminação ainda" />}
              {touros.doses ? (
                <div className="mt-4">
                  <Rotulo>Inseminador</Rotulo>
                  <div className="mt-2">
                    <Barras itens={touros.porInseminador.map((i) => ({ rotulo: i.rotulo, n: i.doses, extra: fmtPct(i.doses / touros.doses) }))} />
                  </div>
                  {touros.porInseminador.every((i) => i.rotulo === 'Não informado') ? (
                    <p className="mt-2 text-[12px] text-fg-muted">O inseminador é o campo Veterinário da sessão de inseminação no app.</p>
                  ) : null}
                </div>
              ) : null}
            </Card>
            <Card title="Concepção por touro" subtitle={`Pelo DG do ciclo · amostra pequena abaixo de ${AMOSTRA_MINIMA} doses`}>
              {ind.temDg ? <TabelaConcepcao linhas={touros.porTouro} /> : <EmptyState title="Depois do DG" body="A concepção por touro sai do diagnóstico da inseminação." />}
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Ovário no implante" subtitle={`D0 do 1º ciclo · ${num(fatores.ovario.reduce((a, o) => a + o.n, 0))} de ${num(fatores.aptas)} com registro`}>
              {fatores.ovario.length ? <Distribuicao itens={fatores.ovario} rotulo={rotuloOvario} /> : <EmptyState title="Sem ovário registrado" />}
              <div className="mt-4">
                <TabelaPrenhez itens={fatores.ovario} titulo="Ovário" rotulo={rotuloOvario} />
              </div>
            </Card>
            <Card
              title="Escore de condição corporal (ECC)"
              subtitle={`D0 do 1º ciclo${fatores.eccMedio != null ? ` · média ${num(fatores.eccMedio, 2)}` : ''}`}
            >
              {fatores.ecc.length ? <Distribuicao itens={fatores.ecc} /> : <EmptyState title="Sem ECC registrado" />}
              <div className="mt-4">
                <TabelaPrenhez itens={fatores.ecc} titulo="ECC" />
              </div>
            </Card>
          </div>

          {ind.temDg ? (
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Prenhez no 1º DG por categoria">
                <TabelaPrenhez itens={fatores.categoria} titulo="Categoria" />
              </Card>
              <Card title="Prenhez no 1º DG por lote">
                <TabelaPrenhez itens={fatores.lote} titulo="Lote" rotulo={(k) => nomeLote(k || null, data.loteNome)} />
              </Card>
            </div>
          ) : null}

          <p className="mt-4 text-[12px] text-fg-muted">
            Fonte: app do Curral. O lote de cada matriz é o da sessão do implante (o DG muda o animal de lote). Implante e protocolo são o
            mesmo D0; datas previstas seguem D8 = implante + 8 dias, inseminação = D8 + 2, DG = inseminação + 30. Categoria é a de hoje do
            animal; novilhas = categorias que começam com NOVILHA.
          </p>
        </>
      )}
    </main>
  );
}

function Indicador({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <dt>
        <Rotulo>{rotulo}</Rotulo>
      </dt>
      <dd className="mt-1">
        <span className="tabular text-h2 font-semibold text-fg">{valor}</span>
        {nota ? <span className="mt-0.5 block text-[12px] text-fg-muted">{nota}</span> : null}
      </dd>
    </div>
  );
}

// ----------------------------------------------------------------------------

function DetalheLote({ r, data, estacao }: { r: ResumoLote; data: IatfData; estacao: string }) {
  const ind = calcularIndicadores(r.animais);
  const touros = calcularTouros(r.animais, data.touros);
  const fatores = calcularFatores(r.animais);
  const gmd = gmdDoLote(r.animais, data.pesagens, estacao);
  const faltas = quemFaltou(r);
  const minimo = Math.max(1, Math.ceil(r.animais.length * FRACAO_MINIMA_ETAPA));

  return (
    <section>
      <Card
        title={nomeLote(r.loteId, data.loteNome)}
        subtitle={`${r.categoria ?? 'Sem categoria'} · ${num(r.funil.matrizes)} matrizes`}
        className="mb-4"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <div>
            <Rotulo>Etapa atual</Rotulo>
            <p className="mt-1 text-[13px] text-fg">{r.atual ? `${ETAPA_LABELS[r.atual.etapa]} · ${fmtData(r.atual.dia)}` : '—'}</p>
          </div>
          <div>
            <Rotulo>Próxima etapa</Rotulo>
            <p className="mt-1 text-[13px] text-fg">
              {r.proxima ? `${r.proxima.rotulo}${r.proxima.prevista ? ` · prevista ${fmtData(r.proxima.prevista)}` : ''}` : '—'}
            </p>
          </div>
          <div>
            <Rotulo>Peso médio na estação</Rotulo>
            <p className="tabular mt-1 text-[13px] text-fg">
              {gmd.pesoMedio != null ? `${num(gmd.pesoMedio)} kg · ${num(gmd.pesoMedio / 30, 1)} @ (${num(gmd.comPeso)} pesadas)` : 'Sem pesagem'}
            </p>
          </div>
          <div>
            <Rotulo>GMD</Rotulo>
            <p className="tabular mt-1 text-[13px] text-fg">
              {gmd.gmd != null ? `${num(gmd.gmd, 3)} kg/dia (${num(gmd.comGmd)} com pesagem anterior)` : 'Sem pesagem anterior para comparar'}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Implantadas" value={num(ind.implantadas)} unit="cab" />
        <KPICard label="Inseminadas" value={num(ind.inseminadas)} unit="cab" hint={`Taxa de serviço ${fmtTaxa(ind.taxaServico)}`} />
        <KPICard
          label="Perda de implante"
          value={fmtTaxa(ind.perdaImplante, 1)}
          accent={ind.perdaImplante.n > 0 ? 'warn' : undefined}
          hint={ind.perdaImplante.d ? `${num(ind.perdaImplante.n)} de ${num(ind.perdaImplante.d)} no D8` : 'Sem D8 registrado'}
        />
        <KPICard
          label="Prenhas (DG)"
          value={ind.temDg ? num(ind.prenhas) : '—'}
          hint={ind.temDg ? `Prenhez ${fmtTaxa(ind.prenhez)}` : r.proxima?.rotulo === 'DG' && r.proxima.prevista ? `DG previsto para ${fmtData(r.proxima.prevista)}` : 'Aguardando o DG'}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <Card title="Linha do tempo" subtitle="Sessões com animais do lote">
          <ol className="space-y-2 text-[13px]">
            {r.etapas.map((e) => (
              <li key={e.sessaoId} className={`flex items-baseline justify-between gap-3 ${e.animais < minimo ? 'text-fg-muted' : ''}`}>
                <span>
                  <span className="tabular">{fmtData(e.dia)}</span> · <span className="font-medium">{ETAPA_LABELS[e.etapa]}</span>
                </span>
                <span className="tabular">{num(e.animais)} cab</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Funil do lote" subtitle="Chegou a esta etapa ou além · % sobre a etapa anterior">
          <FunilView f={r.funil} />
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Touros" subtitle={`${num(touros.doses)} doses`}>
          {touros.doses ? <TabelaTouros linhas={touros.porTouro} total={touros.doses} comRaca /> : <EmptyState title="Nenhuma inseminação ainda" />}
          {ind.temDg && touros.doses ? (
            <div className="mt-4">
              <TabelaConcepcao linhas={touros.porTouro} />
            </div>
          ) : null}
        </Card>
        <Card title="Ovário no implante">
          {fatores.ovario.length ? <Distribuicao itens={fatores.ovario} rotulo={rotuloOvario} /> : <EmptyState title="Sem ovário registrado" />}
          <div className="mt-4">
            <TabelaPrenhez itens={fatores.ovario} titulo="Ovário" rotulo={rotuloOvario} />
          </div>
        </Card>
        <Card title="ECC no implante" subtitle={fatores.eccMedio != null ? `Média ${num(fatores.eccMedio, 2)}` : undefined}>
          {fatores.ecc.length ? <Distribuicao itens={fatores.ecc} /> : <EmptyState title="Sem ECC registrado" />}
          <div className="mt-4">
            <TabelaPrenhez itens={fatores.ecc} titulo="ECC" />
          </div>
        </Card>
      </div>

      <Card title="Quem faltou em cada etapa" subtitle="Passou na etapa anterior do lote e não tem registro nesta">
        {faltas.length === 0 ? (
          <EmptyState title="Nada a conferir ainda" body="O lote só passou por uma etapa nesta estação." />
        ) : (
          <div className="space-y-4">
            {faltas.map((f) => (
              <div key={f.etapa}>
                <p className="text-[13px] font-medium text-fg">
                  {ETAPA_LABELS[f.etapa]} de {fmtData(f.dia)}:{' '}
                  {f.animais.length ? `${num(f.animais.length)} faltaram` : 'ninguém faltou'}
                  <span className="font-normal text-fg-muted"> · base: {ETAPA_LABELS[f.anterior].toLowerCase()}</span>
                </p>
                {f.animais.length ? (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {f.animais.map((a) => {
                      const perdeu = a.ciclos[0]?.d8.some((e) => e.implant_lost) ?? false;
                      return (
                        <li
                          key={a.animalId}
                          className="tabular rounded-md border border-border bg-grey-25 px-2 py-0.5 text-[12px] text-fg"
                          title={a.eid ?? undefined}
                        >
                          {brinco(a.eid)}
                          {perdeu ? <span className="ml-1 text-warning">perdeu implante</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[12px] text-fg-muted">Brinco pelos 6 últimos dígitos (o completo ao passar o mouse).</p>
      </Card>
    </section>
  );
}
