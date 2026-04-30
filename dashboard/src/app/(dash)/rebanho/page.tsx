import { DashHeader } from '@/components/dash-header';
import { Card, EmptyState, KPICard, StatusPill } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { ArrowRight, Inbox } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function RebanhoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const session = await getSessionOrRedirect();
  const data = await loadDashboardData(period, session.accessToken);

  // Distribuição por categoria
  const byCat: Record<string, { category: string; heads: number; paddocks: Set<number> }> = {};
  for (const lot of data.herd) {
    const entry = byCat[lot.category] ?? (byCat[lot.category] = { category: lot.category, heads: 0, paddocks: new Set() });
    entry.heads += lot.head_count;
    if (lot.paddock_id != null) entry.paddocks.add(lot.paddock_id);
  }
  const categories = Object.values(byCat).sort((a, b) => b.heads - a.heads);
  const total = categories.reduce((s, c) => s + c.heads, 0);

  // Top piquetes por lotação
  const topStocking = [...data.paddocksEnriched]
    .filter((p) => p.totalHeads > 0)
    .sort((a, b) => b.stockingRate - a.stockingRate)
    .slice(0, 8);

  // Eventos do período
  const eventsInPeriod = data.herdEvents.filter((e) => {
    return e.date >= period.start && e.date <= period.end;
  });
  const mortes = eventsInPeriod.filter((e) => e.event_type === 'MORTE').reduce((s, e) => s + e.head_count, 0);
  const vendas = eventsInPeriod.filter((e) => e.event_type === 'VENDA').reduce((s, e) => s + e.head_count, 0);

  const k = data.kpis;
  const paddockNameById = new Map(data.paddocks.map((p) => [p.id, p.name]));

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader eyebrow="Pecuária · 11 categorias" title="Rebanho" period={period} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Rebanho ativo" value={k.totalHeads.toLocaleString('pt-BR')} unit="cab" hint="alocado em piquetes" />
        <KPICard label="Cab/ha média" value={k.stockingRate.toFixed(2)} hint={`${k.totalArea.toFixed(0)} ha pastoreáveis`} />
        <KPICard label="Mortalidade no período" value={mortes} unit="cab" accent={mortes > 0 ? 'warn' : undefined} />
        <KPICard label="Vendas no período"      value={vendas} unit="cab" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Distribuição por categoria" subtitle={`${categories.length} categorias · ordenado por cabeças`}>
          {categories.length === 0 ? (
            <EmptyState icon={Inbox} title="Sem rebanho cadastrado" />
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((c) => {
                const pct = total > 0 ? (c.heads / total) * 100 : 0;
                const color = c.category === 'GARROTE' ? '#264868' : c.category.startsWith('VACA') ? '#7a4d3b' : c.category === 'BOI' ? '#3f6340' : '#7a550f';
                return (
                  <div key={c.category}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="font-medium text-fg">{c.category}</span>
                      <span className="tabular text-fg-muted">
                        <span className="font-medium text-fg">{c.heads.toLocaleString('pt-BR')}</span>
                        <span className="mx-1.5 text-grey-300">·</span>
                        {pct.toFixed(1)}%
                        <span className="mx-1.5 text-grey-300">·</span>
                        {c.paddocks.size} {c.paddocks.size === 1 ? 'piquete' : 'piquetes'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border-subtle">
                      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Maior lotação" subtitle="Cab/ha — top 8" padding="">
          {topStocking.length === 0 ? (
            <EmptyState icon={Inbox} title="Sem dados de lotação" />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Talhão</th>
                  <th className="px-4 py-2 text-right font-medium">Área</th>
                  <th className="px-4 py-2 text-right font-medium">Cabeças</th>
                  <th className="px-4 py-2 text-right font-medium">Cab/ha</th>
                </tr>
              </thead>
              <tbody>
                {topStocking.map((p, i) => (
                  <tr key={p.paddock.id} className={i === topStocking.length - 1 ? '' : 'border-b border-border-subtle'}>
                    <td className="px-4 py-2.5 font-medium text-fg">{p.paddock.name}</td>
                    <td className="tabular px-4 py-2.5 text-right">{p.paddock.area_hectares} ha</td>
                    <td className="tabular px-4 py-2.5 text-right">{p.totalHeads.toLocaleString('pt-BR')}</td>
                    <td className={`tabular px-4 py-2.5 text-right font-semibold ${p.stockingRate > 3 ? 'text-danger' : p.stockingRate > 2 ? 'text-warning' : 'text-fg'}`}>
                      {p.stockingRate.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Eventos do rebanho" subtitle={`Últimos ${data.herdEvents.length} registros — entradas, mortes, vendas, transferências, evoluções`} padding="">
        {data.herdEvents.length === 0 ? (
          <EmptyState icon={Inbox} title="Sem eventos no período" />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                <th className="px-4 py-2 text-left font-medium">Data</th>
                <th className="px-4 py-2 text-left font-medium">Evento</th>
                <th className="px-4 py-2 text-left font-medium">Categoria</th>
                <th className="px-4 py-2 text-right font-medium">Cab</th>
                <th className="px-4 py-2 text-left font-medium">De → Para</th>
                <th className="px-4 py-2 text-left font-medium">Obs</th>
              </tr>
            </thead>
            <tbody>
              {data.herdEvents.slice(0, 30).map((e, i) => {
                const fromName = e.paddock_id ? paddockNameById.get(e.paddock_id) ?? '—' : '—';
                const toName = e.target_paddock_id ? paddockNameById.get(e.target_paddock_id) ?? '—' : '—';
                return (
                  <tr key={e.id} className={i === Math.min(29, data.herdEvents.length - 1) ? '' : 'border-b border-border-subtle'}>
                    <td className="px-4 py-2.5 text-fg-muted">{e.date}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill kind={statusKindOf(e.event_type)} label={e.event_type.toLowerCase()} dot={false} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-fg">{e.category}</td>
                    <td className="tabular px-4 py-2.5 text-right">{e.head_count}</td>
                    <td className="px-4 py-2.5 text-[12px]">
                      <span className="font-medium text-fg">{fromName}</span>
                      {toName !== '—' ? (
                        <>
                          <ArrowRight size={11} className="mx-1.5 inline-block align-middle text-fg-subtle" />
                          <span className="font-medium text-fg">{toName}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-fg-muted">
                      {e.notes || (e.weight_kg ? `${e.weight_kg} kg` : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}

function statusKindOf(type: string): 'ok' | 'info' | 'danger' | 'neutral' | 'brand' {
  switch (type) {
    case 'ENTRADA': return 'ok';
    case 'VENDA':   return 'info';
    case 'MORTE':   return 'danger';
    case 'EVOLUCAO': return 'brand';
    default: return 'neutral';
  }
}
