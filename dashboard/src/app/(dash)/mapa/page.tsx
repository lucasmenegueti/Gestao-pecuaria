import { DashHeader } from '@/components/dash-header';
import { FarmMap } from '@/components/farm-map';
import { Card, EmptyState } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { Map as MapIc } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function MapaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const data = await loadDashboardData(period);

  const k = data.kpis;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Pecuária · 18.400 hectares · ${k.totalPaddocks} talhões`}
        title="Mapa da fazenda"
        period={period}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Legend color="#2e8c4f" label="Cobertura completa" count={k.paddocksGreen} />
        <Legend color="#b88217" label="Ronda parcial"      count={k.paddocksYellow} />
        <Legend color="#c0392b" label="Sem ronda"          count={k.paddocksRed} />
      </div>

      <Card padding="">
        {data.paddocksEnriched.length === 0 ? (
          <EmptyState icon={MapIc} title="Sem talhões" body="Nenhum talhão ativo no banco." />
        ) : (
          <div className="p-3">
            <FarmMap paddocksEnriched={data.paddocksEnriched} height={580} />
          </div>
        )}
      </Card>
    </main>
  );
}

function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-fg-muted">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: 0.55 }} />
      <span>{label}</span>
      <span className="tabular font-semibold text-fg">{count}</span>
    </div>
  );
}
