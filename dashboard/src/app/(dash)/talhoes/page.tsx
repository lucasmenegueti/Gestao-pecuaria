import { DashHeader } from '@/components/dash-header';
import { PaddockCard } from '@/components/paddock-card';
import { EmptyState } from '@/components/ui-primitives';
import { Inbox } from 'lucide-react';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; status?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TalhoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const data = await loadDashboardData(period);
  const filter = (params.status ?? 'all') as 'all' | 'green' | 'yellow' | 'red';

  // Ordem solicitada pelo Lucas: cobertura completa → parcial → sem ronda.
  const STATUS_ORDER = { green: 0, yellow: 1, red: 2 } as const;
  const sorted = [...data.paddocksEnriched].sort((a, b) => {
    const cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (cmp !== 0) return cmp;
    return a.paddock.name.localeCompare(b.paddock.name);
  });

  const filtered = filter === 'all' ? sorted : sorted.filter((p) => p.status === filter);

  const counts = {
    all: data.paddocksEnriched.length,
    green: data.paddocksEnriched.filter((p) => p.status === 'green').length,
    yellow: data.paddocksEnriched.filter((p) => p.status === 'yellow').length,
    red: data.paddocksEnriched.filter((p) => p.status === 'red').length,
  };

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Pecuária · ${data.paddocks.length} talhões`}
        title="Talhões"
        period={period}
      />

      {/* Filter tabs (server-side via Link) */}
      <FilterTabs current={filter} counts={counts} period={params} />

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Sem talhões" body="Nenhum talhão nesse filtro." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PaddockCard key={p.paddock.id} enriched={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function FilterTabs({
  current, counts, period,
}: {
  current: 'all' | 'green' | 'yellow' | 'red';
  counts: { all: number; green: number; yellow: number; red: number };
  period: { periodo?: string; inicio?: string; fim?: string };
}) {
  const tabs = [
    { id: 'all',    label: 'Todos',                 count: counts.all,    dot: null },
    { id: 'green',  label: 'Cobertura completa',    count: counts.green,  dot: 'bg-success' },
    { id: 'yellow', label: 'Ronda parcial',         count: counts.yellow, dot: 'bg-warning' },
    { id: 'red',    label: 'Sem ronda',             count: counts.red,    dot: 'bg-danger' },
  ] as const;

  function buildHref(id: string) {
    const u = new URLSearchParams();
    if (period.periodo) u.set('periodo', period.periodo);
    if (period.inicio) u.set('inicio', period.inicio);
    if (period.fim) u.set('fim', period.fim);
    if (id !== 'all') u.set('status', id);
    return `?${u.toString()}`;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-1.5 rounded-lg bg-grey-50 p-1">
      {tabs.map((t) => {
        const active = current === t.id;
        return (
          <a
            key={t.id}
            href={buildHref(t.id)}
            className={
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
              (active
                ? 'bg-bg-elevated text-fg shadow-xs'
                : 'text-fg-muted hover:text-fg')
            }
          >
            {t.dot ? <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> : null}
            {t.label}
            <span className={`tabular rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-grey-50 text-fg-muted' : 'text-fg-subtle'}`}>
              {t.count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
