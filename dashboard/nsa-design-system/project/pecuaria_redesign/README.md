# Gestão Pecuária NSA — Handoff para Claude Code

Redesign do protótipo `prototipo_original/` alinhado ao sistema de design **NSA** (verde-cedro + creme, Inter/Lora, Lucide 1.75). Este pacote preserva **toda a lógica do app atual** — apenas troca o vocabulário visual.

> **Escopo:** 18 telas representativas mobile (390px). O app real tem ~46 telas no total (1 login + 1 dashboard + 1 ronda + 1 menu avaliação + 7 wizards com 31 passos + 4 utilitárias + 2 estoque + 4 reabastecimento + 2 admin). As decisões visuais aqui se aplicam **1:1** a todas as telas restantes via os mesmos atoms.

---

## 1. O que NÃO muda (lógica preservada)

- **Fluxos e estados:** login → dashboard → ronda → seleção piquete → menu avaliação → wizard (8/6/3/4/3/3/4 passos) → resumo → retorno ao menu.
- **Domínios de avaliação:** Suplementação · Forragem · Aguada · Sanidade · Cerca · Peso visual · Lavagem de bebedouro.
- **Modelos de dados:** piquetes, lotes, categorias, formulações, bombonas, estoque central, rota de reabastecimento, tipos de capim.
- **Regras de negócio:** cálculo de dias restantes (cocho + bombona), status por piquete, mínimo de estoque, previsão de suprimento, lotação (cab/ha).
- **Sync offline:** o badge "N registros aguardando sinc." continua existindo.

## 2. O que muda (design)

### Cores
Substituir todos os tokens do `prototipo_original/styles.css`:

| Antes (protótipo) | Depois (NSA) | Token CSS |
|---|---|---|
| `--primary` (verde-azulado claro) | `#172514` verde-cedro profundo | `--nsa-green` |
| (não existia) | `#FFFFE3` creme | `--nsa-cream` |
| `--success` vivo | `#2e8c4f` / bg `#eaf4ec` | `--semantic-ok-*` |
| `--warning` laranja | `#b88217` / bg `#faf1dc` | `--semantic-warn-*` |
| `--danger` vermelho | `#c0392b` / bg `#faeae7` | `--semantic-danger-*` |
| `--text-muted` | `#787873` | `--ink-muted` |
| fundos cinza-azulados | `#fcfcfb` canvas · `#ffffff` surface | `--bg-*` |

**Fonte única da verdade:** `colors_and_type.css` (na raiz do projeto). O `index.html` linka esse arquivo.

### Tipografia
- **Inter** (400/500/600/700) para corpo + UI. Substitui a stack system-ui atual.
- **Lora** (600/700) em números hero (KPIs, previsão, peso, kV, rebanho total) e em títulos de header de contexto ("Pasto 14", "Rota de bombonas").
- **ui-monospace** em códigos de piquete (`P14`, `P14A`), ticks de timestamp, step counters (`4 / 8`).
- `font-variant-numeric: tabular-nums` em **toda** coluna ou KPI numérico. Não-opcional.

### Iconografia
- **Lucide** (`https://unpkg.com/lucide@latest`) substitui 100% dos emojis.
- Stroke **1.75**. Tamanhos: 14px inline · 16px em linhas · 18–20px em cabeçalhos · 22px em tab bar.
- Herda `currentColor`. Nada colorido dentro do ícone.

**Mapeamento de emojis → ícones** (usar em todos os lugares do app):

