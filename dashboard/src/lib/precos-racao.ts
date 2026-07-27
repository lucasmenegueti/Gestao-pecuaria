// Preço da ração e conversão de arroba — parâmetros que NÃO existem no banco
// do app pecuária. Editar aqui é a única forma de alimentar as colunas de custo.

/**
 * Preço em R$ por saco, por nome de fórmula (igual ao cadastrado em `formulas.name`).
 * `null` = preço não informado → as colunas de custo (R$, R$/@) mostram "—".
 *
 * O peso do saco vem do banco (`formulas.kg_per_sack`), não daqui.
 */
export const PRECO_POR_SACO: Record<string, number | null> = {
  'Probeef Reprodução Ureia ADT': null,
  'Probeef Topmost NITRO': null,
  'Probeef Topmost Golden': null,
  'Probeef Reprodução': null,
  'Probeef Confinamento Recria': null,
  'Probeef Confinamento Control TMR': null,
  'Probeef Confinamento TMR': null,
  'Adsorb Afla': null,
  'Prohorse Sal 60': null,
  'Engorda 3 KG': null,
  'Proteinado Seco': null,
  'Sal Mineral': null,
};

export function precoDoSaco(formulaName: string): number | null {
  return PRECO_POR_SACO[formulaName] ?? null;
}

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
