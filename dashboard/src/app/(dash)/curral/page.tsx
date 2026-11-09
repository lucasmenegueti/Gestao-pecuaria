import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Fence } from 'lucide-react';
import { AlertCard, Card, EmptyState, KPICard, StatusPill } from '@/components/ui-primitives';
import { PeriodPicker } from '@/components/period-picker';
import { PrintButton } from '@/components/print-button';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { loadCurralData, type LoteInfo } from '@/lib/curral';
import {
  IATF_STAGE_LABELS,
  INICIO_OPERACAO_REAL,
  OP_LABELS,
  OVARY_LABELS,
  PAUSA_MS,
  PESO_MAX_KG,
  PESO_MIN_KG,
  type PassagemDetalhe,
  type SessaoResumo,
} from '@/lib/curral-calc';
import { parsePeriodFromSearchParams } from '@/lib/period';

export const dynamic = 'force-dynamic';

const TZ = 'America/Sao_Paulo';
const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fmtDiaHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num = (x: number, casas = 0) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

function fmtDuracao(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

function fmtRitmo(seg: number | null): string {
  if (seg == null) return '—';
  return seg < 120 ? `${Math.round(seg)} s` : `${num(seg / 60, 1)} min`;
}

function rotuloOps(r: SessaoResumo): string[] {
  return r.ops.map((o) =>
    o === 'iatf' && r.sessao.iatf_stage
      ? `IATF · ${IATF_STAGE_LABELS[r.sessao.iatf_stage] ?? r.sessao.iatf_stage}`
      : OP_LABELS[o] ?? o,
  );
}

function StatusSessao({ status }: { status: string }) {
  if (status === 'fechada') return <StatusPill kind="ok" label="Fechada" size="sm" />;
  if (status === 'aberta') return <StatusPill kind="warn" label="Aberta" size="sm" />;
  return <StatusPill kind="neutral" label={status} size="sm" />;
}

function nomeLote(id: string | null, lotes: Map<string, LoteInfo>): string {
  if (!id) return 'Sem lote';
  return lotes.get(id)?.nome ?? '—';
}

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; sessao?: string }>;
}

