# Log de Versões — Gestão Pecuária NSA

Histórico de versões nomeadas do projeto. Cada versão tem uma tag git correspondente (`git tag -l`) para permitir rollback rápido: `git checkout v0.X.0`.

Convenção: versionamento semântico `vMAJOR.MINOR.PATCH`. Cada nova versão inclui seção **Fallback** apontando a tag anterior recomendada para rollback.

---

## v0.3.0 — "App Expo + Refinamentos de Fluxo" (2026-04-14)

Primeira versão do app Expo/React Native funcional no navegador e mobile. Inclui as features de base (auth, ronda, rebanho, estoque, mapa, admin, reabastecimento) e um conjunto de refinamentos de UX aplicados após validação em campo/browser:

### App base
- Estrutura Expo SDK 54 com expo-router, SQLite offline-first, Zustand
- 5 abas principais: Painel, Ronda, Rebanho, Estoque, Mapa
- Wizards de avaliação por piquete (Suplementação, Forragem, Aguada, Sanidade, Cerca, Peso Visual, Lavagem)
- Admin: CRUD de formulações e tipos de capim
- Reabastecimento em 3 fases (carregar / rota / resumo)
- Seed: 3 usuários (admin/joao.peao/maria.peao, senha 123456), 3 tipos de capim, 5 formulações

### Refinamentos de UX (aplicados nesta versão)
- **Bombona separada da Suplementação:** novo item no Menu de Avaliação com fluxo próprio (estoque → formulação → sacos → foto). Suplementação reduzida de 8 para 6 passos.
- **Sanidade em %:** slider 0–100% em vez de contagem absoluta de animais afetados. Mostra estimativa de cabeças para contexto.
- **Cerca com ordem invertida:** primeira pergunta agora é "A cerca evita a mistura?" (função); segunda é voltagem (medida).
- **Lavagem simplificada:** fluxo reduzido de 4 para 2 passos. Se o peão responder "Não lavou", volta ao menu sem criar registro.
- **Barra de navegação inferior no Menu de Avaliação** — antes o peão só podia sair do fluxo com VOLTAR repetido. Agora acessa qualquer aba principal em 1 toque. (Wizards internos mantidos sem barra para proteger o preenchimento.)
- Nova tabela `bombona_evals`. Schema versão 2 com migração automática (drop/recreate das tabelas alteradas: supplement_evals, health_evals, washing_evals).

### Configuração
- `metro.config.js` com `.wasm` como asset (necessário para expo-sqlite rodar no web)
- Provider de DB com versionamento (`PRAGMA user_version`) para permitir migrações futuras sem perda de dados de seed

**Fallback:** `git checkout v0.2.0` — retorna ao estado apenas com protótipo HTML (app Expo ainda não existia).

---

## v0.2.0 — "Protótipo UX Ajustes" (2026-04-09)

Ajustes no protótipo HTML antes da implementação no Expo:

- Dashboard: removido card de lotação geral, adicionado botão VER LOTAÇÃO
- Nova tela `15-lotacao.html` com lotação geral e por piquete
- Aguada: 4 níveis de qualidade (excelente / boa / mediana / ruim) com descrições
- Aguada: removidos passos de lavagem (extraídos para wizard próprio)
- Novo wizard Lavagem de Bebedouro (`18-lavagem-1` a `18-lavagem-4`)
- Menu de avaliação com 8 cards (inclui Lavagem Bebedouro)

**Fallback:** `git checkout v0.1.0` — retorna ao protótipo HTML original.

---

## v0.1.0 — "Protótipo HTML" (2026-04-09)

- Protótipo HTML navegável (48 arquivos em `prototipo/`) para validação UX com peões
- Deploy via GitHub Pages (branch `gh-pages`)
- Base para a estrutura do app Expo/React Native

**Fallback:** nenhum (versão inicial).

---

## Como criar uma nova versão

1. Incrementar a versão seguindo `vMAJOR.MINOR.PATCH`:
   - `PATCH` — bug fix pontual
   - `MINOR` — nova feature ou refinamento de UX sem quebrar fluxo
   - `MAJOR` — mudança que obriga migração de dados ou re-treinamento do peão
2. Adicionar entrada no topo deste arquivo: nome, data (ISO), descrição
3. Incluir seção **Fallback** apontando a tag anterior recomendada
4. Após commit:
   ```bash
   git tag -a v0.X.0 -m "nome da versão"
   git push origin v0.X.0
   ```

## Como reverter

```bash
# Visualizar código de uma versão antiga (read-only)
git checkout v0.X.0

# Criar branch a partir dela para corrigir
git checkout -b hotfix/descricao v0.X.0

# Forçar branch atual para essa versão (DESTRUTIVO — perde trabalho não commitado)
git reset --hard v0.X.0
```

Em caso de rollback de schema de DB: a migração em `src/lib/db/provider.tsx` usa `PRAGMA user_version`. Ao voltar para versão com schema antigo, o app detecta a diferença e recria as tabelas. Dados de seed (usuários, formulações, tipos de capim, piquetes, rebanho) são preservados.
