import { DashHeader } from '@/components/dash-header';
import { Card, EmptyState, KPICard, StatusPill } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { Inbox } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

const DEFAULT_WEIGHT: Record<string, number> = {
  'BEZERRO MAMANDO': 100, 'BEZERRA MAMANDO': 95, 'BEZERRO': 180, 'BEZERRA': 170,
  'GARROTE': 330, 'NOVILHA': 290, 'NOVILHA PRENHA': 310, 'BOI': 550,
  'VACA PARIDA': 450, 'VACA PRENHA': 470, 'VACA SOLTEIRA': 440,
};

export default async function EstoquePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const session = await getSessionOrRedirect();
  const data = await loadDashboardData(period, session.accessToken);

  // Bombonas com cálculo de dias até zerar
  const bombonas = data.inventoryBombonas.map((b) => {
    if (!b.formula || !b.paddock) return { ...b, daysLeft: null as number | null, severity: null as 'warning' | 'danger' | null };
    const lots = data.herd.filter((h) => h.paddock_id === b.paddock_id);
    const bodyKg = lots.reduce((s, l) => s + l.head_count * (l.avg_weight_kg && l.avg_weight_kg > 0 ? l.avg_weight_kg : DEFAULT_WEIGHT[l.category] ?? 400), 0);
    if (bodyKg <= 0) return { ...b, daysLeft: null, severity: null };
    const dailyKg = (bodyKg * b.formula.target_g_per_kg_body_day) / 1000;
    if (dailyKg <= 0) return { ...b, daysLeft: null, severity: null };
    const remainingKg = b.quantity_sacks * b.formula.kg_per_sack;
    const daysLeft = Math.floor(remainingKg / dailyKg);
    const severity: 'warning' | 'danger' | null =
      daysLeft <= 0 ? 'danger' : daysLeft <= 3 ? 'warning' : null;
    return { ...b, daysLeft, severity };
  }).sort((a, b) => {
    const da = a.daysLeft ?? 999;
    const db = b.daysLeft ?? 999;
    return da - db;
  });

  const central = data.inventoryCentral.map((i) => {
    const severity: 'danger' | 'warning' | null =
      i.quantity_sacks === 0 ? 'danger' :
      i.quantity_sacks <= i.min_sacks ? 'warning' : null;
    return { ...i, severity };
  });

  const totalCentralSacks = central.reduce((s, i) => s + i.quantity_sacks, 0);
  const totalBombonaSacks = bombonas.reduce((s, b) => s + b.quantity_sacks, 0);
  const bombonasCriticas = bombonas.filter((b) => b.severity === 'danger').length;
  const bombonasAtencao = bombonas.filter((b) => b.severity === 'warning').length;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Pecuária · ${data.formulas.length} fórmulas · ${bombonas.length} bombonas`}
        title="Estoque & Reabastecimento"
        period={period}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label="Sacos no central"   value={Math.round(totalCentralSacks).toLocaleString('pt-BR')} hint={`${central.length} fórmulas`} />
        <KPICard label="Sacos em bombonas"  value={Math.round(totalBombonaSacks).toLocaleString('pt-BR')} hint={`${bombonas.length} talhões`} />
        <KPICard label="Bombonas críticas"  value={bombonasCriticas} accent={bombonasCriticas > 0 ? 'danger' : undefined} hint={`${bombonasAtencao} em atenção`} />
        <KPICard label="Fórmulas em alerta" value={central.filter((c) => c.severity).length} accent={central.some((c) => c.severity === 'danger') ? 'danger' : 'warn'} />
      </div>

      <div className="mb-6">
        <Card title="Estoque central" subtitle="Saldo e mínimo configurado por fórmula" padding="">
          {central.length === 0 ? (
            <EmptyState icon={Inbox} title="Sem fórmulas cadastradas" />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-2 text-left font-medium">Fórmula</th>
                  <th className="px-4 py-2 text-right font-medium">Saldo</th>
                  <th className="px-4 py-2 text-right font-medium">Mínimo</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {central.map((i, idx) => (
                  <tr key={i.id} className={idx === central.length - 1 ? '' : 'border-b border-border-subtle'}>
                    <td className="px-4 py-2.5 font-medium text-fg">{i.formula?.name ?? '—'}</td>
                    <td className="tabular px-4 py-2.5 text-right font-medium">{i.quantity_sacks} sacos</td>
                    <td className="tabular px-4 py-2.5 text-right text-fg-muted">{i.min_sacks}</td>
                    <td className="px-4 py-2.5">
                      {i.severity === 'danger' ? <StatusPill kind="danger" label="Crítico" /> :
                        i.severity === 'warning' ? <StatusPill kind="warn" label="Atenção" /> :
                        <StatusPill kind="ok" label="Saudável" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Bombonas por talhão" subtitle="Saldo nos cochos e projeção de consumo · ordenado pelos mais críticos" padding="">
        {bombonas.length === 0 ? (
          <EmptyState icon={Inbox} title="Nenhuma bombona registrada" body="Bombonas aparecem quando há reabastecimento." />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-grey-25 text-[11px] uppercase tracking-wider text-fg-muted">
                <th className="px-4 py-2 text-left font-medium">Talhão</th>
                <th className="px-4 py-2 text-left font-medium">Fórmula</th>
                <th className="px-4 py-2 text-right font-medium">Saldo</th>
                <th className="px-4 py-2 text-right font-medium">Zera em</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bombonas.map((b, i) => (
                <tr key={b.id} className={i === bombonas.length - 1 ? '' : 'border-b border-border-subtle'}>
                  <td className="px-4 py-2.5 font-medium text-fg">{b.paddock?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{b.formula?.name ?? '—'}</td>
                  <td className="tabular px-4 py-2.5 text-right font-medium">{b.quantity_sacks}</td>
                  <td className={`tabular px-4 py-2.5 text-right font-semibold ${b.severity === 'danger' ? 'text-danger' : b.severity === 'warning' ? 'text-warning' : ''}`}>
                    {b.daysLeft != null ? `${b.daysLeft}d` : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {b.severity === 'danger' ? <StatusPill kind="danger" label="Vazia" /> :
                      b.severity === 'warning' ? <StatusPill kind="warn" label="Atenção" /> :
                      <StatusPill kind="ok" label="Saudável" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
