# Gestão Mecânica — Proposta de Redesign

Redesign do app [`lucasmenegueti/gestao-mecanica`](https://github.com/lucasmenegueti/gestao-mecanica) alinhado ao sistema de design NSA. Preserva toda a arquitetura atual (Next.js App Router, service layer, Airtable, roles) — troca apenas o vocabulário visual.

## O que muda (para Claude Code aplicar)

### 1. Tokens de cor — `src/app/globals.css`

Substituir os tokens atuais:

```css
/* ANTES */
--color-blue: #185FA5;
--color-blue-bg: #E6F1FB;

/* DEPOIS (NSA) */
--color-primary: #172514;          /* verde-cedro NSA */
--color-primary-ink: #FFFFE3;      /* creme, só sobre verde */
--color-primary-bg: #f0f1ee;       /* tint suave para selecionados */

--color-bg: #ffffff;
--color-bg2: #fcfcfb;              /* canvas mais quente */
--color-bg3: #f6f6f2;              /* muted surfaces */

--color-text: #1f1f1c;
--color-text2: #54544f;
--color-text3: #787873;
--color-text4: #a8a8a2;            /* novo: disabled */

--color-border: #e5e5e1;
--color-border2: #d2d2cd;
```

**Paletas semânticas** (mantidas, apenas refinadas para casarem com a marca):

| Uso | Fg | Bg | Ink |
|---|---|---|---|
| ok (verde) | `#2e8c4f` | `#eaf4ec` | `#1f5d36` |
| warn (âmbar) | `#b88217` | `#faf1dc` | `#7a550f` |
| danger (vermelho) | `#c0392b` | `#faeae7` | `#7d2519` |
| info (azul) | `#3a6ea5` | `#eaf0f6` | `#264868` |

### 2. Tipografia

Adicionar no `layout.jsx` via `next/font/google`:

```jsx
import { Inter, Lora } from "next/font/google";
const inter = Inter({ subsets:["latin"], weight:["400","500","600","700"], variable:"--font-inter" });
const lora  = Lora({  subsets:["latin"], weight:["600","700"], variable:"--font-lora" });
```

- Inter em tudo (body, UI)
- Lora só em títulos de header de contexto (ex: "Bom dia, Edmilson.", "Ordens de serviço")
- Adicionar `font-variant-numeric: tabular-nums` em toda coluna de números (OS #, dias parados, horímetro, KPIs)

### 3. Componentes a atualizar

| Componente | Mudança |
|---|---|
| `Header.jsx` | Nova variante "brand": fundo verde + texto creme para telas-âncora (Menu, OS, Nova OS, Dashboard, Máquinas). Mantém a variante branca atual para forms internos. |
| `Menu` (`src/app/menu/page.jsx`) | Grid cards com ícones Lucide. **Ordem preservada do app atual** (OS abertas · OS finalizadas · Nova OS · Peças pendentes · Máquinas · Histórico peças · Relatório diário · Cadastro pessoas) — usuários já decoraram as posições. Nova OS mantém destaque visual (verde) por ser a ação mais frequente, e também aparece como FAB na lista de OS. Dashboard vira card verde full-width abaixo do grid. Header com saudação + contadores. |
| Botões | Primário: verde + creme, 10px radius. Selecionado (prioridade/origem): bg bg2 + borda verde. |
| Badges OS | Urgente→danger pill, Normal→info pill, Baixa→neutral pill. Todos com dot 5px. |
| OS list | Agrupamento por prioridade mantido. Borda esquerda vermelha em urgente OU ≥7 dias. Ícone alert-triangle quando alerta. FAB flutuante "Nova OS" (verde, 56×56) no canto inferior direito — substitui o item 3 do menu. |
| Máquinas | Ícone tractor na miniatura. Filtros como chips horizontais (scroll) em vez de grid. |
| Dashboard | Cards de filtro viram segmented control (bg muted, chip branco ativo). Barras usam verde NSA em vez de azul; barras de "máquinas paradas" usam danger/warn/neutral conforme severidade. |

### 4. Ícones

Adicionar `lucide-react`:
```bash
npm install lucide-react
```
Uso: `<Wrench size={18} strokeWidth={1.75} />`. Cor herda de `currentColor` — nunca coloridos.

### 5. Radius

- Cards: 12–14px (atualmente 8–12)
- Botões: 10px
- Inputs: 8px
- Pills/chips: 999 (mantido)

## Telas incluídas neste mockup

1. **Login** — wordmark grande em serif, botão primário verde
2. **Menu** — header de contexto + grid de cards com ícones + FAB Dashboard
3. **OS abertas** — busca + grupos por prioridade + FAB Nova OS
4. **OS detalhe** — diagnóstico + meta + peças + atualizações + sticky actions
5. **Nova OS** — form denso, segmented para prioridade/origem
6. **Dashboard** — filtros segmented + KPIs + barras por mecânico + parada + origem
7. **Máquinas** — filtros chip + cards com ícone + pills semânticas

### 6. Logos (IMPORTANTE)

Os logos **não estão no repo** — copie de `ui_kits/gestao_mecanica_redesign/public/` para `public/` do projeto Next.js:

```
public/
├── logo-nsa-green-transparent.png   ← usado no Login (fundo creme)
└── logo-nsa-cream-transparent.png   ← usado no Header verde (Menu, etc.)
```

Depois, no JSX:

```jsx
// src/app/login/page.jsx
<img src="/logo-nsa-green-transparent.png" alt="NSA" style={{ height: 72 }} />

// src/components/Header.jsx (variante brand)
<img src="/logo-nsa-cream-transparent.png" alt="NSA" style={{ height: 24 }} />
```

Next.js serve arquivos de `public/` na raiz — o caminho começa com `/` e não precisa de import. Se preferir otimização, troque por `next/image`:

```jsx
import Image from "next/image";
<Image src="/logo-nsa-green-transparent.png" alt="NSA" width={200} height={72} priority />
```

## Fora do escopo deste redesign

- API routes, service layer, Airtable schema — mantidos
- Lógica de auth, roles, auto-status de máquina — mantidos
- Fluxo de criação/conclusão de OS — mantido
- Relatório diário, histórico de peças, cadastro de pessoas — não redesenhados (padrão aplicado pelo Claude Code conforme os componentes acima)

## Como aprovar

Revise o arquivo `index.html` no preview. Se aprovado, o Claude Code pode começar pela seção **1. Tokens** (mudança isolada, baixo risco — só muda CSS). Se algo precisa ajustar antes, comente no card.
