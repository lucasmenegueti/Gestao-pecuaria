import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { DashHeader } from '@/components/dash-header';
import {
  AlertCard, Card, EmptyState, KPICard, StatusPill, StatusStripCard,
  Avatar, initialsOf,
} from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { SECTION_LABELS, SECTION_COLORS, type SectionKind } from '@/lib/supabase/types';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function VisaoGeralPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const data = await loadDashboardData(period);

  const k = data.kpis;
  const userOf = (id: string) => data.profiles.find((p) => p.id === id);
  const criticalAlerts = data.alerts.filter((a) => a.severity === 'danger').slice(0, 4);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Fazenda NSA · 18.400 hectares · ${k.totalPaddocks} talhões`}
        title="Visão geral"
        period={period}
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          label="Cobertura do período"
          value={`${k.coveragePct}%`}
          hint={`${k.paddocksGreen + k.paddocksYellow} de ${k.totalPaddocks} talhões`}
          accent={k.coveragePct >= 70 ? 'ok' : 'warn'}
        />
        <KPICard label="Rebanho" value={k.totalHeads.toLocaleString('pt-BR')} unit="cab" hint={`${k.stockingRate.toFixed(2)} cab/ha`} />
        <KPICard label="Alertas ativos" value={k.activeAlerts} hint={`${k.criticalAlerts} críticos`} accent={k.criticalAlerts > 0 ? 'danger' : 'warn'} />
        <KPICard label="Inspeções abertas" value={k.pendingInspections} hint="solicitadas pelo admin" />
      </div>

      {/* Status strip */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusStripCard kind="ok"     label="Cobertura completa" count={k.paddocksGreen}  total={k.totalPaddocks} icon={CheckCircle2} />
        <StatusStripCard kind="warn"   label="Ronda parcial"      count={k.paddocksYellow} total={k.totalPaddocks} icon={AlertCircle} />
        <StatusStripCard kind="danger" label="Sem ronda"          count={k.paddocksRed}    total={k.totalPaddocks} icon={XCircle} />
      </div>

      {/* Two col: feed + alerts/inventory */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card
          title="Atividade do período"
          subtitle={`${data.feed.length} ${data.feed.length === 1 ? 'evento' : 'eventos'} · ${new Set(data.feed.map((f) => f.userId)).size} ${new Set(data.feed.map((f) => f.userId)).size === 1 ? 'peão' : 'peões'} em campo`}
          padding=""
        >
          {data.feed.length === 0 ? (
            <EmptyState icon={XCircle} title="Sem atividade no período" body="Selecione outro período ou aguarde os peões fazerem rondas." />
          ) : (
            <div className="max-h-[540px] overflow-y-auto">
              {data.feed.slice(0, 30).map((evt, i) => {
                const user = userOf(evt.userId);
                return (
                  <FeedRow
                    key={evt.id}
                    time={evt.time}
                    user={user?.name ?? evt.userName}
                    paddock={evt.paddockName}
                    section={evt.section}
                    summary={evt.summary}
                    last={i === Math.min(29, data.feed.length - 1)}
                  />
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Alertas críticos" subtitle={`${k.criticalAlerts} ${k.criticalAlerts === 1 ? 'crítico' : 'críticos'} · ${k.activeAlerts - k.criticalAlerts} de atenção`}>
            {criticalAlerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Sem alertas críticos" body="Tudo no verde por aqui." />
            ) : (
              <div className="flex flex-col gap-2">
                {criticalAlerts.map((a) => (
                  <AlertCard
                    key={a.id}
                    kind="danger"
                    title={a.detail}
                    paddock={a.paddockName !== '—' ? a.paddockName : undefined}
                    time={a.time}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Estoque crítico">
            {data.inventoryCentral.filter((i) => i.quantity_sacks <= i.min_sacks).length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Tudo abastecido" body="Sem fórmulas abaixo do mínimo." />
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.inventoryCentral
                  .filter((i) => i.quantity_sacks <= i.min_sacks)
                  .slice(0, 5)
                  .map((i) => {
                    const isDanger = i.quantity_sacks === 0;
                    return (
                      <div key={i.id} className={`flex items-center justify-between rounded-md px-2.5 py-2 ${isDanger ? 'bg-danger-bg' : 'bg-warning-bg'}`}>
                        <div>
                          <div className={`text-[13px] font-medium ${isDanger ? 'text-[#7d2519]' : 'text-[#7a550f]'}`}>
                            {i.formula?.name ?? 'Fórmula'}
                          </div>
                          <div className={`text-[11px] ${isDanger ? 'text-[#7d2519]' : 'text-[#7a550f]'} opacity-80`}>
                            {i.quantity_sacks} sacos · mínimo {i.min_sacks}
                          </div>
                        </div>
                        <StatusPill kind={isDanger ? 'danger' : 'warn'} label={isDanger ? 'Crítico' : 'Atenção'} dot={false} size="sm" />
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function FeedRow({
  time, user, paddock, section, summary, last,
}: {
  time: string;
  user: string;
  paddock: string;
  section: SectionKind;
  summary: string;
  last: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${last ? '' : 'border-b border-border-subtle'}`}>
      <span className="tabular w-10 shrink-0 text-[11px] text-fg-muted">{time}</span>
      <Avatar initials={initialsOf(user)} size={24} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-fg">
          <span className="font-medium">{user}</span>
          <span className="text-fg-muted"> · </span>
          <span>{SECTION_LABELS[section]}</span>
          <span className="text-fg-muted"> em </span>
          <span className="font-medium">{paddock}</span>
        </div>
        {summary ? <div className="mt-0.5 text-[11px] text-fg-muted">{summary}</div> : null}
      </div>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SECTION_COLORS[section] }} />
    </div>
  );
}
