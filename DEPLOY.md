# Deploy — Gestão Pecuária NSA

Passo a passo pra subir o app em produção (App Store + Google Play + backend Supabase).

---

## Fase 1 — Backend (Supabase)

### 1.1 Criar projeto no Supabase

1. Abra https://supabase.com/dashboard e clique **New project**
2. Preencha:
   - **Name**: `nsa-pecuaria` (ou outro)
   - **Database password**: gere uma senha forte e **guarde em lugar seguro** (gerenciador de senhas)
   - **Region**: **South America (São Paulo)** — latência menor
3. Clique **Create new project**. Espera ~2 min a instância subir.

### 1.2 Rodar o schema

1. No painel do projeto, menu lateral → **SQL Editor**
2. Clique **+ New query**
3. Abra `app/supabase/schema.sql` no VSCode, copie **tudo**, cole no editor
4. Clique **Run** (canto inferior direito, ou `Ctrl+Enter`)
5. Deve aparecer "Success. No rows returned." na parte de baixo
6. Confere no menu **Table Editor** que apareceram: `profiles`, `paddocks`, `herd`, `formulas`, `grass_types`, `inventory`, `inventory_events`, etc

### 1.3 Rodar o seed

1. Mesma tela (SQL Editor) → **+ New query**
2. Abre `app/supabase/seed.sql`, copia tudo, cola, **Run**
3. Deve inserir 125 paddocks, 5 formulas, 59 alocações de gado etc. Esperado ~500 linhas rodando; todas com `on conflict do nothing` (rodar 2x é seguro)

### 1.4 Criar usuários

No painel → **Authentication** → **Users** → **Add user** → **Create new user** (3 vezes):

| Email | Senha | User Metadata (JSON) |
|---|---|---|
| `admin@nsa.local` | forte (guarde!) | `{"username":"admin","name":"Administrador","role":"admin"}` |
| `joao@nsa.local` | forte | `{"username":"joao.peao","name":"João Peão","role":"peao"}` |
| `maria@nsa.local` | forte | `{"username":"maria.peao","name":"Maria Peão","role":"peao"}` |

Pode usar seus emails reais (ex: `admin@fazenda-nsa.com.br`) se tem domínio próprio — no MVP não precisa ter email funcional, só precisa ser único.

**Anota esses emails + senhas num lugar seguro** — vai precisar pra distribuir aos peões.

### 1.5 Pegar as credenciais do projeto

Painel → **Settings** (engrenagem) → **API**:
- **Project URL** (ex: `https://abcdefgh.supabase.co`)
- **anon** key (pública — pode ir no código do app)

Me manda esses dois valores. **Não** me passa a `service_role` key (essa não vai no app, ela ignora RLS).

---

## Fase 2 — Apps nas lojas

### 2.1 Conta Google Play Developer

1. https://play.google.com/console/signup
2. Login com conta Google (idealmente uma conta "fazenda-nsa@...")
3. Aceita termos, paga **US$25 (uma vez)** com cartão de crédito
4. Preenche perfil de desenvolvedor (pode ser pessoa física — D-U-N-S não é obrigatório)
5. Em 1–2 dias Google valida a conta

### 2.2 Conta Apple Developer

1. https://developer.apple.com/programs/enroll
2. Login com Apple ID (idealmente dedicado pra fazenda, mas pessoal serve)
3. Escolhe **Individual / Sole Proprietor** (mais simples que Organization, que exige D-U-N-S)
4. Paga **US$99/ano**
5. Apple valida em 1–2 dias (às vezes pede documento de identidade)

### 2.3 Conta Expo

1. https://expo.dev/signup — grátis
2. Login local no terminal:
   ```bash
   cd app
   npx eas login
   ```

---

## Fase 3 — Build e submit

(Faz depois que eu tiver wirado o supabase no app — guio você linha a linha.)

Preview (teste rápido Android):
```bash
cd app
npx eas build --profile preview --platform android
```

Produção:
```bash
npx eas build --profile production --platform all
# espera ~20min pra cada plataforma, builds rodam em paralelo na cloud
npx eas submit --profile production --platform all
# envia AAB pro Google Play Closed Testing, IPA pro TestFlight
```

### 3.1 Google Play — Closed Testing

1. Play Console → seu app → **Testing** → **Closed testing** → **Create track**
2. Nome: `peoes-fazenda`
3. **Testers** → adiciona emails dos peões (emails Gmail; eles precisam login Google no celular)
4. Publica → peão recebe email com link → instala pela Play Store normalmente

### 3.2 Apple — TestFlight

1. App Store Connect → seu app → **TestFlight** → **External Testing** → **+ Create new group**
2. Nome: `peoes`
3. Adiciona emails → peão recebe email com link → baixa app **TestFlight** na App Store → clica no link → instala seu app

**Primeira build do TestFlight passa por review da Apple (~24h)**. Próximas builds externas a cada 90 dias precisam nova review, mas pra testers internos é imediato.

---

## Custos e renovação

| Item | Custo | Renovação |
|---|---|---|
| Supabase Free | R$0 | Nunca (até 500 MB / 50k MAU) |
| EAS Build Free | R$0 | Nunca (30 builds/mês) |
| Google Play Developer | ~R$125 único | Nunca |
| Apple Developer | ~R$500/ano | Anual (se deixar vencer, app some das lojas) |

**Ano 1**: ~R$625  
**Ano 2+**: ~R$500/ano (só Apple, se mantiver iOS)

---

## Quando rodar de novo

**Novo deploy após mudanças de código**:
```bash
cd app
npx eas build --profile production --platform all
npx eas submit --profile production --platform all
```

**Só JS mudou (não native)** → OTA update, sem rebuild nem review:
```bash
npx eas update --branch production
```
Peão pega a atualização da próxima vez que abrir o app online.

**Mudança de schema DB** (migration):
1. Edita `app/supabase/schema.sql` com a migration (ALTER TABLE etc)
2. Roda no SQL Editor do Supabase
3. Atualiza `app/src/lib/db/schema.ts` (SQLite local) + `SCHEMA_VERSION` + migration block em `provider.tsx`
4. Deploy de JS normal via `eas update`
