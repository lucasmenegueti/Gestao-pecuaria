'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, X, AlertTriangle } from 'lucide-react';
import { FarmMap, type MapPaddock } from './farm-map';
import { SECTION_LABELS, SECTION_COLORS, type SectionKind } from '@/lib/supabase/types';

export interface PaddockMapDetail {
  id: number;
  name: string;
  status: 'green' | 'yellow' | 'red';
  area: number;
  totalHeads: number;
  stockingRate: number;
  rondas: Array<{
    user: string;
    startTime: string | null;
    sections: Array<{ kind: SectionKind; label: string; color: string; summary: string }>;
  }>;
  alerts: Array<{ severity: 'danger' | 'warning'; detail: string; time: string }>;
  bombona: {
    formula: string;
    sacks: number;
    daysLeft: number | null;
    severity: 'danger' | 'warning' | null;
  } | null;
}

export function FarmMapWithDetail({
  paddocks,
  details,
  height = 600,
}: {
  paddocks: MapPaddock[];
  details: Record<number, PaddockMapDetail>;
  height?: number;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const sel = selectedId != null ? details[selectedId] : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
        <FarmMap
          paddocks={paddocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          height={height}
        />
      </div>

      <aside className="rounded-lg border border-border bg-bg-elevated">
        {sel ? (
          <PaddockDetailPanel detail={sel} onClose={() => setSelectedId(null)} />
        ) : (
          <EmptyDetail />
        )}
      </aside>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="px-5 py-8 text-center">
      <div className="text-[14px] font-medium text-fg">Selecione um talhão</div>
      <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
        Clique em um polígono no mapa para ver quem fez a ronda, quais seções foram avaliadas, alertas ativos e o estoque da bombona.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3 text-[11px] text-fg-muted">
        <Legend color="#2e8c4f" label="Cobertura completa" />
        <Legend color="#b88217" label="Ronda parcial" />
        <Legend color="#c0392b" label="Sem ronda" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color, opacity: 0.6 }} />
      {label}
    </span>
  );
}

function PaddockDetailPanel({ detail, onClose }: { detail: PaddockMapDetail; onClose: () => void }) {
  const palette = {
    green:  { bg: 'bg-success-bg', fg: 'text-[#1f5d36]', Ic: CheckCircle2, label: 'Cobertura completa' },
    yellow: { bg: 'bg-warning-bg', fg: 'text-[#7a550f]', Ic: AlertCircle,  label: 'Ronda parcial' },
    red:    { bg: 'bg-danger-bg',  fg: 'text-[#7d2519]', Ic: XCircle,      label: 'Sem ronda' },
  }[detail.status];
  const Ic = palette.Ic;

  return (
    <div className="flex max-h-[600px] flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-muted">Talhão</p>
          <h3 className="mt-0.5 truncate text-h3 font-semibold tracking-tight text-fg">{detail.name}</h3>
          <p className="mt-1 text-[11px] tabular text-fg-muted">
            {detail.area} ha · {detail.totalHeads} cab
            {detail.totalHeads > 0 ? ` · ${detail.stockingRate.toFixed(2)} cab/ha` : null}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-grey-50 hover:text-fg"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-3">
        <div className={`mb-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-medium ${palette.bg} ${palette.fg}`}>
          <Ic size={14} strokeWidth={2} />
          {palette.label}
        </div>

        {detail.rondas.length > 0 ? (
          <Section title={`Avaliações no período (${detail.rondas.length} ronda${detail.rondas.length === 1 ? '' : 's'})`}>
            <div className="flex flex-col gap-2">
              {detail.rondas.map((r, i) => (
                <div key={i} className="rounded-md bg-grey-50 px-3 py-2">
                  <div className="text-[12px] font-medium text-fg">
                    {r.user}
                    {r.startTime ? <span className="text-fg-muted"> · {r.startTime}</span> : null}
                  </div>
                  {r.sections.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {r.sections.map((s, j) => (
                        <div key={j} className="flex items-start gap-2 text-[11px]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-fg">{s.label}</div>
                            {s.summary ? <div className="text-fg-muted">{s.summary}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Avaliações no período">
            <p className="rounded-md bg-grey-50 px-3 py-2 text-[12px] text-fg-muted">
              Nenhuma ronda registrada nesse período.
            </p>
          </Section>
        )}

        {detail.bombona ? (
          <Section title="Bombona">
            <div className={`flex items-center justify-between rounded-md px-3 py-2 ${
              detail.bombona.severity === 'danger' ? 'bg-danger-bg' :
              detail.bombona.severity === 'warning' ? 'bg-warning-bg' : 'bg-grey-50'
            }`}>
              <div>
                <div className="text-[12px] font-medium text-fg">{detail.bombona.formula}</div>
                <div className="text-[11px] tabular text-fg-muted">
                  {detail.bombona.sacks} sacos
                  {detail.bombona.daysLeft != null ? ` · zera em ${detail.bombona.daysLeft}d` : null}
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        {detail.alerts.length > 0 ? (
          <Section title={`Alertas ativos (${detail.alerts.length})`}>
            <div className="flex flex-col gap-1.5">
              {detail.alerts.map((a, i) => {
                const isDanger = a.severity === 'danger';
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md px-2.5 py-2 ${isDanger ? 'bg-danger-bg' : 'bg-warning-bg'}`}
                  >
                    <AlertTriangle
                      size={13}
                      strokeWidth={1.75}
                      className={`mt-0.5 shrink-0 ${isDanger ? 'text-[#7d2519]' : 'text-[#7a550f]'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-medium ${isDanger ? 'text-[#7d2519]' : 'text-[#7a550f]'}`}>
                        {a.detail}
                      </div>
                      {a.time && a.time !== '—' ? (
                        <div className={`text-[10px] opacity-70 ${isDanger ? 'text-[#7d2519]' : 'text-[#7a550f]'}`}>{a.time}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-muted">{title}</h4>
      {children}
    </div>
  );
}
