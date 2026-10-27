import { DashHeader } from '@/components/dash-header';
import { Card, EmptyState, Avatar, SectionPill, initialsOf } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { SECTION_LABELS, SECTION_COLORS, REQUIRED_SECTIONS, type SectionKind } from '@/lib/supabase/types';
import { Users } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EquipePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const session = await getSessionOrRedirect();
  const data = await loadDashboardData(period, session.accessToken);

  // Agrega por user_id (peões = quem fez ronda no período)
  const peoes: Array<{
    id: string;
    name: string;
    rondasCount: number;
    paddocksCount: number;
    sectionsCount: number;
    completas: number;
    sectionsUnique: Set<SectionKind>;
    paddockNames: string[];
    lastTime: string;
  }> = [];

  const userIds = new Set(data.rondas.map((r) => r.user_id));
  for (const userId of userIds) {
    const profile = data.profiles.find((p) => p.id === userId);
    if (!profile) continue; // peão sem profile cadastrado
    const myRondas = data.paddocksEnriched.flatMap((p) =>
      p.rondasInPeriod.filter((r) => r.ronda.user_id === userId).map((r) => ({ ...r, paddock: p.paddock })),
    );
    const sectionsUnique = new Set<SectionKind>();
    let sectionsCount = 0;
    for (const r of myRondas) {
      r.sections.forEach((s) => sectionsUnique.add(s));
      sectionsCount += r.sections.length;
    }
    const completas = myRondas.filter((r) => REQUIRED_SECTIONS.every((s) => r.sections.includes(s))).length;
    const myFeed = data.feed.filter((f) => f.userId === userId);
    const lastTime = myFeed[0]?.time ?? '—';
    peoes.push({
      id: userId,
      name: profile.name,
      rondasCount: myRondas.length,
      paddocksCount: new Set(myRondas.map((r) => r.paddock.id)).size,
      sectionsCount,
      completas,
      sectionsUnique,
      paddockNames: Array.from(new Set(myRondas.map((r) => r.paddock.name))),
      lastTime,
    });
  }
  peoes.sort((a, b) => b.sectionsCount - a.sectionsCount);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Operação · ${peoes.length} ${peoes.length === 1 ? 'peão' : 'peões'} em campo`}
        title="Equipe"
        period={period}
      />

      {peoes.length === 0 ? (
        <Card><EmptyState icon={Users} title="Nenhum peão fez ronda no período" body="Selecione outro período pra ver o histórico de campo." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {peoes.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(p.name)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold tracking-tight text-fg">{p.name}</div>
                  <div className="mt-0.5 text-[11px] text-fg-muted">
                    {p.rondasCount > 0 ? `Última atividade às ${p.lastTime}` : 'Sem atividade hoje'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
                <Stat label="Talhões"     value={p.paddocksCount} />
                <Stat label="Avaliações"  value={p.sectionsCount} />
                <Stat label="Completas"   value={p.completas} accent={p.completas === p.paddocksCount && p.paddocksCount > 0 ? '#2e8c4f' : undefined} />
              </div>

              {p.sectionsUnique.size > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {Array.from(p.sectionsUnique).map((sec) => (
                    <SectionPill
                      key={sec}
                      label={SECTION_LABELS[sec].slice(0, 3).toUpperCase()}
                      color={SECTION_COLORS[sec]}
                    />
                  ))}
                </div>
              ) : null}

              {p.paddockNames.length > 0 ? (
                <div className="text-[11px] text-fg-muted">
                  <span className="font-medium uppercase tracking-wider">Talhões:</span>{' '}
                  {p.paddockNames.join(' · ')}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className="tabular text-[20px] font-semibold leading-none" style={{ color: accent ?? '#1f1f1c' }}>{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted">{label}</div>
    </div>
  );
}
