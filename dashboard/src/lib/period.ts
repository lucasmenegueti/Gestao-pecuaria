// Helpers de período. URL ?periodo=hoje|ontem|7d|semana-passada|custom&inicio=YYYY-MM-DD&fim=YYYY-MM-DD

export type PeriodKind = 'hoje' | 'ontem' | '7d' | 'semana-passada' | 'custom';

export interface Period {
  kind: PeriodKind;
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD inclusive
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function lastMonday(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0=dom 1=seg
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(x, -back);
}

function periodLabel(kind: PeriodKind, start: string, end: string): string {
  if (kind === 'hoje') return 'Hoje';
  if (kind === 'ontem') return 'Ontem';
  if (kind === '7d') return 'Últimos 7 dias';
  if (kind === 'semana-passada') return 'Semana passada';
  return `${formatBR(start)} – ${formatBR(end)}`;
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function parsePeriodFromSearchParams(params: { periodo?: string; inicio?: string; fim?: string }): Period {
  const today = new Date();
  const kind = (params.periodo as PeriodKind) || 'hoje';

  if (kind === 'hoje') {
    const t = fmt(today);
    return { kind, start: t, end: t, label: 'Hoje' };
  }
  if (kind === 'ontem') {
    const y = fmt(addDays(today, -1));
    return { kind, start: y, end: y, label: 'Ontem' };
  }
  if (kind === '7d') {
    const start = fmt(addDays(today, -6));
    const end = fmt(today);
    return { kind, start, end, label: 'Últimos 7 dias' };
  }
  if (kind === 'semana-passada') {
    const thisMon = lastMonday(today);
    const lastMon = addDays(thisMon, -7);
    const lastSun = addDays(thisMon, -1);
    return {
      kind,
      start: fmt(lastMon),
      end: fmt(lastSun),
      label: 'Semana passada',
    };
  }
  // custom
  const start = (params.inicio && /^\d{4}-\d{2}-\d{2}$/.test(params.inicio)) ? params.inicio : fmt(today);
  const end = (params.fim && /^\d{4}-\d{2}-\d{2}$/.test(params.fim)) ? params.fim : fmt(today);
  return { kind: 'custom', start, end, label: periodLabel('custom', start, end) };
}

export function periodHrefParams(p: Period): URLSearchParams {
  const u = new URLSearchParams();
  u.set('periodo', p.kind);
  if (p.kind === 'custom') {
    u.set('inicio', p.start);
    u.set('fim', p.end);
  }
  return u;
}
