'use server';

import { revalidatePath } from 'next/cache';
import { getSessionOrRedirect } from '@/lib/auth/session-server';
import { salvarPrecoEntrada } from '@/lib/precos';

export interface PrecoFormState {
  erro?: string;
  ok?: string;
}

/** Classifica uma entrada de estoque: compra com preço, ou "não é compra". */
export async function salvarPrecoAction(
  _prev: PrecoFormState,
  formData: FormData,
): Promise<PrecoFormState> {
  const session = await getSessionOrRedirect();

  const eventId = String(formData.get('eventId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { erro: 'Entrada inválida.' };

  const naoEhCompra = formData.get('naoEhCompra') === 'on';
  const bruto = String(formData.get('preco') ?? '').trim().replace(/\./g, '').replace(',', '.');

  let preco: number | null = null;
  if (!naoEhCompra) {
    preco = Number(bruto);
    if (!bruto || !Number.isFinite(preco) || preco <= 0) {
      return { erro: 'Informe o preço por saco (ex.: 128,50) ou marque "não é compra".' };
    }
  }

  try {
    await salvarPrecoEntrada(
      { eventId, isPurchase: !naoEhCompra, precoPorSaco: preco },
      session.accessToken,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { erro: msg.includes('42501') ? 'Sem permissão para gravar preço.' : `Falha ao gravar: ${msg}` };
  }

  revalidatePath('/configuracoes');
  revalidatePath('/consumo');
  return { ok: naoEhCompra ? 'Marcado como não-compra.' : 'Preço gravado.' };
}
