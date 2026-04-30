import { DashHeader } from '@/components/dash-header';
import { Card, EmptyState, StatusPill } from '@/components/ui-primitives';
import { loadDashboardData } from '@/lib/queries';
import { parsePeriodFromSearchParams } from '@/lib/period';
import {
  Box, ClipboardCheck, FlaskConical, Scale, ShowerHead, Sprout, Stethoscope,
  type LucideIcon,
} from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; tab?: string }>;
}

export const dynamic = 'force-dynamic';

const KIND_ICONS: Record<string, LucideIcon> = {
  sanidade: Stethoscope,
  forragem: Sprout,
  peso: Scale,
  bombona: Box,
  biologico: FlaskConical,
  lavagem: ShowerHead,
};

export default async function InspecoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriodFromSearchParams(params);
  const data = await loadDashboardData(period);

  const tab = (params.tab ?? 'pending') as 'pending' | 'completed';
  const pending = data.inspections.filter((i) => i.status === 'pending');
  const completed = data.inspections.filter((i) => i.status === 'completed');
  const list = tab === 'pending' ? pending : completed;

  const paddockById = new Map(data.paddocks.map((p) => [p.id, p]));
  const profileById = new Map(data.profiles.map((p) => [p.id, p]));

  function buildHref(t: 'pending' | 'completed') {
    const u = new URLSearchParams();
    if (params.periodo) u.set('periodo', params.periodo);
    if (params.inicio) u.set('inicio', params.inicio);
    if (params.fim) u.set('fim', params.fim);
    u.set('tab', t);
    return `?${u.toString()}`;
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <DashHeader
        eyebrow={`Operação · ${data.inspections.length} ${data.inspections.length === 1 ? 'solicitação' : 'solicitações'}`}
        title="Inspeções"
        period={period}
      />

      <div className="mb-4 rounded-lg border-l-[3px] border-l-nsa-green-500 bg-nsa-green-100 px-3 py-2.5 text-[12px] leading-relaxed text-nsa-green-800">
        <strong>Inspeções sob demanda</strong> — peça ao peão que avalie um aspecto específico (forragem, sanidade, peso, lavagem, bombona, biológico) num talhão. A solicitação aparece no app dele e auto-completa quando ele preenche aquela seção da ronda.
      </div>

      <div className="mb-4 flex gap-1.5 rounded-lg bg-grey-50 p-1 w-fit">
        <Tab href={buildHref('pending')}   active={tab === 'pending'}   label="Pendentes"  count={pending.length} />
        <Tab href={buildHref('completed')} active={tab === 'completed'} label="Concluídas" count={completed.length} />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title={tab === 'pending' ? 'Sem solicitações pendentes' : 'Sem inspeções concluídas'}
            body={tab === 'pending' ? 'Use o app pra criar uma solicitação.' : ''}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const isPending = i.status === 'pending';
            const Icon = KIND_ICONS[i.eval_kind] ?? ClipboardCheck;
            const paddock = paddockById.get(i.paddock_id);
            const requester = profileById.get(i.requested_by);
            const completer = i.completed_by ? profileById.get(i.completed_by) : null;
            return (
              <div key={i.id} className={`flex flex-col gap-2.5 rounded-lg border border-border ${isPending ? 'border-l-warning' : 'border-l-success'} border-l-[4px] bg-bg-elevated p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isPending ? 'bg-warning-bg' : 'bg-success-bg'} shrink-0`}>
                      <Icon size={18} strokeWidth={1.75} className={isPending ? 'text-warning' : 'text-success'} />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold capitalize tracking-tight text-fg">{i.eval_kind}</div>
                      <div className="mt-0.5 text-[12px] text-fg-muted">{paddock?.name ?? '—'}</div>
                    </div>
                  </div>
                  <StatusPill kind={isPending ? 'warn' : 'ok'} label={isPending ? 'Pendente' : 'Concluída'} dot={false} size="sm" />
                </div>

                {i.notes ? (
                  <div className="rounded-md bg-grey-50 px-2.5 py-2 text-[12px] leading-relaxed text-fg">
                    &ldquo;{i.notes}&rdquo;
                  </div>
                ) : null}

                <div className="border-t border-border-subtle pt-2 text-[11px] text-fg-muted">
                  Solicitada por <span className="font-medium text-fg">{requester?.name ?? '—'}</span>
                  {' · '}{formatBR(i.created_at)}
                </div>

                {!isPending && completer ? (
                  <div className="text-[11px] text-fg-muted">
                    Concluída por <span className="font-medium text-fg">{completer.name}</span>
                    {i.completed_at ? ` · ${formatBR(i.completed_at)}` : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Tab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <a href={href} className={
      'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
      (active ? 'bg-bg-elevated text-fg shadow-xs' : 'text-fg-muted hover:text-fg')
    }>
      {label}
      <span className={`tabular rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-grey-50 text-fg-muted' : 'text-fg-subtle'}`}>{count}</span>
    </a>
  );
}

function formatBR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
