# NSA — Design System

Sistema de design para **Fazenda N.S.A**. Inclui tokens de marca (cor, tipografia, espaçamento, sombras), componentes base (buttons, inputs, badges, tables, KPIs) e três UI kits construídos sobre esses tokens.

```
design_system/
├── colors_and_type.css       ← fonte única da verdade: CSS variables + font imports
├── preview/                  ← cards de revisão (Type, Colors, Spacing, Components, Brand)
├── assets/                   ← logos + fotos da fazenda
└── ui_kits/
    ├── board_deck/           ← deck para conselho / investidores (1920×1080)
    ├── dashboard/            ← app web de gestão (1440×900)
    └── mobile_app/           ← app iOS de campo (mecânica · OS)
```

---

## 1. Context — quem, o que, por quê

**Fazenda N.S.A** é uma fazenda brasileira de pecuária + agricultura (soja, milho, capim) de ~4.000 ha, com ~3.700 cabeças de gado e uma equipe de campo que se comunica majoritariamente via WhatsApp. O sistema foi desenhado para três públicos e três contextos:

| Público | Produto | Contexto |
|---|---|---|
| Conselho / investidores | `board_deck` | Reuniões trimestrais com dados financeiros + operacionais |
| Gestor(a) no escritório | `dashboard` | Uso diário para decisão rápida (piquetes, rebanho, caixa) |
| Equipe de campo (mecânica) | `mobile_app` | Ordens de serviço em equipamentos agrícolas |

**Princípios:**
- **Legibilidade em primeiro lugar.** Números grandes, tabulares, com contraste alto. Esta é uma fazenda real, não uma fintech.
- **Discrição sobre decoração.** Cartões planos, hairlines de 1px, sombras sutis. Nada de glassmorphism.
- **Paleta restrita.** Verde profundo + creme como assinatura; o resto é off-white neutro. Cor com propósito (status, alertas).
- **Português brasileiro.** Copy em pt-BR por padrão. Datas em dd/mmm, moeda em R$, separadores com vírgula decimal.

---

## 2. Content — voz, copy, dados

- **Tom:** direto, técnico, sem floreios. "Rebanho total" > "Seu rebanho atual".
- **Unidades visíveis:** `sc/ha`, `cab.`, `ha`, `UA/ha`, `R$ M`. Nunca esconda a unidade de contexto agronômico.
- **Datas:** `18/abr 07:30`, `12/abr`, `set/25` (mês abreviado sem ponto em layouts apertados). Labels longos: `Safra 2024/5`.
- **Status semânticos (3 níveis):** `ok` / `atenção` / `crítico`. Use as cores `semantic.*` consistentemente — a equipe aprende a reconhecer a cor antes da palavra.
- **Nomes reais:** a equipe tem nomes; use-os. "Valdir · campo", "Edmilson · mecânica" é mais humano que "Usuário 7".

---

## 3. Visual — tokens

### Cores

| Token | Hex | Uso |
|---|---|---|
| `--nsa-green` | `#172514` | Marca primária. Backgrounds profundos, texto em creme. |
| `--nsa-cream` | `#FFFFE3` | Companheiro da marca. Só sobre verde. |
| `--bg-canvas` | `#fcfcfb` | Fundo do app (quase branco, quente). |
| `--bg-surface` | `#ffffff` | Cartões, tabelas. |
| `--border` | `#e5e5e1` | Hairlines (1px). |
| `--border-strong` | `#d2d2cd` | Divisores mais pesados, bordas de inputs. |
| `--ink-primary` | `#1f1f1c` | Texto principal. |
| `--ink-secondary` | `#54544f` | Texto secundário / legendas. |
| `--ink-muted` | `#787873` | Labels, placeholders. |
| `--ink-disabled` | `#a8a8a2` | Estados desabilitados, linhas fracas. |
| `--semantic-ok-*` | `#2e8c4f` / `#eaf4ec` | Sucesso, "Concluído", "Saudável". |
| `--semantic-warn-*` | `#b88217` / `#faf1dc` | Atenção, pendências. |
| `--semantic-danger-*` | `#c0392b` / `#faeae7` | Crítico, alertas de água/insumo. |
| `--semantic-info-*` | `#3a6ea5` / `#eaf0f6` | Informativo, "Em andamento". |

### Tipografia

- **Sans:** `Inter` — 400 / 500 / 600 / 700. Corpo de texto, UI.
- **Serif:** `Lora` — 600 / 700. Uso exclusivo em: wordmark N.S.A, títulos de seção do deck, números grandes hero (KPIs de capa).
- **Mono:** `ui-monospace` stack — IDs (OS 2026-042), códigos de piquete (P01), timestamps.
- **Tabular numerals** (`font-variant-numeric: tabular-nums`) em **toda** coluna de números. Não é opcional.

Escala (tamanhos em px):

| Nome | Tamanho | Uso |
|---|---|---|
| display | 56–96 | Hero de slide / número KPI grande |
| h1 | 28–34 | Título de view |
| h2 | 20–24 | Título de seção |
| body | 14–15 | Corpo padrão |
| small | 12–13 | Metadados, sublabels |
| caption | 11 | Eyebrow maiúsculas com `letter-spacing: 0.08em` |

