import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { PaddockEnriched } from '@/lib/queries';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/supabase/types';
import { Avatar, SectionPill, initialsOf } from './ui-primitives';

export function PaddockCard({ enriched }: { enriched: PaddockEnriched }) {
  const { paddock, status, totalHeads, stockingRate, lastRondaUser, rondasInPeriod } = enriched;
  const palette = {
    green:  { edge: 'border-l-success',  tag: 'bg-success-bg text-[#1f5d36]', label: 'Cobertura completa', Ic: CheckCircle2 },
    yellow: { edge: 'border-l-warning',  tag: 'bg-warning-bg text-[#7a550f]', label: 'Ronda parcial',      Ic: AlertCircle },
    red:    { edge: 'border-l-danger',   tag: 'bg-danger-bg text-[#7d2519]',  label: 'Sem ronda',          Ic: XCircle },
  }[status];
  const Ic = palette.Ic;
  const allSections = Array.from(new Set(rondasInPeriod.flatMap((r) => r.sections))).sort();
  const lastRonda = rondasInPeriod[0] ?? null;

  return (
    <div className={`flex flex-col gap-2.5 rounded-lg border border-border ${palette.edge} border-l-[4px] bg-bg-elevated px-4 py-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-fg">{paddock.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
            <span className="tabular">{paddock.area_hectares} ha</span>
            <span className="text-grey-300">·</span>
            <span className="tabular">{totalHeads} cab</span>
            {totalHeads > 0 ? (
              <>
                <span className="text-grey-300">·</span>
                <span className="tabular">{stockingRate.toFixed(2)} cab/ha</span>
              </>
            ) : null}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${palette.tag}`}>
          <Ic size={10} strokeWidth={2.5} />
          {palette.label}
        </span>
      </div>

      {lastRondaUser && lastRonda ? (
        <div className="flex items-center gap-2 text-[12px]">
          <Avatar initials={initialsOf(lastRondaUser.name)} size={22} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-fg">{lastRondaUser.name}</div>
            <div className="text-[11px] text-fg-muted">
              {rondasInPeriod.length} ronda{rondasInPeriod.length === 1 ? '' : 's'} · {allSections.length} {allSections.length === 1 ? 'seção' : 'seções'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[12px] italic text-fg-muted">Nenhuma interação no período</div>
      )}

      {allSections.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {allSections.map((sec) => (
            <SectionPill
              key={sec}
              label={SECTION_LABELS[sec].slice(0, 3).toUpperCase()}
              color={SECTION_COLORS[sec]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