export default async function CurralPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Sem ?periodo = desde o início da operação real.
  const period = params.periodo ? parsePeriodFromSearchParams(params) : null;
  const session = await getSessionOrRedirect();

  // Mantém o período ao abrir/fechar uma sessão.
  const qsBase = new URLSearchParams();
  if (params.periodo) qsBase.set('periodo', params.periodo);
  if (params.inicio) qsBase.set('inicio', params.inicio);
  if (params.fim) qsBase.set('fim', params.fim);
  const hrefSessao = (id: string | null) => {
    const qs = new URLSearchParams(qsBase);
    if (id) qs.set('sessao', id);
    const s = qs.toString();
    return s ? `/curral?${s}` : '/curral';
  };

  const cabecalho = (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Pecuária · manejo</p>
        <h1 className="mt-1 text-h2 font-semibold tracking-tight text-fg md:text-h1">Curral</h1>
        <p className="mt-1 text-small text-fg-muted">
          {period ? period.label : `Todas as sessões desde o início da operação (${fmtData(INICIO_OPERACAO_REAL)})`}
        </p>
      </div>
      <div className="flex items-center gap-2 print:hidden">
        <PrintButton />
        <PeriodPicker value={period?.kind ?? ''} allLabel="Todas as sessões" />
      </div>
    </div>
  );

  if (!session.curralAccessToken) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {cabecalho}
        <AlertCard
          kind="warning"
          title="Sem acesso ao banco do Curral nesta sessão"
          body="O Curral fica num banco separado e o acesso a ele é feito no login. Saia e entre de novo. Se continuar assim, o seu usuário ou a sua senha não são os mesmos no Curral."
        />
      </main>
    );
  }

  const data = await loadCurralData(
    session.curralAccessToken,
    period ? { start: period.start, end: period.end } : undefined,
    params.sessao,
  );
  if (!data) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        {cabecalho}
        <Card>
          <EmptyState icon={Fence} title="Curral não configurado" body="Faltam CURRAL_SUPABASE_URL e CURRAL_SUPABASE_ANON_KEY no ambiente." />
        </Card>
      </main>
    );
  }

  const { cenario: c, loteById, usuarioById } = data;
  const t = c.totais;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      {cabecalho}

      {data.selecionada && data.detalhe ? (
        <DetalheSessao
          r={data.selecionada}
          detalhe={data.detalhe}
          loteById={loteById}
          usuario={data.selecionada.sessao.user_id ? usuarioById.get(data.selecionada.sessao.user_id) : undefined}
          voltar={hrefSessao(null)}
        />
      ) : params.sessao ? (
        <div className="mb-6">
          <AlertCard
            kind="warning"
            title="Sessão não encontrada"
            body="Ela pode ter sido excluída no app, ou ser uma sessão de teste anterior ao início da operação."
          />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          label="Sessões de curral"
          value={t.sessoes}
          hint={c.ocultas > 0 ? `${c.ocultas} de teste ou canceladas ocultas` : undefined}
        />
        <KPICard
          label="Passagens"
          value={num(t.passagens)}
          unit="cab"
          hint={`${num(t.animaisDistintos)} animais diferentes`}
        />
        <KPICard
          label="Tempo de curral"
          value={fmtDuracao(t.ativoMs)}
          hint={`Do 1º ao último bipe, sem pausas de mais de ${PAUSA_MS / 60_000} min`}
        />
        <KPICard
          label="Ritmo"
          value={fmtRitmo(t.ritmoSeg)}
          unit="por animal"
          hint={t.ritmoSeg ? `Mediana entre bipes · ≈ ${num(3600 / t.ritmoSeg)} animais/h` : undefined}
        />
      </div>

      {t.pesosSuspeitos > 0 ? (
        <div className="mb-6">
          <AlertCard
            kind="warning"
            title={`${t.pesosSuspeitos} peso(s) fora de ${PESO_MIN_KG}–${num(PESO_MAX_KG)} kg ficaram fora das médias`}
            body="Provável erro de digitação. Dá para corrigir no fechamento da sessão, no app do Curral."
          />
        </div>
      ) : null}

      <Card
        title="Sessões"
        subtitle="Clique numa sessão para ver o que aconteceu animal a animal"
        padding=""
      >
        {c.sessoes.length === 0 ? (
          <EmptyState icon={Fence} title={period ? 'Nenhuma sessão no período' : 'Nenhuma sessão de curral ainda'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                  <th className="px-4 py-2 text-left font-medium">Lote</th>
                  <th className="px-4 py-2 text-left font-medium">Operações</th>
                  <th className="px-4 py-2 text-right font-medium">Animais</th>
                  <th className="px-4 py-2 text-right font-medium">Peso médio</th>
                  <th className="px-4 py-2 text-right font-medium">Bipes</th>
                  <th className="px-4 py-2 text-right font-medium">Tempo</th>
                  <th className="px-4 py-2 text-right font-medium">Ritmo</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {c.sessoes.map((r, i) => {
                  const lote = r.sessao.lot_id ? loteById.get(r.sessao.lot_id) : undefined;
                  const ativa = r.sessao.id === params.sessao;
                  return (
                    <tr
                      key={r.sessao.id}
                      className={`${i === c.sessoes.length - 1 ? '' : 'border-b border-border-subtle'} ${ativa ? 'bg-nsa-green-50' : 'hover:bg-grey-25'}`}
                    >
                      <td className="tabular px-4 py-2.5 whitespace-nowrap">
                        <Link href={hrefSessao(r.sessao.id)} className="font-medium text-fg-brand hover:underline">
                          {fmtData(r.sessao.date)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={hrefSessao(r.sessao.id)} className="font-medium text-fg hover:underline">
                          {nomeLote(r.sessao.lot_id, loteById)}
                        </Link>
                        {lote?.piquete ? <span className="ml-1.5 text-fg-muted">· {lote.piquete}</span> : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {rotuloOps(r).map((o) => (
                            <StatusPill key={o} kind="brand" label={o} size="sm" dot={false} />
                          ))}
                          {r.sessao.protocol_name ? (
                            <StatusPill kind="info" label="Sanitário" size="sm" dot={false} />
                          ) : null}
                        </div>
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">
                        <span className="font-semibold text-fg">{r.animais}</span>
                        {r.novos > 0 ? <span className="ml-1 text-fg-muted">({r.novos} novos)</span> : null}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">
                        {r.pesoMedio != null ? `${num(r.pesoMedio)} kg` : '—'}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right whitespace-nowrap text-fg-muted">
                        {r.tempos.inicio ? `${fmtHora(r.tempos.inicio)}–${fmtHora(r.tempos.fim!)}` : '—'}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">{r.animais > 1 ? fmtDuracao(r.tempos.ativoMs) : '—'}</td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">{fmtRitmo(r.tempos.ritmoSeg)}</td>
                      <td className="px-4 py-2.5">
                        <StatusSessao status={r.sessao.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-[12px] text-fg-muted">
        Fonte: app do Curral (sessões e passagens por brinco). Tempo e ritmo vêm dos bipes, não da hora em que a
        sessão foi aberta ou fechada no app. A categoria é a de hoje do animal.
      </p>
    </main>
  );
}

// ----------------------------------------------------------------------------

function Fato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{rotulo}</p>
      <div className="mt-1 text-[13px] text-fg">{children}</div>
    </div>
  );
}

function Distribuicao({ itens }: { itens: Array<{ rotulo: string; n: number }> }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <ul className="space-y-1.5">
      {itens.map((i) => (
        <li key={i.rotulo} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-[13px]">
          <span className="truncate text-fg">{i.rotulo}</span>
          <span className="h-2 overflow-hidden rounded-full bg-border-subtle">
            <span className="block h-full rounded-full bg-nsa-green-500" style={{ width: `${(i.n / max) * 100}%` }} />
          </span>
          <span className="tabular text-right font-medium text-fg">{i.n}</span>
        </li>
      ))}
    </ul>
  );
}

/** Faixas de 25 kg para ver a dispersão do lote (o que orienta uma apartação). */
function faixasDePeso(pesos: number[]): Array<{ rotulo: string; n: number }> {
  if (pesos.length === 0) return [];
  const passo = 25;
  const ini = Math.floor(Math.min(...pesos) / passo) * passo;
  const fim = Math.floor(Math.max(...pesos) / passo) * passo;
  const out: Array<{ rotulo: string; n: number }> = [];
  for (let f = ini; f <= fim; f += passo) {
    out.push({ rotulo: `${f}–${f + passo - 1} kg`, n: pesos.filter((p) => p >= f && p < f + passo).length });
  }
  return out;
}

function DetalheSessao({
  r,
  detalhe,
  loteById,
  usuario,
  voltar,
}: {
  r: SessaoResumo;
  detalhe: PassagemDetalhe[];
  loteById: Map<string, LoteInfo>;
  usuario?: string;
  voltar: string;
}) {
  const s = r.sessao;
  const lote = s.lot_id ? loteById.get(s.lot_id) : undefined;
  const pesos = detalhe.filter((d) => d.pesoValido).map((d) => d.passagem.weight_kg!);
  const temIatf = r.prenhas + r.vazias > 0 || r.ovarios.length > 0 || r.comEcc > 0;
  const temObs = detalhe.some((d) => d.passagem.notes?.trim() || d.passagem.exam_notes?.trim());
  const temPeso = detalhe.some((d) => d.passagem.weight_kg != null);
  const itensProtocolo = (s.protocol_items ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <section className="mb-8">
      <Link href={voltar} className="mb-3 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg print:hidden">
        <ArrowLeft size={14} strokeWidth={1.75} /> Fechar sessão
      </Link>

      <Card
        title={`Sessão de ${fmtData(s.date)} · ${nomeLote(s.lot_id, loteById)}`}
        subtitle={lote?.piquete ? `Piquete ${lote.piquete}` : undefined}
        action={<StatusSessao status={s.status} />}
        className="mb-4"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <Fato rotulo="Operações">
            <div className="flex flex-wrap gap-1">
              {rotuloOps(r).map((o) => (
                <StatusPill key={o} kind="brand" label={o} size="sm" dot={false} />
              ))}
            </div>
          </Fato>
          <Fato rotulo="Quem conduziu">{usuario ?? '—'}</Fato>
          <Fato rotulo="Bipes">
            {r.tempos.inicio ? (
              <span className="tabular">
                {fmtDiaHora(r.tempos.inicio)} → {fmtHora(r.tempos.fim!)}
              </span>
            ) : (
              '—'
            )}
          </Fato>
          <Fato rotulo="No app">
            <span className="tabular">
              Aberta {fmtDiaHora(s.started_at)}
              {s.closed_at ? ` · fechada ${fmtDiaHora(s.closed_at)}` : ''}
            </span>
          </Fato>
          {s.default_category ? <Fato rotulo="Categoria de entrada">{s.default_category}</Fato> : null}
          {s.origin ? <Fato rotulo="Origem">{s.origin}</Fato> : null}
          {s.vet ? <Fato rotulo="Veterinário">{s.vet}</Fato> : null}
          {s.buyer ? (
            <Fato rotulo="Venda">
              {s.buyer}
              {s.sale_head_count ? ` · ${s.sale_head_count} cab` : ''}
              {s.sale_total_kg ? ` · ${num(s.sale_total_kg)} kg` : ''}
            </Fato>
          ) : null}
        </div>

        {s.protocol_name ? (
          <div className="mt-4 rounded-md border border-border-subtle bg-grey-25 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">Protocolo sanitário</p>
            <p className="mt-1 text-[13px] font-medium text-fg">{s.protocol_name}</p>
            {itensProtocolo.length ? (
              <ul className="mt-1 list-disc pl-5 text-[13px] text-fg">
                {itensProtocolo.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {s.notes ? <p className="mt-3 text-[13px] text-fg-muted">Obs.: {s.notes}</p> : null}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          label="Animais"
          value={r.animais}
          unit="cab"
          hint={[r.novos ? `${r.novos} novos` : null, r.mudaramLote ? `${r.mudaramLote} mudaram de lote` : null]
            .filter(Boolean)
            .join(' · ') || undefined}
        />
        <KPICard
          label="Peso médio"
          value={r.pesoMedio != null ? num(r.pesoMedio) : '—'}
          unit={r.pesoMedio != null ? 'kg' : undefined}
          accent={r.pesosSuspeitos > 0 ? 'warn' : undefined}
          hint={
            r.pesoMin != null
              ? `${num(r.pesoMin)}–${num(r.pesoMax!)} kg · ${num(r.pesoMedio! / 30, 1)} @${r.pesosSuspeitos ? ` · ${r.pesosSuspeitos} fora da faixa` : ''}`
              : 'Sessão sem pesagem'
          }
        />
        <KPICard
          label="Tempo de curral"
          value={r.animais > 1 ? fmtDuracao(r.tempos.ativoMs) : '—'}
          hint={
            r.tempos.pausas
              ? `${r.tempos.pausas} pausa(s) somando ${fmtDuracao(r.tempos.pausaMs)} · total ${fmtDuracao(r.tempos.duracaoMs)}`
              : 'Sem pausas longas'
          }
        />
        <KPICard
          label="Ritmo"
          value={fmtRitmo(r.tempos.ritmoSeg)}
          unit="por animal"
          hint={r.tempos.ritmoSeg ? `≈ ${num(3600 / r.tempos.ritmoSeg)} animais/h` : undefined}
        />
      </div>

      {r.comPesagemAnterior > 0 ? (
        <div className="mb-4">
          <AlertCard
            kind="info"
            title={`${r.comPesagemAnterior} animal(is) já tinham pesagem anterior: ganho médio de ${num(r.ganhoMedioKg!, 1)} kg${
              r.gmdMedio != null ? ` · GMD ${num(r.gmdMedio, 3)} kg/dia` : ''
            }`}
            body="Comparado com a última pesagem do mesmo animal em outra sessão. O ganho de cada um está na tabela abaixo."
          />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Categorias" subtitle="Categoria de hoje dos animais que passaram">
          <Distribuicao itens={r.categorias.map((x) => ({ rotulo: x.categoria, n: x.n }))} />
        </Card>
        <Card title="Para onde foram" subtitle="Lote de cada animal ao sair do curral">
          <Distribuicao itens={r.destinos.map((x) => ({ rotulo: nomeLote(x.lotId, loteById), n: x.n }))} />
        </Card>
        {pesos.length ? (
          <Card title="Distribuição de peso" subtitle="Faixas de 25 kg">
            <Distribuicao itens={faixasDePeso(pesos)} />
          </Card>
        ) : temIatf ? (
          <Card title="Reprodução" subtitle="Registrado na passagem">
            <Distribuicao
              itens={[
                ...(r.prenhas + r.vazias > 0
                  ? [
                      { rotulo: 'Prenhas', n: r.prenhas },
                      { rotulo: 'Vazias', n: r.vazias },
                    ]
                  : []),
                ...r.ovarios.map((o) => ({ rotulo: OVARY_LABELS[o.status] ?? o.status, n: o.n })),
              ]}
            />
            {r.eccMedio != null ? (
              <p className="mt-3 text-[12px] text-fg-muted">
                ECC médio {num(r.eccMedio, 1)} ({r.comEcc} animais avaliados)
              </p>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Card title="Animal a animal" subtitle={`${detalhe.length} passagens na ordem dos bipes`} padding="">
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                <th className="px-4 py-2 text-right font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Hora</th>
                <th className="px-4 py-2 text-left font-medium">Brinco</th>
                <th className="px-4 py-2 text-left font-medium">Categoria</th>
                {temPeso ? <th className="px-4 py-2 text-right font-medium">Peso</th> : null}
                {temPeso ? <th className="px-4 py-2 text-right font-medium">Ganho</th> : null}
                {temIatf ? <th className="px-4 py-2 text-left font-medium">Reprodução</th> : null}
                <th className="px-4 py-2 text-left font-medium">Lote</th>
                <th className="px-4 py-2 text-right font-medium">Intervalo</th>
                {temObs ? <th className="px-4 py-2 text-left font-medium">Obs.</th> : null}
              </tr>
            </thead>
            <tbody>
              {detalhe.map((d) => {
                const p = d.passagem;
                const de = p.from_lot_id;
                const para = p.to_lot_id;
                const iatf = [
                  p.iatf_result ? (p.iatf_result === 'PRENHA' ? 'Prenha' : 'Vazia') : null,
                  p.ovary_status ? OVARY_LABELS[p.ovary_status] ?? p.ovary_status : null,
                  p.body_score != null ? `ECC ${num(Number(p.body_score), 1)}` : null,
                ].filter(Boolean);
                const pausa = d.intervaloSeg != null && d.intervaloSeg * 1000 > PAUSA_MS;
                return (
                  <tr key={p.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="tabular px-4 py-2 text-right text-fg-muted">{d.ordem}</td>
                    <td className="tabular px-4 py-2 text-fg-muted">{fmtHora(p.event_at)}</td>
                    <td className="tabular px-4 py-2 font-medium text-fg">
                      {p.eid ? p.eid.slice(-6) : '—'}
                      {d.novo ? <span className="ml-1.5 text-[11px] font-normal text-fg-muted">novo</span> : null}
                    </td>
                    <td className="px-4 py-2">{d.categoria ?? '—'}</td>
                    {temPeso ? (
                      <td className={`tabular whitespace-nowrap px-4 py-2 text-right ${d.pesoValido ? '' : 'text-danger'}`}>
                        {p.weight_kg != null ? `${num(p.weight_kg)} kg` : '—'}
                      </td>
                    ) : null}
                    {temPeso ? (
                      <td className="tabular whitespace-nowrap px-4 py-2 text-right text-fg-muted">
                        {d.anterior
                          ? `${d.anterior.ganhoKg >= 0 ? '+' : ''}${num(d.anterior.ganhoKg)} kg em ${d.anterior.dias} d`
                          : '—'}
                      </td>
                    ) : null}
                    {temIatf ? <td className="px-4 py-2">{iatf.join(' · ') || '—'}</td> : null}
                    <td className="px-4 py-2">
                      {de && de !== para ? (
                        <span className="text-fg-muted">{nomeLote(de, loteById)} → </span>
                      ) : null}
                      {nomeLote(para, loteById)}
                    </td>
                    <td className={`tabular px-4 py-2 text-right ${pausa ? 'font-medium text-warning' : 'text-fg-muted'}`}>
                      {d.intervaloSeg != null ? fmtRitmo(d.intervaloSeg) : '—'}
                    </td>
                    {temObs ? (
                      <td className="px-4 py-2 text-fg-muted">
                        {[p.exam_notes, p.notes].filter((x) => x?.trim()).join(' · ') || ''}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-2 text-[12px] text-fg-muted">
        Brinco mostrado pelos 6 últimos dígitos. Intervalo em destaque = pausa de mais de {PAUSA_MS / 60_000} min.
      </p>
    </section>
  );
}