### Espaçamento

Escala em múltiplos de 4: `4, 8, 12, 16, 20, 24, 32, 40, 56, 80`. Favoreça 12 para gaps em grids densos, 16–24 para padding de cartão, 28–40 para padding de view.

### Border radius

`4` (chips) · `6` (buttons sm) · `8` (cards web) · `10` (buttons primários) · `14` (cards mobile) · `26` (iOS list groups, inerdado do sistema).

### Sombras

- `--shadow-card-web`: `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)` — cartões leves.
- `--shadow-card-mobile`: `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)` — idem.
- Evite sombras de elevação maiores (>10% alpha) exceto em popovers/modais.

---

## 4. Iconography

- **Lucide icons**, CDN: `https://unpkg.com/lucide@latest`.
- **Tamanhos:** 14px inline com texto · 16px em tabelas · 18–20px em nav · 22px em tab bar mobile · 24px em botões primários.
- **Stroke:** `1.75` sempre. Não use `2` (grosso demais) nem `1.5` (fraco demais para a densidade do produto).
- **Cor:** herda do contexto (`currentColor`). Nunca coloridos.
- **Uso restrito:** ícone acompanha label quase sempre. Ícone sozinho apenas em ações universais (close, chevron, ellipsis).

Ícones recomendados por domínio:

| Domínio | Ícones |
|---|---|
| Pecuária | `activity`, `droplets`, `layout-grid` (piquetes) |
| Agricultura | `sprout`, `tractor`, `calendar-days` |
| Mecânica | `wrench`, `clipboard-list`, `package` |
| Financeiro | `line-chart`, `trending-up`, `trending-down`, `receipt` |
| Estado | `check-circle-2`, `alert-triangle`, `alert-circle`, `info` |

---

## 5. Componentes

Tudo em `preview/components-*.html` como referência visual. Implementações JSX estão em `ui_kits/dashboard/` (web) e `ui_kits/mobile_app/Screens.jsx` (mobile). Os principais:

- **`Button`** — primary (verde+creme) / secondary (branco+borda cinza) / ghost. Raio 6 (sm) / 10 (md).
- **`Input`** — 40px altura, borda `--border-strong`, raio 6. Label acima, help/error abaixo.
- **`Badge` / `StatusPill`** — `--semantic-*-bg` + `--semantic-*-fg`, com dot opcional (5px).
- **`KPICard`** — label caption + valor hero tabular + sparkline opcional + delta com seta.
- **`DataTable`** — header strip com título+ação, zebra 2%, hairline entre linhas, primeira coluna com contexto (avatar/ícone/código), última coluna com status pill.
- **`Sparkline`** — SVG polyline 72×24, stroke 1.5, cor semântica.
- **`Sidebar` (web)** — fundo verde profundo, grupos em caption maiúsculo, ícone 16px+label 13px, item ativo com fundo creme translúcido.
- **`TopBar` (web)** — breadcrumb, busca 360px com `⌘K`, notifications, ação primária.
- **`OSCard` (mobile)** — código mono + status pill + título + metadata, raio 14px.

---

## 6. Index

### Design system preview pane
Abra `preview/*.html` pelo review pane para ver cada token/componente isoladamente.

### UI kits
| Kit | Entry | Viewport |
|---|---|---|
| Board Deck | [`ui_kits/board_deck/index.html`](ui_kits/board_deck/index.html) | 1920×1080 |
| Dashboard | [`ui_kits/dashboard/index.html`](ui_kits/dashboard/index.html) | 1440×900 |
| Mobile App | [`ui_kits/mobile_app/index.html`](ui_kits/mobile_app/index.html) | 2 × 390×800 |

### Assets
- `assets/logo-nsa-*.png` — wordmark em 4 tratamentos (creme/verde × sólido/transparente).
- `assets/photo-*.jpg` — fotos de referência da fazenda (canavial, pasto). **Mais fotos serão adicionadas** — o cliente quer mandar uma biblioteca maior.

---

## 7. Convenções de código

- **React + Babel inline** em todos os UI kits. Pins com integrity hash em cada `index.html`.
- **Estilos:** inline styles em props `style={...}` (coesão com componentes) **+** variáveis CSS globais em `colors_and_type.css`. Não há CSS-in-JS framework.
- **Nomenclatura de `styles`:** sempre prefixada (`kpiStyles`, `tableStyles`, `sidebarStyles`) — nunca `styles` global, colisão garantida.
- **Compartilhamento entre `<script type="text/babel">`:** `Object.assign(window, { Component1, Component2 })` no fim do arquivo.

---

## 8. Próximos passos sugeridos

1. **Expandir biblioteca de fotos** (cliente vai enviar).
2. **Dashboard:** views `Rebanho`, `Talhões`, `Caixa & dívida`, `Relatórios do robô WhatsApp`.
3. **Mobile:** telas de novo registro (foto + voz), perfil, sync offline.
4. **Deck:** template adicional de "resultado operacional mensal" para reuniões mais frequentes.
5. **Dark mode** do dashboard (opcional — uso é diurno, mas valeria testar).
