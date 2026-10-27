'use client';

import { useActionState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { salvarPrecoAction, type PrecoFormState } from './actions';

interface Props {
  eventId: string;
  precoAtual: number | null;
  isPurchase: boolean;
  classificada: boolean;
  compraPorPadrao: boolean;
  precoSugerido: number | null;
}

const emReal = (v: number) => String(v).replace('.', ',');

export function PrecoForm({
  eventId, precoAtual, isPurchase, classificada, compraPorPadrao, precoSugerido,
}: Props) {
  const [state, action, pending] = useActionState<PrecoFormState, FormData>(salvarPrecoAction, {});
  // Entrada sem preço já abre com o último preço pago naquela ração.
  const valorInicial = precoAtual ?? (compraPorPadrao ? precoSugerido : null);

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-fg-muted">
          R$
        </span>
        <input
          name="preco"
          inputMode="decimal"
          defaultValue={valorInicial != null ? emReal(valorInicial) : ''}
          placeholder={precoSugerido != null ? emReal(precoSugerido) : 'por saco'}
          title={
            precoAtual == null && precoSugerido != null
              ? `Sugestão: último preço pago nessa ração (R$ ${emReal(precoSugerido)})`
              : undefined
          }
          aria-label="Preço por saco"
          className="w-[104px] rounded-md border border-border-strong bg-bg-elevated py-1 pl-7 pr-2 text-right text-[13px] tabular text-fg outline-none focus:border-accent"
        />
      </div>
      <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-fg-muted">
        <input
          type="checkbox"
          name="naoEhCompra"
          defaultChecked={classificada ? !isPurchase : !compraPorPadrao}
          className="h-3.5 w-3.5 accent-nsa-green-500"
        />
        não é compra
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-fg-inverse transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : null}
        Salvar
      </button>
      {state.ok ? (
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
          <Check size={12} strokeWidth={2.5} />
          {state.ok}
        </span>
      ) : null}
      {state.erro ? <span className="text-[12px] font-medium text-danger">{state.erro}</span> : null}
    </form>
  );
}
