import { DashHeader } from '@/components/dash-header';
import { FarmMapWithDetail, type PaddockMapDetail } from '@/components/farm-map-with-detail';
import type { MapPaddock } from '@/components/farm-map';
import { Card, EmptyState } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { Map as MapIc } from 'lucide-react';
import { SECTION_LABELS, SECTION_COLORS, type SectionKind } from '@/lib/supabase/types';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

const DEFAULT_WEIGHT: Record<string, number> = {
  'BEZERRO MAMANDO': 100, 'BEZERRA MAMANDO': 95, 'BEZERRO': 180, 'BEZERRA': 170,
  'GARROTE': 330, 'NOVILHA': 290, 'NOVILHA PRENHA': 310, 'BOI': 550,
  'VACA PARIDA': 450, 'VACA PRENHA': 470, 'VACA SOLTEIRA': 440,
};

export default async function MapaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const session = await getSessionOrRedirect();
  const data = await loadDashboardData(period, session.accessToken);

  const k = data.kpis;

  // Mapeia ronda_id → paddock_id pra resolver alertas e evals.
  const rondaToPaddock = new Map<number, number>();
  for (const r of data.rondas) rondaToPaddock.set(r.id, r.paddock_id);
  const paddockNameById = new Map(data.paddocks.map((p) => [p.id, p.name]));
  const formulaById = new Map(data.formulas.map((f) => [f.id, f]));

  // Por talhão, agrupa rondas + evals com summaries inline.
  const evalsByPaddockRonda: Record<number, Record<number, Array<{ kind: SectionKind; label: string; color: string; summary: string }>>> = {};
  function addEval(rondaId: number, kind: SectionKind, summary: string) {
    const pid = rondaToPaddock.get(rondaId);
    if (pid == null) return;
    const byRonda = evalsByPaddockRonda[pid] ?? (evalsByPaddockRonda[pid] = {});
    const arr = byRonda[rondaId] ?? (byRonda[rondaId] = []);
    arr.push({ kind, label: SECTION_LABELS[kind], color: SECTION_COLORS[kind], summary });
  }
  for (const e of data.evals.supplement) {
    addEval(e.ronda_id, 'supplement', `Cocho ${(e.trough_score || '').toLowerCase()} · ${e.sacks_in_trough ?? '—'} sacos`);
  }
  for (const e of data.evals.bombona) {
    addEval(e.ronda_id, 'bombona', e.has_stock ? `${e.sacks ?? '—'} sacos no estoque` : 'Sem estoque na bombona');
  }
  for (const e of data.evals.forage) {
    addEval(e.ronda_id, 'forage', `Altura média ${e.average_cm} cm · ${(e.quality || '').toLowerCase()}`);
  }
  for (const e of data.evals.water) {
    addEval(e.ronda_id, 'water', e.available ? `Disponível · ${(e.quality || '').toLowerCase()}` : 'SEM ÁGUA');
  }
  for (const e of data.evals.health) {
    addEval(e.ronda_id, 'health', e.parasite_free ? 'Sem parasitas' : `${e.affected_pct ?? 0}% afetado${e.observations ? ` · ${e.observations}` : ''}`);
  }
  for (const e of data.evals.fence) {
    addEval(e.ronda_id, 'fence', `${e.classification} · ${e.voltage}V${e.prevents_mixing ? '' : ' · NÃO evita mistura'}`);
  }
  for (const e of data.evals.weight) {
    addEval(e.ronda_id, 'weight', `${e.estimated_weight_kg} kg · ${e.category}`);
  }
  for (const e of data.evals.washing) {
    addEval(e.ronda_id, 'washing', e.was_washed ? 'Cocho lavado' : 'Não lavado');
  }
  for (const e of data.evals.biological) {
    addEval(e.ronda_id, 'biological', e.applied ? `${e.quantity_g}g aplicados` : 'Não aplicou');
  }

  // Bombona por talhão (cálculo idêntico ao /estoque).
  const bombonaByPaddock: Record<number, PaddockMapDetail['bombona']> = {};
  for (const b of data.inventoryBombonas) {
    if (!b.paddock_id || !b.formula) continue;
    const lots = data.herd.filter((h) => h.paddock_id === b.paddock_id);
    const bodyKg = lots.reduce((s, l) => s + l.head_count * (l.avg_weight_kg && l.avg_weight_kg > 0 ? l.avg_weight_kg : DEFAULT_WEIGHT[l.category] ?? 400), 0);
    const dailyKg = bodyKg > 0 ? (bodyKg * b.formula.target_g_per_kg_body_day) / 1000 : 0;
    let daysLeft: number | null = null;
    let severity: 'danger' | 'warning' | null = null;
    if (dailyKg > 0) {
      daysLeft = Math.floor((b.quantity_sacks * b.formula.kg_per_sack) / dailyKg);
      severity = daysLeft <= 0 ? 'danger' : daysLeft <= 3 ? 'warning' : null;
    }
    bombonaByPaddock[b.paddock_id] = {
      formula: b.formula.name,
      sacks: b.quantity_sacks,
      daysLeft,
      severity,
    };
  }

  // Alertas por talhão (resolve paddockId via ronda quando ausente).
  const alertsByPaddock: Record<number, Array<{ severity: 'danger' | 'warning'; detail: string; time: string }>> = {};
  for (const a of data.alerts) {
    let pid = a.paddockId;
    // alguns alerts foram derivados sem paddockId (água/cerca/sanidade) — tenta resolver
    if (pid == null) continue;
    (alertsByPaddock[pid] ??= []).push({ severity: a.severity, detail: a.detail, time: a.time });
  }

  // Monta MapPaddock[] e details.
  const mapPaddocks: MapPaddock[] = data.paddocksEnriched.map((e) => ({
    id: e.paddock.id,
    name: e.paddock.name,
    status: e.status,
    geometry: e.paddock.geometry as unknown,
    centerLat: e.paddock.center_lat,
    centerLng: e.paddock.center_lng,
  }));

  const details: Record<number, PaddockMapDetail> = {};
  for (const e of data.paddocksEnriched) {
    const evalsByRonda = evalsByPaddockRonda[e.paddock.id] ?? {};
    const rondas = e.rondasInPeriod.map((r) => ({
      user: r.user?.name ?? '—',
      startTime: extractTime(r.ronda.local_updated_at),
      sections: evalsByRonda[r.ronda.id] ?? r.sections.map((kind) => ({
        kind, label: SECTION_LABELS[kind], color: SECTION_COLORS[kind], summary: '',
      })),
    }));
    details[e.paddock.id] = {
      id: e.paddock.id,
      name: e.paddock.name,
      status: e.status,
      area: e.paddock.area_hectares,
      totalHeads: e.totalHeads,
      stockingRate: e.stockingRate,
      rondas,
      alerts: alertsByPaddock[e.paddock.id] ?? [],
      bombona: bombonaByPaddock[e.paddock.id] ?? null,
    };
  }

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

      {data.paddocksEnriched.length === 0 ? (
        <Card>
          <EmptyState icon={MapIc} title="Sem talhões" body="Nenhum talhão ativo no banco." />
        </Card>
      ) : (
        <FarmMapWithDetail paddocks={mapPaddocks} details={details} height={600} />
      )}
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

function extractTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // local_updated_at vem como "YYYY-MM-DD HH:MM:SS" (sqlite localtime).
  // Pegamos só HH:MM.
  const m = /(\d{2}:\d{2})/.exec(iso);
  return m ? m[1]! : null;
}
