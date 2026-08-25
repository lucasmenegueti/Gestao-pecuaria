# Briefing — Cronograma de atividades (gestão-pecuária)

> Board de **tarefas × dias** no formato do cronograma do `gestao-agricultura`
> (`app/src/app/(tabs)/cronograma.tsx`), mas com o eixo trocado: na agricultura a
> linha é o **talhão**; aqui a linha é a **tarefa**, agrupada sob uma
> **macro-atividade** (projeto). Nada é ligado a piquete.
>
> **Estado: no ar.** Migration em QA e produção, OTA de produção publicado
> (runtime 1.0.1, update group `7b0b4f75-34aa-4ec5-a863-16a58b6d69e2`) e web em
> https://nsa-gestao-pecuaria.netlify.app. Tela validada em iPhone; falta fechar o
> round-trip de sync, travado por um bug de sessão anterior à feature — ver §8.

---

## 1. O modelo

Duas entidades, sem vínculo com `paddocks`:

- **Projeto** = macro-atividade. Ex.: *"Montar ILP no T33"*, *"Estação de cria 26-7"*.
  Tem nome, cor (herdada pelas barras das tarefas), **local em texto livre**
  (`"T33"`, `"Sede"`, ou nada) e status (ativo/concluído/cancelado).
- **Tarefa** = um passo do projeto, com período. Ex.: *comprar vergalhões*,
  *fazer projeto*, *colocar encanamento*, *comprar sêmen*, *marcar com veterinário*,
  *inseminar*.

O `location` é texto livre **de propósito**: o lugar pode ser um talhão da
agricultura, a sede, um piquete ou nada — não faria sentido uma FK pra `paddocks`.

### Layout do board

```
▾ MONTAR ILP NO T33   3/5        set        out        nov
   Fazer projeto              ███
   Comprar vergalhões           █████
   Comprar fios                 ████
   Colocar vergalhões               ██████
   Colocar encanamento                 ████
▸ ESTAÇÃO DE CRIA 26-7 0/3      ▬▬▬▬▬▬▬▬▬▬▬▬▬   (colapsado: barra-resumo)
```

- **1 linha por tarefa** — o nome fica na coluna esquerda, legível, em vez de
  espremido numa barra de 26px por dia.
- **Cabeçalho do projeto** mostra `feitas/total` + local, colapsa no toque e
  desenha uma barra-resumo fina do primeiro início ao último fim.
- **Ordem das tarefas é cronológica** (`start_date`, depois `order_index`).
  Numa lista de passos a ordem natural já é a data — isso dispensou o
  drag-para-reordenar da agricultura (e o vetor de bug que vem junto).

### Interações

| Gesto | Efeito |
|---|---|
| Arrastar na **linha do projeto** | cria tarefa nova com o período arrastado |
| Arrastar a **barra** | move o período (grava direto, sem abrir editor) |
| Arrastar a **borda** da barra | redimensiona |
| Tocar a barra ou o nome | abre o editor da tarefa |
| Tocar o cabeçalho | colapsa/expande o projeto |
| Lápis no cabeçalho | edita o projeto |
| Botão "Projeto" | cria macro-atividade |

No touch, criar e mover exigem **long-press de 220 ms** — arraste solto rola o
board. No mouse (web) o arraste é direto.

---

## 2. Colocação — aba nova, admin-only

Aba **Crono** (`(tabs)/cronograma.tsx`), escondida com `href: null` pra não-admin,
como `Rebanho` e `Relatório` já fazem. Peão continua com 4 abas; admin vai a 7.

O board é a tela que mais ganha com **mouse e tela grande** — há caminhos
exclusivos de web (arraste direto, sem long-press). O `expo export --platform web`
já compila hoje; publicar a web é decisão separada.

> **Exceção consciente às UX Principles.** Alvos de 26px, texto de 10px na barra,
> várias decisões por tela — tudo o que o `CLAUDE.md` proíbe. As regras de
> 56px/18px existem pro **peão com luva no trator**; esta tela é do admin, no
> escritório, e é o mesmo desvio já aceito na agricultura.

---

