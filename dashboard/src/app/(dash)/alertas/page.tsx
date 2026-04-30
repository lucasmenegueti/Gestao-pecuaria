import { DashHeader } from '@/components/dash-header';
import { AlertCard, Card, EmptyState } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { CheckCircle2 } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; severity?: string; tipo?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AlertasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const session = await getSessionOrRedirect();
  const data = await loadDashboardData(period, session.accessToken);

  const sevFilter = (params.severity ?? 'all') as 'all' | 'danger' | 'warning';
  const kindFilter = params.tipo ?? 'all';

  let filtered = data.alerts;
  if (sevFilter !== 'all') filtered = filtered.filter((a) => a.severity === sevFilter);
  if (kindFilter !== 'all') filtered = filtered.filter((a) => a.kind === kindFilter);
  filtered = [...filtered].sort((a, b) => (a.severity === 'danger' ? 0 : 1) - (b.severity === 'danger' ? 0 : 1));

  const counts = {
    all: data.alerts.length,
    danger: data.alerts.filter((a) => a.severity === 'danger').length,
    warning: data.alerts.filter((a) => a.severity === 'warning').length,
  };

  const byKind: Record<string, number> = {};
  for (const a of data.alerts) byKind[a.kind] = (byKind[a.kind] ?? 0) + 1;

  const KIND_LABELS: Record<string, string> = {
    cerca: 'Cerca', agua: 'Aguada', sanidade: 'Sanidade', bombona: 'Bombona',
    biologico: 'Biológico', central: 'Estoque central', desalocados: 'Desalocados',
  };

  function buildHref(sev: string, kind: string) {
    const u = new URLSearchParams();
    if (params.periodo) u.set('periodo', params.periodo);
    if (params.inicio) u.set('inicio', params.inicio);
    if (params.fim) u.set('fim', params.fim);
    if (sev !== 'all') u.set('severity', sev);
    if (kind !== 'all') u.set('tipo', kind);
    return `?${u.toString()}`;
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Operação · ${data.alerts.length} alertas ativos`}
        title="Alertas"
        period={period}
      />

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg bg-grey-50 p-1">
        <SevTab href={buildHref('all', kindFilter)}     active={sevFilter === 'all'}     label="Todos" count={counts.all} />
        <SevTab href={buildHref('danger', kindFilter)}  active={sevFilter === 'danger'}  label="Críticos" count={counts.danger} dot="bg-danger" />
        <SevTab href={buildHref('warning', kindFilter)} active={sevFilter === 'warning'} label="Atenção"  count={counts.warning} dot="bg-warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <Card><EmptyState icon={CheckCircle2} title="Sem alertas" body="Nenhum alerta nesse filtro." /></Card>
          ) : (
            filtered.map((a) => (
              <AlertCard
                key={a.id}
                kind={a.severity === 'danger' ? 'danger' : 'warning'}
                title={a.detail}
                paddock={a.paddockName !== '—' && a.paddockName !== 'Central' ? a.paddockName : undefined}
                time={a.time}
              />
            ))
          )}
        </div>

        <Card title="Por tipo">
          <div className="flex flex-col gap-0.5">
            <KindRow href={buildHref(sevFilter, 'all')} active={kindFilter === 'all'} label="Todos os tipos" count={data.alerts.length} />
            {Object.entries(byKind).map(([k, n]) => (
              <KindRow key={k} href={buildHref(sevFilter, k)} active={kindFilter === k} label={KIND_LABELS[k] ?? k} count={n} />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function SevTab({ href, active, label, count, dot }: { href: string; active: boolean; label: string; count: number; dot?: string }) {
  return (
    <a href={href} className={
      'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
      (active ? 'bg-bg-elevated text-fg shadow-xs' : 'text-fg-muted hover:text-fg')
    }>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
      {label}
      <span className={`tabular rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-grey-50 text-fg-muted' : 'text-fg-subtle'}`}>{count}</span>
    </a>
  );
}

function KindRow({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <a href={href} className={
      'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors ' +
      (active ? 'bg-nsa-green-100 font-medium text-nsa-green-800' : 'text-fg hover:bg-grey-50')
    }>
      <span>{label}</span>
      <span className={`tabular text-[11px] font-medium ${active ? 'text-nsa-green-800' : 'text-fg-muted'}`}>{count}</span>
    </a>
  );
}
