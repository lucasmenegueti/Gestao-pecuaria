'use client';

import { Printer } from 'lucide-react';

/** Imprime a tela atual via diálogo do navegador. Some na própria impressão. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-strong bg-bg-elevated px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:bg-grey-50 print:hidden"
    >
      <Printer size={14} strokeWidth={1.75} />
      <span>Imprimir</span>
    </button>
  );
}