## 3. Schema (implementado)

Quatro adaptações obrigatórias em relação ao código de origem, cada uma
verificada contra `src/lib/sync/engine.ts` **deste** repo:

1. **Sem `client_id`** — o bloco `SYNC` da pecuária não tem essa coluna (a
   agricultura tem). Referência estável entre devices aqui é `supabase_id`.
2. **`author_id`, não `created_by`** — `created_by` está em `REMOTE_ONLY_COLS`
   (`engine.ts:41`): sobe no push, mas é **descartada no pull**. Quem criou
   apareceria só no aparelho de origem.
3. **Nenhuma coluna JSON** — o engine da pecuária não tem `JSON_COLS` (só
   `geometry` é especial-caseado). Responsável virou `assignee TEXT` livre, então
   **zero mudança no engine**.
4. **`order_index` como coluna**, não JSON em `app_settings` — a agricultura
   guarda a ordem dos talhões num `app_settings` porque a tabela `talhoes` é
   antiga. Aqui as tabelas são novas e podem carregar a coluna.

```sql
CREATE TABLE schedule_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,                                  -- hex #RRGGBB herdado pelas barras
  location TEXT,                               -- texto livre: "T33", "Sede", "P47"
  status TEXT NOT NULL DEFAULT 'ativo',        -- ativo | concluido | cancelado
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  author_id TEXT, <SYNC>
);

CREATE TABLE schedule_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,                    -- ISO yyyy-mm-dd
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejado',    -- planejado | em_andamento | feito | cancelado
  assignee TEXT,                               -- quem executa (texto livre)
  order_index INTEGER NOT NULL DEFAULT 0,      -- desempate quando 2 começam no mesmo dia
  include_saturday INTEGER NOT NULL DEFAULT 1,
  include_sunday INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  author_id TEXT, <SYNC>,
  FOREIGN KEY (project_id) REFERENCES schedule_projects(id)
);
```

Receita de sync cumprida: as duas entraram em **`SYNCED_TABLES`** (projects antes
de tasks, por causa da FK) **e em `MUTABLE_TABLES`** — as duas são
`appendOnly:false`, e editar uma barra é exatamente um UPDATE. Sem isso, o
UPDATE local nunca marca `pending_sync`, nunca sobe, e o pull seguinte
sobrescreve. `SCHEMA_VERSION` foi de 23 → **24** (tabelas novas, nada a dropar —
`CREATE_TABLES_SQL` roda sempre com `IF NOT EXISTS`).

**Remoto:** migration `cronograma_schedule_projects_tasks` aplicada na branch
**QA** (`zmetxajiimsclhuhaykv`). Espelha `inspection_requests`: PK uuid,
`client_id`/`created_by`/`created_at`/`updated_at`/`deleted_at`, trigger
`tg_set_updated_at` (o `updated_at` é o cursor do delta — sem o trigger, edição
no servidor nunca desce) e RLS no padrão de `app_settings`: leitura autenticada,
escrita `is_admin()`.

---

## 4. O que foi verificado

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `CREATE_TABLES_SQL` num SQLite real | tabelas + triggers `tg_schedule_*_mark_dirty` criados |
| Trigger dirty (UPDATE do usuário) | `pending_sync` vai a 1 nas duas tabelas |
| PostgREST no QA | `schedule_projects` e `schedule_tasks` respondem 200 |
| Bundle web (`expo export`) | compila |
| Tela em device (iPhone, Expo Go) | renderiza; criar projeto e tarefa funciona |
| Booleans (`include_saturday/sunday`) | INTEGER local ↔ boolean remoto: caminho já exercitado em produção por `rondas.completed` e `supplement_evals.restocked` |

**Não verificado:** o round-trip de sync (bloqueado pelo bug de sessão — §8).

---

## 5. Seed do QA

Os dois exemplos reais estão gravados no QA pra reconhecer na tela:

- **Montar ILP no T33** (`#8a6515`, local "T33") — fazer projeto · comprar
  vergalhões · comprar fios · colocar vergalhões · colocar encanamento
