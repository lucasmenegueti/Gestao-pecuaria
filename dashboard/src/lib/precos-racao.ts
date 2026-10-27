// Parâmetros de conversão de arroba e pesos de referência.
//
// O preço da ração NÃO fica aqui: vem do custo médio móvel calculado a partir
// das compras lançadas na aba Configurações (`inventory_entry_prices`).

/** Rendimento de carcaça usado pra converter peso vivo em arroba. */
export const RENDIMENTO_CARCACA = 0.5;

/** 1 arroba = 15 kg de carcaça. */
export const KG_CARCACA_POR_ARROBA = 15;

/** Peso vivo equivalente a 1 @ — a 50% de rendimento, 30 kg. */
export const KG_PESO_VIVO_POR_ARROBA = KG_CARCACA_POR_ARROBA / RENDIMENTO_CARCACA;

/** Peso vivo padrão por categoria quando o lote não tem `avg_weight_kg` nem peso visual. */
export const PESO_PADRAO_KG: Record<string, number> = {
  'BEZERRO MAMANDO': 100, 'BEZERRA MAMANDO': 95, 'BEZERRO': 180, 'BEZERRA': 170,
  'GARROTE': 330, 'NOVILHA': 290, 'NOVILHA PRENHA': 310, 'BOI': 550,
  'VACA PARIDA': 450, 'VACA PRENHA': 470, 'VACA SOLTEIRA': 440,
};