| Emoji atual | Ícone Lucide | Contexto |
|---|---|---|
| 🐂 / 🐄 | `beef` | Rebanho, gado, categoria animal |
| 📦 | `package` / `package-open` | Estoque, bombona |
| 📡 | `wifi` / `wifi-off` + `refresh-cw` | Sync |
| 🔒 | `lock` (ou implícito em `log-in`) | Login, senha |
| 👤 | `user` | Usuário |
| 🚶 | `footprints` | Ronda |
| 📊 | `layout-dashboard` / `bar-chart-3` | Painel, lotação |
| 🗺️ | `map` / `map-pin` | Mapa |
| 🌿 | `sprout` | Forragem, capim |
| 💧 | `droplets` / `droplet` / `droplet-off` | Aguada |
| 🥣 / 🌾 | `wheat` | Suplementação, cocho |
| ⚡ | `zap` / `zap-off` | Cerca elétrica |
| 🩺 | `stethoscope` | Sanidade |
| ⚖️ | `scale` | Peso visual |
| 🚿 | `droplet` | Lavagem bebedouro |
| 🚜 | `truck` / `tractor` | Reabastecimento |
| ⚠️ | `alert-triangle` / `alert-circle` | Alertas |
| ✅ | `check-circle-2` / `check` | Sucesso |
| 🔴/🟡/🟢 (status) | cor + `StatusPill` sem ícone | Status |
| 📷 | `camera` | Foto |
| ⚙️ | `settings` | Admin |
| ✏️ | `pencil` | Editar |
| 🔍 | `search` | Busca |
| ← → | `chevron-left` / `arrow-right` | Navegação |

**Regra:** ícones coloridos dentro do produto (🔴🟡🟢) são substituídos **pelo componente `StatusPill`** com dot semântico, nunca por ícone colorido isolado.

### Componentes

Os atoms estão em `atoms.jsx` — mesmos nomes, plug-and-play:

- `BrandHeader` · `WizardHeader` — headers verde profundo com contexto + progresso
- `PrimaryButton` · `SecondaryButton` — CTAs verde/creme e branco/cinza
- `StatusPill` — pills `ok / warn / danger / info / neutral` com dot 5px
- `ChoiceCard` — radio visual grande (substitui `.choice-option` do protótipo)
- `PiqueteCard` — card de lista de piquete com código mono + pill + left-border
- `KPI` · `ProgressBar` — números hero + barra semântica
- `TabBar` — tab bar mobile (Painel · Ronda · Rebanho · Estoque · Mapa)
- `AlertRow` · `SectionCaption` · `DomainTile` · `Input` · `Select` · `Textarea` · `Label` · `Segmented`
- `WizardFooter` — footer fixo com Voltar + Avançar (variante `success` para Finalizar)

### Padrões de layout
- **Raio de cartão mobile:** 14px (antes 8px).
- **Left-border 3px** nos cards de status (mantido do original, cores trocadas).
- **Sombra:** `0 1px 2px rgba(0,0,0,0.04)` + `0 0 0 1px rgba(0,0,0,0.05)`. Nada mais pesado.
- **Header de contexto:** sempre verde profundo (`--nsa-green`) + creme. Substitui o header branco com borda.
- **Caixa-alta agressiva do protótipo → case natural.** "PASTO 14" vira "Pasto 14" (com código `P14` em mono ao lado). Mais respeitoso com o usuário.
- **Copy pt-BR** mantido, mas com acentuação e pontuação corretas: "Cocho: 3 dias" vira "Cocho · 3 dias".

## 3. Telas entregues neste canvas

| Bloco | Telas |
|---|---|
| Entrada + painel | `01-login` · `02-dashboard` · `15-lotacao` |
| Ronda | `03-ronda-piquetes` · `04-menu-avaliacao` |
| Suplementação (8 passos — 3 chaves) | passo 1 (escore) · passo 4 (quantidade) · passo 8 (resumo + previsão) |
| Demais wizards (1 passo-chave de cada) | `06-forragem` · `07-aguada` · `08-sanidade` · `09-cerca` · `10-peso-visual` |
| Operação | `11-mapa` · `12-rebanho` · `13-estoque` · `14-reabastecimento-2` (rota) |

