// NSA Design System — tokens únicos consumidos por toda a UI.
// Espelha colors_and_type.css do design, adaptado pra React Native.

export const NSA = {
  green900: '#0c1609',
  green800: '#172514',
  green700: '#1f3520',
  green600: '#2d4a2e',
  green500: '#3f6340',
  green300: '#8ba68c',
  green100: '#e8ede7',
  green50: '#f4f6f3',

  cream: '#FFFFE3',
  creamDim: '#fafae0',
  cream100: '#fdfdf4',

  grey0: '#ffffff',
  grey25: '#fcfcfb',
  grey50: '#f7f7f5',
  grey100: '#efefec',
  grey200: '#e5e5e1',
  grey300: '#d2d2cd',
  grey400: '#a8a8a2',
  grey500: '#787873',
  grey600: '#54544f',
  grey700: '#363632',
  grey800: '#1f1f1c',
  grey900: '#0f0f0d',

  ok: '#2e8c4f',
  okBg: '#eaf4ec',
  okFg: '#1f5d36',
  warn: '#b88217',
  warnBg: '#faf1dc',
  warnFg: '#7a550f',
  danger: '#c0392b',
  dangerBg: '#faeae7',
  dangerFg: '#7d2519',
  info: '#3a6ea5',
  infoBg: '#eaf0f6',
  infoFg: '#264868',

  bg: '#fcfcfb',
  bgSubtle: '#f7f7f5',
  bgElevated: '#ffffff',
  bgMuted: '#f6f6f2',
  bgBrand: '#172514',

  inkPrimary: '#1f1f1c',
  inkSecondary: '#54544f',
  inkMuted: '#787873',
  inkDisabled: '#a8a8a2',
  inkInverse: '#FFFFE3',
  inkBrand: '#172514',

  border: '#e5e5e1',
  borderStrong: '#d2d2cd',
  borderSubtle: '#efefec',
  borderInverse: 'rgba(255,255,227,0.12)',
} as const;

// Cores por domínio de avaliação (mantém ordem do menu: suplementação → bombona → forragem → aguada → sanidade → cerca → peso → lavagem).
export const DOMAIN = {
  suplementacao: { tint: '#f4efd9', dot: '#8a7c2b' },
  bombona: { tint: '#f4efd9', dot: '#8a7c2b' }, // mesma família (sup)
  forragem: { tint: '#e6f1e4', dot: '#3b7a3b' },
  aguada: { tint: '#e4eef5', dot: '#2b6a93' },
  biologico: { tint: '#e6f2ea', dot: '#2f7a4d' },
  sanidade: { tint: '#ece5f1', dot: '#6e3b8a' },
  cerca: { tint: '#faeae7', dot: '#b43a2c' },
  peso: { tint: '#faf1dc', dot: '#8a6515' },
  lavagem: { tint: '#e0edf2', dot: '#2b7a8c' },
  rebanho: { tint: '#f4efd9', dot: '#8a7c2b' },
  estoque: { tint: '#faf1dc', dot: '#8a6515' },
  mapa: { tint: '#e6f1e4', dot: '#3b7a3b' },
  ronda: { tint: '#e0edf2', dot: '#2b7a8c' },
} as const;

export type DomainKey = keyof typeof DOMAIN;

// Fontes — chaves consumidas por StyleSheet.textStyle.fontFamily.
// Nome do font carrega weight no suffix (Inter_600SemiBold, Lora_700Bold, etc.)
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  loraSemibold: 'Lora_600SemiBold',
  loraBold: 'Lora_700Bold',
  // mono é fallback do sistema — RN não tem uma mono universal; usamos o mesmo stack
  // do design system tolerante.
  mono: 'Courier',
} as const;

// Escalas tipográficas (em px — RN interpreta como dp).
export const Type = {
  display: 44,
  h1: 32,
  h2: 24,
  h3: 18,
  body: 15,
  small: 13,
  micro: 11,
} as const;

export const Spacing = {
  sp1: 4,
  sp2: 8,
  sp3: 12,
  sp4: 16,
  sp5: 20,
  sp6: 24,
  sp8: 32,
  sp10: 40,
  sp12: 48,
  sp16: 64,
} as const;

export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 14,
  full: 999,
} as const;

export const Shadow = {
  xs: {
    shadowColor: '#0f0f0d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f0f0d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0f0f0d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'default';

/** Paleta derivada pra um status semântico. Evita repetir o ternário
 *  `kind === 'danger' ? X : kind === 'warn' ? Y : Z` em 14 sites. */
export function tokensForStatus(tone: StatusTone): {
  edge: string;
  bg: string;
  fg: string;
  label: string;
} {
  switch (tone) {
    case 'danger':
      return { edge: NSA.danger, bg: NSA.dangerBg, fg: NSA.dangerFg, label: 'Alerta' };
    case 'warn':
      return { edge: NSA.warn, bg: NSA.warnBg, fg: NSA.warnFg, label: 'Atenção' };
    case 'ok':
      return { edge: NSA.ok, bg: NSA.okBg, fg: NSA.okFg, label: 'OK' };
    case 'info':
      return { edge: NSA.info, bg: NSA.infoBg, fg: NSA.infoFg, label: 'Info' };
    default:
      return { edge: NSA.green800, bg: NSA.bgMuted, fg: NSA.inkPrimary, label: '' };
  }
}
