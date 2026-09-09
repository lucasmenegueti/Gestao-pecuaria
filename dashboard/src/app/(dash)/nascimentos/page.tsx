import { AlertCard, Card, EmptyState, KPICard, StatusPill } from '@/components/ui-primitives';
import { loadNascimentosData } from '@/lib/nascimentos';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { Baby } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Cores de série tiradas dos tokens (info / warning) — par validado para
// daltonismo e contraste sobre o fundo dos cards.
const COR_MACHOS = '#3a6ea5';
const COR_FEMEAS = '#b88217';

const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;

export default async function NascimentosPage() {
  const session = await getSessionOrRedirect();
  const data = await loadNascimentosData(session.accessToken);
  const c = data.cenario;
  const nomeDe = (id: string | null) => (id ? data.paddockNameById.get(id) ?? '—' : '—');

  const { prenhas, paridas } = data.matrizes;
  const matrizesTotal = prenhas + paridas;
  const progressoParicao = matrizesTotal > 0 ? paridas / matrizesTotal : null;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      {/* A estação de cria não cabe no recorte de período das outras abas:
          aqui a janela é sempre do primeiro parto registrado até hoje. */}
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
          Pecuária · estação de cria
        </p>
        <h1 className="mt-1 text-h2 font-semibold tracking-tight text-fg md:text-h1">Nascimentos</h1>
        <p className="mt-1 text-small text-fg-muted">
          {c.inicioEstacao
            ? `Estação inteira — do primeiro parto registrado (${fmtData(c.inicioEstacao)}) até hoje`
            : 'Nenhum nascimento registrado no app de campo ainda'}
        </p>
      </div>

      {c.eventosDuplicados > 0 ? (
        <div className="mb-4">
          <AlertCard
            kind="warning"
            title={`${c.eventosDuplicados} registro(s) idênticos no mesmo dia e piquete foram contados uma vez só`}
            body="Provável duplicação do sync do app (bug conhecido). Se foram mesmo partos ou mortes separados iguais, o total real é maior que o mostrado."
          />
        </div>
      ) : null}

      {c.total === 0 ? (
        <Card>
          <EmptyState
            icon={Baby}
            title="Sem nascimentos registrados"
            body="Quando o peão registrar o primeiro parto no app, a estação aparece aqui."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard
              label="Nascimentos na estação"
              value={c.total.toLocaleString('pt-BR')}
              unit="cab"
              accent="ok"
              hint={`${c.registros} registros · último em ${fmtData(c.ultimoNascimento!)}`}
            />
            <KPICard
              label="Machos"
              value={c.machos.toLocaleString('pt-BR')}
              unit="cab"
              hint={`${pct(c.machos / c.total)} dos nascimentos`}
            />
            <KPICard
              label="Fêmeas"
              value={c.femeas.toLocaleString('pt-BR')}
              unit="cab"
              hint={`${pct(c.femeas / c.total)} dos nascimentos`}
            />
            <KPICard
              label="Mortes de crias"
              value={c.mortesCriasCab}
              unit="cab"
              accent={c.mortesCriasCab > 0 ? 'warn' : undefined}
              hint={
                c.taxaMortalidadeCrias != null
                  ? `${pct(c.taxaMortalidadeCrias)} dos nascidos na estação`
                  : undefined
              }
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card
              title="Nascimentos por semana"
              subtitle={`Semana começando na segunda · ${c.porSemana.length} semanas de estação`}
            >
              <BarrasSemanais semanas={c.porSemana} />
            </Card>

            <Card
              title="Andamento da parição"
              subtitle="Estado de hoje das categorias do rebanho — aproximação, inclui ajustes manuais"
            >
              {progressoParicao == null ? (
                <EmptyState title="Sem matrizes cadastradas" />
              ) : (
                <div className="py-2">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="font-medium text-fg">Vacas paridas</span>
                    <span className="tabular text-fg-muted">
                      <span className="font-medium text-fg">{paridas.toLocaleString('pt-BR')}</span>
                      <span className="mx-1.5 text-grey-300">·</span>
                      {pct(progressoParicao)} das matrizes
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border-subtle">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${Math.min(100, progressoParicao * 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[12px] text-fg-muted">
                    Ainda por parir: <span className="tabular font-medium text-fg">{prenhas.toLocaleString('pt-BR')}</span> matrizes
                    prenhas (vacas e novilhas). Mortes de matrizes na estação:{' '}
                    <span className="tabular font-medium text-fg">{c.mortesMatrizesCab}</span>.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card
              title="Onde nasceram"
              subtitle={`${c.porPiquete.length} piquetes com parto na estação`}
              padding=""
            >
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 text-left font-medium">Piquete</th>
                    <th className="px-4 py-2 text-right font-medium">Machos</th>
                    <th className="px-4 py-2 text-right font-medium">Fêmeas</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Último parto</th>
                  </tr>
                </thead>
                <tbody>
                  {c.porPiquete.map((p, i) => (
                    <tr key={p.paddockId} className={i === c.porPiquete.length - 1 ? '' : 'border-b border-border-subtle'}>
                      <td className="px-4 py-2.5 font-medium text-fg">{nomeDe(p.paddockId)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{p.machos}</td>
                      <td className="tabular px-4 py-2.5 text-right">{p.femeas}</td>
                      <td className="tabular px-4 py-2.5 text-right font-semibold text-fg">{p.total}</td>
                      <td className="tabular px-4 py-2.5 text-right text-fg-muted">{fmtDia(p.ultimaData)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card
              title="Onde estão as crias hoje"
              subtitle="As crias andam com as vacas — o piquete atual pode não ser onde nasceram"
              padding=""
            >
              {data.maternidade.length === 0 ? (
                <EmptyState title="Sem crias ou matrizes alocadas" />
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                      <th className="px-4 py-2 text-left font-medium">Piquete</th>
                      <th className="px-4 py-2 text-right font-medium">Bezerros</th>
                      <th className="px-4 py-2 text-right font-medium">Bezerras</th>
                      <th className="px-4 py-2 text-right font-medium">V. paridas</th>
                      <th className="px-4 py-2 text-right font-medium">Prenhas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.maternidade.map((m, i) => (
                      <tr key={m.paddockId} className={i === data.maternidade.length - 1 ? '' : 'border-b border-border-subtle'}>
                        <td className="px-4 py-2.5 font-medium text-fg">{m.paddockName}</td>
                        <td className="tabular px-4 py-2.5 text-right">{m.bezerros || '—'}</td>
                        <td className="tabular px-4 py-2.5 text-right">{m.bezerras || '—'}</td>
                        <td className="tabular px-4 py-2.5 text-right">{m.vacasParidas || '—'}</td>
                        <td className="tabular px-4 py-2.5 text-right text-fg-muted">{m.matrizesPrenhas || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card
            title="Mortalidade e abortos na estação"
            subtitle="Mortes de crias e de matrizes desde o primeiro parto, com a causa anotada pelo peão"
            padding=""
          >
            {c.mortes.length === 0 ? (
              <EmptyState title="Nenhuma morte de cria ou matriz na estação" />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                    <th className="px-4 py-2 text-left font-medium">Data</th>
                    <th className="px-4 py-2 text-left font-medium">Grupo</th>
                    <th className="px-4 py-2 text-left font-medium">Categoria</th>
                    <th className="px-4 py-2 text-left font-medium">Piquete</th>
                    <th className="px-4 py-2 text-right font-medium">Cab</th>
                    <th className="px-4 py-2 text-left font-medium">Causa</th>
                  </tr>
                </thead>
                <tbody>
                  {c.mortes.map((m, i) => (
                    <tr key={`${m.date}-${m.paddockId}-${m.category}-${i}`} className={i === c.mortes.length - 1 ? '' : 'border-b border-border-subtle'}>
                      <td className="tabular px-4 py-2.5 text-fg-muted">{fmtData(m.date)}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill
                          kind={m.grupo === 'cria' ? 'danger' : 'warn'}
                          label={m.grupo === 'cria' ? 'cria' : 'matriz'}
                          dot={false}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-fg">{m.category}</td>
                      <td className="px-4 py-2.5">{nomeDe(m.paddockId)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{m.headCount}</td>
                      <td className="px-4 py-2.5 text-[12px] text-fg-muted">{m.causa || 'sem causa anotada'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t border-border-subtle p-3">
              <AlertCard
                kind="info"
                title="Aborto não tem apontamento próprio no app de campo"
                body="Se acontecer, entra como morte de matriz com a causa escrita pelo peão — nenhum registro citando aborto até agora. Vale avaliar criar o evento ABORTO no app."
              />
            </div>
          </Card>
        </>
      )}
    </main>
  );
}

// ----------------------------------------------------------------------------

function BarrasSemanais({ semanas }: { semanas: Array<{ semana: string; machos: number; femeas: number }> }) {
  const maxTotal = Math.max(1, ...semanas.map((s) => s.machos + s.femeas));
  const ALTURA_PLOT = 140;
  const altura = (n: number) => (n > 0 ? Math.max(3, Math.round((n / maxTotal) * ALTURA_PLOT)) : 0);

  return (
    <div>
      <div className="flex items-end gap-1.5">
        {semanas.map((s, i) => {
          const total = s.machos + s.femeas;
          return (
            <div
              key={s.semana}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`Semana de ${fmtDia(s.semana)}: ${s.machos} machos · ${s.femeas} fêmeas`}
            >
              <span className="tabular h-[14px] text-[10px] font-medium text-fg-muted">{total > 0 ? total : ''}</span>
              <div className="flex w-full max-w-[26px] flex-col justify-end gap-[2px]" style={{ height: ALTURA_PLOT }}>
                {s.femeas > 0 ? (
                  <div className="w-full rounded-t-[4px]" style={{ height: altura(s.femeas), background: COR_FEMEAS }} />
                ) : null}
                {s.machos > 0 ? (
                  <div
                    className={`w-full ${s.femeas > 0 ? '' : 'rounded-t-[4px]'}`}
                    style={{ height: altura(s.machos), background: COR_MACHOS }}
                  />
                ) : null}
              </div>
              <span className={`text-[9px] text-fg-subtle ${semanas.length > 9 && i % 2 === 1 ? 'hidden sm:block' : ''}`}>
                {fmtDia(s.semana)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-border-subtle pt-3 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: COR_MACHOS }} />
          Machos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: COR_FEMEAS }} />
          Fêmeas
        </span>
      </div>
    </div>
  );
}
