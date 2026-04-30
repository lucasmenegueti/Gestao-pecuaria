// Componentes UI compartilhados pelo dashboard. Server-friendly (puro JSX, sem hooks).

import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

// ----------------------------------------------------------------------------

export function KPICard({
  label, value, unit, hint, accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: 'ok' | 'warn' | 'danger';
}) {
  const edge =
    accent === 'ok' ? 'border-l-success' :
    accent === 'warn' ? 'border-l-warning' :
    accent === 'danger' ? 'border-l-danger' :
    'border-l-border';
  return (
    <div className={`rounded-lg border border-border ${edge} border-l-[3px] bg-bg-elevated px-5 py-4 shadow-xs`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <p className="tabular text-h1 font-semibold leading-none text-fg">{value}</p>
        {unit ? <span className="text-small text-fg-muted">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-small text-fg-muted">{hint}</p> : null}
    </div>
  );
}

// ----------------------------------------------------------------------------

export function StatusPill({
  kind, label, dot = true, size = 'md',
}: {
  kind: 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'brand';
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}) {
  const palette = {
    ok:      'bg-success-bg text-[#1f5d36]',
    warn:    'bg-warning-bg text-[#7a550f]',
    danger:  'bg-danger-bg text-[#7d2519]',
    info:    'bg-info-bg text-[#264868]',
    neutral: 'bg-grey-100 text-grey-600',
    brand:   'bg-nsa-green-100 text-nsa-green-800',
  }[kind];
  const dotColor = {
    ok: 'bg-success', warn: 'bg-warning', danger: 'bg-danger',
    info: 'bg-info', neutral: 'bg-grey-400', brand: 'bg-nsa-green-500',
  }[kind];
  const sz = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${palette} ${sz}`}>
      {dot ? <span className={`h-1 w-1 rounded-full ${dotColor}`} /> : null}
      {label}
    </span>
  );
}

// ----------------------------------------------------------------------------

export function Card({
  title, subtitle, action, padding = 'p-4', children, className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  padding?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-bg-elevated ${className}`}>
      {(title || action) ? (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            {title ? <div className="text-[14px] font-semibold text-fg">{title}</div> : null}
            {subtitle ? <div className="mt-0.5 text-[12px] text-fg-muted">{subtitle}</div> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={padding}>{children}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------

export function SectionPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        background: `${color}14`,
        color,
        borderColor: `${color}30`,
      }}
    >
      {label}
    </span>
  );
}

// ----------------------------------------------------------------------------

export function AlertCard({
  kind, title, body, time, paddock,
}: {
  kind: 'danger' | 'warning' | 'info';
  title: string;
  body?: string;
  time?: string;
  paddock?: string;
}) {
  const palette = {
    danger:  { bg: 'bg-danger-bg',  bd: 'border-danger/30',  fg: 'text-[#7d2519]', Ic: AlertTriangle },
    warning: { bg: 'bg-warning-bg', bd: 'border-warning/30', fg: 'text-[#7a550f]', Ic: AlertCircle },
    info:    { bg: 'bg-info-bg',    bd: 'border-info/30',    fg: 'text-[#264868]', Ic: Info },
  }[kind];
  const Ic = palette.Ic;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border ${palette.bg} ${palette.bd} px-3 py-2.5`}>
      <Ic size={16} strokeWidth={1.75} className={`${palette.fg} mt-0.5 shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className={`text-[13px] font-semibold ${palette.fg}`}>
            {paddock ? <span className="opacity-70">{paddock} · </span> : null}{title}
          </div>
          {time ? <div className={`text-[11px] opacity-70 ${palette.fg} whitespace-nowrap`}>{time}</div> : null}
        </div>
        {body ? <div className={`mt-0.5 text-[12px] leading-snug ${palette.fg} opacity-85`}>{body}</div> : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

export function EmptyState({ icon: Icon, title, body }: { icon?: LucideIcon; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-fg-muted">
      {Icon ? <Icon size={28} strokeWidth={1.5} className="mb-2 opacity-60" /> : null}
      <div className="text-[14px] font-medium text-fg">{title}</div>
      {body ? <div className="mt-1 text-[12px]">{body}</div> : null}
    </div>
  );
}

// ----------------------------------------------------------------------------

export function Avatar({ initials, size = 28, color = '#3f6340' }: { initials: string; size?: number; color?: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-fg-inverse"
      style={{ width: size, height: size, background: color, fontSize: size < 30 ? 11 : 13 }}
    >
      {initials}
    </div>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0]!;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1]!;
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

// ----------------------------------------------------------------------------

export function StatusStripCard({
  kind, label, count, total, icon: Icon,
}: {
  kind: 'ok' | 'warn' | 'danger';
  label: string;
  count: number;
  total: number;
  icon: LucideIcon;
}) {
  const palette = {
    ok:     { edge: 'border-l-success', bg: 'bg-success-bg', fg: 'text-[#1f5d36]' },
    warn:   { edge: 'border-l-warning', bg: 'bg-warning-bg', fg: 'text-[#7a550f]' },
    danger: { edge: 'border-l-danger',  bg: 'bg-danger-bg',  fg: 'text-[#7d2519]' },
  }[kind];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-border ${palette.edge} border-l-[4px] bg-bg-elevated px-4 py-3.5`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${palette.bg} shrink-0`}>
        <Icon size={18} strokeWidth={1.75} className={palette.fg} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-fg-muted">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="tabular text-h2 font-semibold text-fg">{count}</span>
          <span className="text-[12px] text-fg-muted">/ {total}</span>
          <span className={`ml-1 text-[12px] font-medium ${palette.fg}`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Re-export icones úteis
export { CheckCircle2, AlertCircle, XCircle, AlertTriangle, Info };