> **Aplicação às telas não redesenhadas:** os demais passos dos wizards (5 de suplementação, 5 de forragem, 2 de aguada etc.) seguem exatamente os mesmos atoms. Use o `WizardHeader` com o `domain` correto (`'suplementacao' | 'forragem' | 'aguada' | 'sanidade' | 'cerca' | 'peso' | 'lavagem'`), `ChoiceCard` para perguntas de escolha, o padrão de número hero Lora para sliders/steppers, e `WizardFooter` fixo. As admin screens (`16-formulacoes`, `17-tipos-capim`) usam CRUD simples com `Input`/`Select`/`Textarea` e botão `PrimaryButton`.

## 4. Estrutura de arquivos

```
pecuaria_redesign/
├── index.html              ← canvas de revisão (todas as telas lado a lado)
├── ios-frame.jsx           ← bezel iOS (390×820) — não precisa no app real
├── atoms.jsx               ← TODOS os componentes reutilizáveis
├── screens_core.jsx        ← Login · Dashboard · Ronda · Menu avaliação
├── screens_wizards.jsx     ← Wizards (suplementação 3x, forragem, aguada, sanidade, cerca, peso)
├── screens_util.jsx        ← Mapa · Rebanho · Estoque · Lotação · Reabastecimento
├── mount.jsx               ← mount dos previews
└── public/
    ├── logo-nsa-cream-transparent.png
    ├── logo-nsa-green-transparent.png
    └── photo-pasture.jpg
```

## 5. Como portar para Next.js / React Native

### Web (Next.js)
1. Copie `colors_and_type.css` para `app/globals.css` (ou importe no root layout).
2. Importe Inter + Lora via `next/font/google` (weights 400/500/600/700 para Inter, 600/700 para Lora).
3. Instale `lucide-react` e use os ícones pelo nome.
4. Quebre os atoms em `components/ui/*` — os estilos inline do protótipo já estão prontos para virar Tailwind ou CSS Modules.
5. Mantenha os 3 assets da pasta `public/`.

### React Native / Expo
1. Traduza tokens para um `theme.ts` (StyleSheet usa os mesmos valores).
2. Substitua Lucide por `lucide-react-native` (mesma API).
3. `font-variant-numeric` não existe em RN — use a variante tabular da Inter (`Inter-TabularNums`) se precisar.
4. Headers verdes viram `SafeAreaView` com `backgroundColor: '#172514'` e `StatusBar` em `light-content`.

## 6. Checklist de validação

- [ ] **Manter o mapa atual do app** (Mapbox/Google/whatever já está em produção) — o mockup do `11-mapa` usa uma foto aérea apenas para ilustrar. Não substituir a integração real; só aplicar os overlays (polígonos de piquete coloridos por status + StatusPill de legenda + controles flutuantes) por cima do mapa existente.
- [ ] Todas as ocorrências de `#185FA5` / `#1a6b54` / variáveis antigas removidas de `styles.css`
- [ ] Todos os emojis do JSX substituídos por `<i data-lucide="...">` ou `<Icon/>` do lucide-react
- [ ] Todo número em coluna / KPI tem `font-variant-numeric: tabular-nums`
- [ ] Todo header de tela-âncora ou wizard usa `BrandHeader` / `WizardHeader` em verde
- [ ] Todo campo de status usa `StatusPill` (nunca círculo colorido inline)
- [ ] Botão primário usa `PrimaryButton` (verde + creme)
- [ ] Sync bar no dashboard usa `info` semântico, não azul arbitrário
- [ ] Mapa carrega foto real da fazenda como base (em vez do gradiente chapado)

## 7. Próximos passos sugeridos

1. **Portar os atoms** para a stack real (Next.js ou Expo) — é um dia de trabalho.
2. **Redesenhar os passos intermediários dos wizards** seguindo os padrões aqui (são variações triviais dos 8 passos de suplementação já entregues).
3. **Admin CRUD** (formulações + tipos de capim) — layout padrão de lista + modal.
4. **Fotos adicionais** da fazenda para o header do dashboard e para o mapa.
5. **Dark mode** opcional — uso é diurno mas valeria testar.