- **Estação de cria 26-7** (`#2b6a93`) — comprar sêmen · marcar com veterinário ·
  inseminar

Datas em set–nov/2026, com os dois primeiros passos já marcados como feitos pra
os KPIs e a barra-resumo terem o que mostrar.

---

## 6. Fora de escopo (v1)

- **Dependências entre tarefas** ("colocar vergalhões só depois de comprar") —
  hoje a sequência é implícita pelas datas.
- **Reordenar projetos** por arraste — `order_index` já existe e é gravado; falta
  só a UI.
- Catálogo de responsáveis (hoje `assignee` é texto livre) e de maquinário.
- Custo/compras por tarefa — várias tarefas são compras ("comprar sêmen"),
  então um campo de valor pode fazer sentido. **Não foi pedido; não inventado.**
- Vínculo tarefa ↔ ronda/`inspection_requests`.
- Cronograma no dashboard web (`gestao-pecuaria-dashboard`).

---

## 7. Riscos

| Risco | Situação |
|---|---|
| Esquecer `MUTABLE_TABLES` | resolvido e testado (§4) |
| `deleted_at` está em `REMOTE_ONLY_COLS` | exclusão **sobe** no push, mas o pull não traz exclusão feita em outro device; e um repull forçado (`last_pull_at = NULL`) ressuscita o que foi excluído. Comportamento **pré-existente das 24 tabelas** — não corrigir aqui. Toda query do board filtra `deleted_at IS NULL`. |
| Gestos no touch | os invariantes do PanResponder (vc7–vc9 da agricultura) foram portados **verbatim**: `onMoveShouldSetPanResponder: false` no container, `onPanResponderTerminationRequest: () => false` na barra, `onShouldBlockNativeResponder: () => false`, `scrollLock`, tap de 12px no touch / 5px no mouse. **Não "limpar".** |
| Board longo com muitos projetos | colapsar + filtro Ativos/Todos + modo Lista |
| Peão chegando na rota por URL/deep link | `href: null` só esconde a aba — a tela tem guarda `isAdmin` em toda ação de escrita. Sem ela, o INSERT passaria local e o RLS rejeitaria no push, deixando a row presa em `pending_sync`. |

---

## 8. O que ainda falta

1. **Fechar o round-trip de sync.** A tela já foi exercitada em iPhone (renderiza,
   cria projeto e tarefa). O que não fechou foi o sync, travado num problema
   **anterior a esta feature**: o app falando com o Supabase como **anônimo** — pull zerado nas 26
   tabelas e push barrado por RLS. Causa provável: `authStore` fora de
   `offlineMode` mas sem sessão no supabase-js, estado que
   `hydrateSessionIfNeeded` (`daemon.ts:53`) não recupera, porque só re-autentica
   quando `offlineMode === true`. Logout + login online contorna. **Vale investigar
   à parte** — afeta o app inteiro, não o cronograma.
2. **Tag git** `v0.9.0` (o CHANGELOG já tem a entrada) e commit das mudanças.
3. Conferir no site publicado (login admin) que projetos e tarefas sobem pro
   Supabase de produção — é o caminho mais rápido de validar, já que o board é
   feito pra mouse.

## 9. Armadilha de build (custou um deploy errado)

`expo export` **ignora** o `--environment production` do EAS e carrega o `.env`
local — o primeiro build da web saiu apontando pro **QA**. Buildar com
`EXPO_NO_DOTENV=1` e **conferir o bundle** antes de publicar:

```bash
EXPO_NO_DOTENV=1 npx eas-cli env:exec production \
  "npx expo export --platform web --output-dir dist --clear" --non-interactive
grep -c "nsa-supa.lucas-cf1.workers.dev" dist/_expo/static/js/web/entry-*.js  # 1
grep -c "zmetxajiimsclhuhaykv" dist/_expo/static/js/web/entry-*.js            # 0
```

O `--clear` também é obrigatório: sem ele o Metro reusa o módulo já compilado com
a env anterior. O `eas update` **não** tem esse problema — verificado publicando
duas vezes, com e sem `.env` presente, e comparando o hash do launchAsset
(idêntico).
