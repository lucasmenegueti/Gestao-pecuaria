// Custo médio móvel da ração, por fórmula, ao longo do tempo.
//
// Cada entrada de mercadoria no almoxarifado central pode receber um preço
// (tabela `inventory_entry_prices`). O preço vale só dali pra frente: comprar
// hoje não muda o custo do que foi consumido mês passado.
//
// Funções puras, sem I/O — exercitáveis fora do Next.

export interface EstoqueEventoRow {
  id: string;
  formula_id: string;
  event_type: string;
  sacks_delta: number;
  reason: string | null;
  created_at: string;
}

export interface PrecoEntradaRow {
  inventory_event_id: string;
  is_purchase: boolean;
  price_per_sack: number | null;
}

/** Entradas de mercadoria no central — as únicas que pedem preço. */
export const TIPOS_ENTRADA_CENTRAL = ['ENTRADA_CENTRAL', 'AJUSTE_GANHO_CENTRAL', 'SALDO_INICIAL'] as const;

/**
 * Só `ENTRADA_CENTRAL` é compra por padrão. `AJUSTE_GANHO_CENTRAL` é acerto de
 * contagem física — a diferença já embute consumo não registrado, então tratar
 * como recebimento inflaria quantidade e valor. `SALDO_INICIAL` é abertura.
 * Ambos entram como "confirme se é compra".
 */
export function ehCompraPorPadrao(eventType: string): boolean {
  return eventType === 'ENTRADA_CENTRAL';
}

export function ehEntradaDeMercadoria(eventType: string, sacksDelta: number): boolean {
  return sacksDelta > 0 && (TIPOS_ENTRADA_CENTRAL as readonly string[]).includes(eventType);
}

export interface EstadoCusto {
  /** Sacos em estoque, incluindo o que não tem custo conhecido. */
  saldo: number;
  /** Parcela do saldo com custo conhecido. */
  saldoCusteado: number;
  /** Valor financeiro da parcela custeada. */
  valor: number;
  /** valor / saldoCusteado — null enquanto nada foi precificado. */
  custoMedio: number | null;
}

export interface CustoRacaoResultado {
  /** formulaId → estado ao fim do último evento. */
  atual: Map<string, EstadoCusto>;
  /** formulaId → [{ data, custoMedio }] em ordem cronológica. */
  serie: Map<string, Array<{ data: string; custoMedio: number | null }>>;
  /** IDs de entradas de mercadoria ainda sem classificação de preço. */
  pendentes: Set<string>;
}

export function diaBRT(iso: string): string {
  // created_at vem em UTC; o dia operacional é BRT (-03:00).
  return new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Replay do ledger do estoque central aplicando custo médio móvel.
 *
 * - Entrada com preço informado: soma valor e quantidade, recalcula o médio.
 * - Entrada sem preço (ou marcada "não é compra"): entra pelo médio vigente,
 *   sem alterá-lo. Se nada foi precificado ainda, entra sem custo — e o médio
 *   segue nulo em vez de ser diluído por mercadoria de custo desconhecido.
 * - Saída: baixa pelo médio vigente, proporcional à parcela custeada.
 */
export function calcularCustoMedio(
  eventos: EstoqueEventoRow[],
  precos: PrecoEntradaRow[],
): CustoRacaoResultado {
  const precoPorEvento = new Map(precos.map((p) => [p.inventory_event_id, p]));
  const atual = new Map<string, EstadoCusto>();
  const serie = new Map<string, Array<{ data: string; custoMedio: number | null }>>();
  const pendentes = new Set<string>();

  const ordenados = [...eventos].sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const ev of ordenados) {
    const st = atual.get(ev.formula_id) ?? { saldo: 0, saldoCusteado: 0, valor: 0, custoMedio: null };
    const qtd = ev.sacks_delta;

    if (qtd > 0) {
      const preco = precoPorEvento.get(ev.id);
      const entradaDeMercadoria = ehEntradaDeMercadoria(ev.event_type, qtd);
      if (entradaDeMercadoria && !preco) pendentes.add(ev.id);

      if (entradaDeMercadoria && preco?.is_purchase && preco.price_per_sack != null) {
        st.saldo += qtd;
        st.saldoCusteado += qtd;
        st.valor += qtd * preco.price_per_sack;
      } else if (st.custoMedio != null) {
        // Entra pelo custo que já vigora — não mexe no médio.
        st.saldo += qtd;
        st.saldoCusteado += qtd;
        st.valor += qtd * st.custoMedio;
      } else {
        // Sem custo conhecido: conta em quantidade, fica fora do médio.
        st.saldo += qtd;
      }
    } else if (qtd < 0) {
      const baixa = -qtd;
      // A saída tira da parcela custeada na proporção que ela representa do estoque.
      const fracaoCusteada = st.saldo > 0 ? st.saldoCusteado / st.saldo : 0;
      const baixaCusteada = Math.min(st.saldoCusteado, baixa * fracaoCusteada);
      st.saldo = Math.max(0, st.saldo - baixa);
      st.saldoCusteado = Math.max(0, st.saldoCusteado - baixaCusteada);
      st.valor = Math.max(0, st.valor - baixaCusteada * (st.custoMedio ?? 0));
      if (st.saldoCusteado <= 0) st.valor = 0;
    }

    st.custoMedio = st.saldoCusteado > 0 ? st.valor / st.saldoCusteado : st.custoMedio;
    atual.set(ev.formula_id, st);

    const dia = diaBRT(ev.created_at);
    const hist = serie.get(ev.formula_id) ?? [];
    const ultimo = hist[hist.length - 1];
    if (ultimo && ultimo.data === dia) ultimo.custoMedio = st.custoMedio;
    else hist.push({ data: dia, custoMedio: st.custoMedio });
    serie.set(ev.formula_id, hist);
  }

  return { atual, serie, pendentes };
}

/**
 * Custo médio vigente de uma fórmula numa data — o último apurado até ela.
 * Antes da primeira entrada precificada devolve null (nada é custeado).
 */
export function custoMedioNaData(
  serie: CustoRacaoResultado['serie'],
  formulaId: string,
  data: string,
): number | null {
  const hist = serie.get(formulaId);
  if (!hist || hist.length === 0) return null;
  let achado: number | null = null;
  for (const ponto of hist) {
    if (ponto.data > data) break;
    achado = ponto.custoMedio;
  }
  return achado;
}
