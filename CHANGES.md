# Log de Mudanças (Dev Log)

Registro granular de cada alteração feita pelo Claude durante o desenvolvimento. Diferente do `CHANGELOG.md` (que agrupa em versões `v0.X.0`), este arquivo tem uma entrada por tarefa/fix — mais útil para acompanhar o trabalho em andamento entre commits.

Formato: cada entrada começa com data ISO + título curto. Use como diário cronológico (mais recente no topo).

---

## 2026-04-15 — Mapa interativo com KML (v0.5.0)

Aba Mapa reescrita: antes era grade colorida de cards, agora é mapa real + lista abaixo.

**Stack**: `react-native-maps` nativo (iOS/Android com Apple Maps `mapType="hybrid"`) + `react-leaflet` no web (Esri World Imagery + labels). Metro resolve `.native.tsx` vs `.web.tsx` automaticamente, compartilhando `types.ts`.

**Dados** (fonte: `kml/Area aberta NSA - com pontos caixa.kml` com 43 placemarks):
- Script one-shot `app/scripts/kml-to-seed.mjs` parseia o KML e emite `app/src/lib/db/seed-map.ts` com:
  - 37 piquetes (nome, área em ha via projeção equiretangular + shoelace, centróide, geometria GeoJSON)
  - 4 caixas d'água (pontos)
  - 1 limite da fazenda (polígono NSA2)
- Schema v3→**v4**: `paddocks` ganha `center_lat`, `center_lng`, `geometry TEXT` (GeoJSON). Tabelas novas: `water_tanks`, `farm_boundaries`.
- Migração dropa `paddocks` + deps FK (herd, herd_events, rondas) e re-semeia a partir do KML. **Rondas/herd anteriores são perdidas** (dev only).
- `seed.ts`: removidos INSERTs hardcoded de paddocks — KML agora é única fonte.

**UI** (`app/src/app/(tabs)/mapa.tsx`):
- Mapa ocupa 60% da tela, lista scrollável ocupa 40%.
- Tap em polígono OU em linha da lista → seleciona (destaque laranja + fly-to no mapa).
- Barra inferior do pasto selecionado com botão "ABRIR" → vai direto pro menu de ronda.
- Edição dos polígonos fica pra próxima versão (só admin terá).

**Pacotes novos**: `leaflet`, `react-leaflet`, `@types/leaflet`. `react-native-maps` já existia.

Arquivos tocados:
- `app/scripts/kml-to-seed.mjs` (novo)
- `app/src/lib/db/seed-map.ts` (gerado)
- `app/src/lib/db/schema.ts`
- `app/src/lib/db/provider.tsx`
- `app/src/lib/db/seed.ts`
- `app/src/components/map/{types,FarmMap,FarmMap.native,FarmMap.web,index}.ts(x)` (novo)
- `app/src/app/(tabs)/mapa.tsx` (reescrita)

---

## 2026-04-15 — Fix SQL: `date("now")` → `date('now')`

Log do console revelou a causa real do "CONFIRMAR não faz nada":

```
Error code 1: no such column: "now" - should this be a string literal in single-quotes?
```

SQLite interpreta `"now"` (aspas duplas) como **identificador** (nome de coluna), não string. Precisa ser `'now'`. Quatro arquivos tinham o bug: `desalocar.tsx`, `alocar.tsx`, `evento.tsx`, `mover-rebanho.tsx`. Corrigidos escapando a aspa simples dentro do JS string (`date(\'now\')`).

Por que passou despercebido: o `handleConfirm` entrava no `catch`, o Alert.alert "Erro" aparecia, mas no web o window.alert pode ser fechado rápido / bloqueado pelo navegador — usuário só via "não fez nada". Os logs adicionados ontem finalmente expuseram a mensagem.

---

## 2026-04-14 — Fix CONFIRMAR desalocação "não faz nada"

Lucas reportou: pasto 14, desalocar 15 VACAs, CONFIRMAR aparentemente não fazia nada.

Mudanças em `desalocar.tsx`:
- **Estado `submitting`**: botão CONFIRMAR vira "PROCESSANDO..." e desabilita enquanto roda — feedback visual que antes não existia.
- **`router.replace('/(tabs)/rebanho')`** (em vez de `/rebanho`). Em expo-router 6, em alguns casos a forma com o grupo explícito resolve melhor quando a navegação parte de uma rota fora do grupo. Mesma correção em `alocar.tsx`.
- **Logs `[desalocar]`**: `console.log` no início, no sucesso, no erro e na validação insuficiente — facilita diagnóstico quando o usuário reportar "não fez nada".
- Reset de `reviewing=false` antes da navegação (caso a navegação demore, não fica travado na tela de review).

