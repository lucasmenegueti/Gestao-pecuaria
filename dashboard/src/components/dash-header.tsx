import { PeriodPicker } from './period-picker';
import { PrintButton } from './print-button';
import type { Period } from '@/lib/period';

export function DashHeader({
  eyebrow, title, period,
}: {
  eyebrow?: string;
  title: string;
  period: Period;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-h2 font-semibold tracking-tight text-fg md:text-h1">{title}</h1>
        <p className="mt-1 text-small text-fg-muted">
          {period.label}
          {period.kind === 'custom' ? '' : null}
        </p>
      </div>
      <div className="flex items-center gap-2 print:hidden">
        <PrintButton />
        <PeriodPicker value={period.kind} />
      </div>
    </div>
  );
}
