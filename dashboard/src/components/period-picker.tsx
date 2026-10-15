'use client';

import { Calendar, Check, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const OPTS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'semana-passada', label: 'Semana passada' },
  { id: 'custom', label: 'Personalizado' },
] as const;

type PeriodId = typeof OPTS[number]['id'];

/** `allLabel`: opção extra no topo que tira o período da URL (a página decide o que "tudo" significa). */
export function PeriodPicker({ value, allLabel }: { value: string; allLabel?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(searchParams.get('inicio') ?? '');
  const [customEnd, setCustomEnd] = useState(searchParams.get('fim') ?? '');

  const opts: ReadonlyArray<{ id: PeriodId | ''; label: string }> =
    allLabel ? [{ id: '', label: allLabel }, ...OPTS] : OPTS;
  const current = opts.find((o) => o.id === value) ?? opts[0]!;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function pick(id: PeriodId | '') {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('periodo', id);
    else params.delete('periodo');
    if (id !== 'custom') {
      params.delete('inicio');
      params.delete('fim');
    }
    router.push(`?${params.toString()}`);
    if (id !== 'custom') setOpen(false);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('periodo', 'custom');
    params.set('inicio', customStart);
    params.set('fim', customEnd);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-strong bg-bg-elevated px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:bg-grey-50"
      >
        <Calendar size={14} strokeWidth={1.75} />
        <span>{current.label}</span>
        <ChevronDown size={12} strokeWidth={2} className="opacity-60" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[200px] rounded-lg border border-border bg-bg-elevated p-1 shadow-lg">
          {opts.map((o) => (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              type="button"
              className={
                'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ' +
                (o.id === value
                  ? 'bg-nsa-green-100 font-medium text-nsa-green-800'
                  : 'text-fg hover:bg-grey-50')
              }
            >
              {o.label}
              {o.id === value ? <Check size={12} strokeWidth={2.5} className="text-nsa-green-800" /> : null}
            </button>
          ))}
          {value === 'custom' ? (
            <div className="mt-1 border-t border-border-subtle p-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-md border border-border-strong bg-bg-elevated px-2 py-1 text-[12px] text-fg outline-none focus:border-accent"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-md border border-border-strong bg-bg-elevated px-2 py-1 text-[12px] text-fg outline-none focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="mt-2 w-full rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-fg-inverse hover:bg-accent-hover disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