Arquivos tocados:
- `app/src/app/admin/desalocar.tsx`
- `app/src/app/admin/alocar.tsx`

---

## 2026-04-14 — Fix navegação pós-confirmar + impede head_count negativo

Lucas reportou 2 bugs depois do fix anterior:

1. **Confirmar desalocação não navegava de volta**. Causa: `router.replace('/(tabs)/rebanho')` — em expo-router 6 o grupo `(tabs)` não aparece no path público. Corrigido para `router.replace('/rebanho')` em `desalocar.tsx` e `alocar.tsx`.
2. **Piquetes com head_count negativo**. Causa: `UPDATE herd SET head_count = head_count - ?` sem guarda inferior. Mesmo que o slider limitasse, dados stale ou estado inconsistente podiam permitir decremento além do disponível. Correções:
   - `desalocar.tsx`: validação prévia ler `head_count` atual de cada categoria antes de mutar; se `qty > available`, aborta com Alert antes de qualquer escrita.
   - Todas as UPDATEs de decremento (desalocar, alocar, mover-rebanho) passaram a usar `MAX(0, head_count - ?)` como cinto de segurança.
   - `provider.tsx`: cleanup idempotente `DELETE FROM herd WHERE head_count <= 0` roda a cada boot (limpa lixo dos testes anteriores).
   - Mensagem de erro no Alert agora expõe `err.message` em vez do genérico, pra facilitar diagnóstico futuro.

Arquivos tocados:
- `app/src/app/admin/desalocar.tsx`
- `app/src/app/admin/alocar.tsx`
- `app/src/app/admin/mover-rebanho.tsx`
- `app/src/lib/db/provider.tsx`

---

## 2026-04-14 — Fix UX do fluxo de desalocação

Após Lucas testar no navegador, três correções:

1. **BottomNav duplicada removida** em `app/src/app/(tabs)/rebanho.tsx`. O layout `(tabs)` já fornece a barra via expo-router; o componente `<BottomNav />` que eu adicionei antes estava sendo renderizado por cima, duplicando.
2. **Tela de confirmação** adicionada ao fluxo `admin/desalocar.tsx`. Antes: clicava em "CONFIRMAR DESALOCAÇÃO" e já executava. Agora: botão "REVISAR E CONFIRMAR" → tela de revisão mostrando piquete de origem, categorias + qtds selecionadas e total, com botões "CONFIRMAR" e "VOLTAR E AJUSTAR". Só o "CONFIRMAR" executa o INSERT/UPDATE e redireciona para `/rebanho`.
3. **Remoção do Alert de sucesso** em `desalocar.tsx` e `alocar.tsx`. Após confirmar, vai direto para Rebanho sem popup "OK" extra (o feedback visual é a tela atualizada).
4. **Criação deste arquivo `CHANGES.md`** como dev log contínuo.

Arquivos tocados:
- `app/src/app/(tabs)/rebanho.tsx` — remove import e uso de `BottomNav`
- `app/src/app/admin/desalocar.tsx` — novo estado `reviewing`, tela de revisão, navega direto após confirmar
- `app/src/app/admin/alocar.tsx` — remove Alert de sucesso

---

## 2026-04-14 — Redesign do menu Rebanho (pool + desalocação)

Versão **v0.4.0**. Ver `CHANGELOG.md` para descrição completa. Resumo das mudanças:

- Schema: `herd.paddock_id` e `herd_events.paddock_id` nullable. `SCHEMA_VERSION` 2→3.
- Nova tela Rebanho com card de totais por categoria, pool DESALOCADOS e lista por piquete (com badge "LOTE DE PARES").
- Novos fluxos `admin/desalocar.tsx` e `admin/alocar.tsx`.
- Evento ajustado: nascimento com VACA sugere BEZERRO/A MAMANDO; morte filtra categorias presentes.
- `mover-rebanho.tsx` exclui pool da origem.

Arquivos tocados:
- `app/src/lib/db/schema.ts`
- `app/src/lib/db/seed.ts` (novo export `SEED_HERD_SQL`)
- `app/src/lib/db/provider.tsx` (bump SCHEMA_VERSION + re-seed herd no path de migração)
- `app/src/types/index.ts` (`HerdEntry.paddock_id` nullable, novos event_types)
- `app/src/app/(tabs)/rebanho.tsx` (reescrita)
- `app/src/app/admin/desalocar.tsx` (novo)
- `app/src/app/admin/alocar.tsx` (novo)
- `app/src/app/admin/evento.tsx` (sugestão auto de categoria)
- `app/src/app/admin/mover-rebanho.tsx` (split fromPaddocks/toPaddocks)
- `CHANGELOG.md` (entrada v0.4.0)
