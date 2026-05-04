# Play Store — metadados pra primeira publicação

App: **Gestão Pecuária NSA** (`com.nsa.gestaopecuaria`)
Versão: 1.1.0
Privacy URL: `https://lucasmenegueti.github.io/Gestao-pecuaria/prototipo/privacy-policy.html`

## Distribuição

- **Modo:** Acesso restrito (privado).
- **Tipo:** Internal testing → Closed testing (lista fechada de testers via e-mail).
- **Recomendação:** começar em **Internal testing** (até 100 testers, sem revisão da Google, vai ao ar em ~minutos). Depois Closed testing → Production.

## Categorização

- **Categoria do app:** Ferramentas (Tools) — *ou* Empresarial (Business). Tools tem alcance maior; Business é mais coerente.
- **Tags:** "agronegócio", "fazenda", "pecuária", "gestão de gado".
- **Classificação etária:** PEGI 3 / Livre — sem violência, sem conteúdo adulto.
- **Política de conteúdo:** Sem ads, sem compras in-app, sem anúncios de terceiros.

## Detalhes do app

### Nome
```
Gestão Pecuária NSA
```

### Descrição curta (máx 80 caracteres)
```
Gestão diária de pasto e gado da Fazenda Nossa Senhora Aparecida.
```

### Descrição completa (máx 4000 caracteres)
```
Gestão Pecuária NSA é o aplicativo interno da Fazenda Nossa Senhora Aparecida, em Chapada Gaúcha / Januária – MG, para o controle diário de piquetes, gado e estoque de ração.

⚠ Aplicativo de uso restrito. Apenas colaboradores autorizados pela administração da fazenda têm acesso.

CARACTERÍSTICAS

• Ronda de piquete completa: 9 tipos de avaliação (suplementação, bombona, forragem, aguada, biológico, sanidade, cerca, peso visual, lavagem). Tudo em wizard com botões grandes, pensado para uso em trator ou a cavalo.

• Mapa offline: todos os ~125 piquetes da fazenda mapeados, funciona sem internet a partir do primeiro download.

• Estoque de ração: controle de estoque central + bombonas dos piquetes, com fluxo de reabastecimento em 3 fases (carregar no trator → distribuir nas bombonas → fechar a rota com a sobra).

• Rebanho: cadastro por categoria etária (BEZERRO, GARROTE, NOVILHA, VACA, etc.), movimentação entre piquetes, eventos de nascimento, morte, venda e evolução de categoria.

• Solicitações sob demanda: o administrador delega quais piquetes precisam de inspeção detalhada; o peão vê tudo destacado no painel.

• Alertas inteligentes: cocho próximo de zerar, gado desalocado, voltagem de cerca fraca, sanidade crítica.

• Sincronização offline-first: tudo funciona sem internet; sincroniza automaticamente quando a rede aparece.

• Português brasileiro do início ao fim, sem emojis, com letras grandes para uso em ambiente externo.

PERMISSÕES SOLICITADAS

• Câmera: anexar fotos opcionais às avaliações.
• Localização: usar o mapa offline da fazenda. Não rastreamos a localização em segundo plano.
• Microfone: reservado para uso futuro (anotações por voz). Não é usado atualmente.
• Internet: sincronizar com o servidor da fazenda quando houver rede.

PRIVACIDADE

Não coletamos dados para fins comerciais, não vendemos informações, não usamos analytics de terceiros nem anúncios. Política completa: https://lucasmenegueti.github.io/Gestao-pecuaria/prototipo/privacy-policy.html

SUPORTE

Em caso de dúvida ou problema, fale com a administração da fazenda ou envie e-mail para lucas.rossi.lr@gmail.com.
```

### E-mail de contato
```
lucas.rossi.lr@gmail.com
```

### Política de privacidade (URL)
```
https://lucasmenegueti.github.io/Gestao-pecuaria/prototipo/privacy-policy.html
```

### Website (opcional, mas recomendado)
```
https://lucasmenegueti.github.io/Gestao-pecuaria/
```

## Assets gráficos exigidos

| Item | Tamanho | Onde está |
|---|---|---|
| Ícone (high-res) | 512×512 PNG transparente | `app/assets/icon.png` (verificar tamanho — se for menor, redimensionar) |
| Feature graphic | 1024×500 PNG/JPG | **a criar** — pode ser captura do banner do Painel + logo, ou texto "Gestão Pecuária NSA" sobre fundo verde NSA |
| Screenshots celular | mín 2, máx 8 — entre 320–3840 px | **a capturar** via ADB no S9: Painel, Ronda lista, Menu de avaliação, Estoque, Mapa |
| Screenshots tablet 7" | opcional | **a capturar** se quiser destacar uso em Tab |
| Screenshots tablet 10" | opcional | idem |

## Conteúdo & cumprimento

### Data Safety form (obrigatório no Play Console)

Marcar:
- ✅ App **coleta** dados pessoais (e-mail, nome, dados operacionais).
- ✅ Dados são **criptografados em trânsito** (HTTPS Supabase + Cloudflare).
- ✅ Você **pode solicitar exclusão** dos dados (LGPD via e-mail).
- ❌ App **não compartilha** dados com terceiros.
- Tipos coletados:
  - **Identificadores pessoais**: nome, e-mail (gerenciamento de conta).
  - **Localização**: aproximada e precisa, **apenas em foreground**, opcional, para o mapa.
  - **Fotos e vídeos**: opcional, anexo de avaliações.
  - **Atividade do app**: logs internos.
  - **Diagnósticos**: crash logs.
- Finalidades: gerenciamento de conta, funcionalidade do app.

### Target audience

- **Idade-alvo:** 18+ (uso profissional adulto).
- ❌ Não é direcionado a crianças.

### Ads

- ❌ App **não contém anúncios**.

### News app

- ❌ Não.

### COVID-19 / saúde / governo

- ❌ Não.

## Submit (após build production estar pronto)

```bash
cd app
eas submit --profile production --platform android --latest
```

Esse comando puxa a `.aab` mais recente do EAS e envia pra Play Console na track `internal` (configurada no `eas.json`). Depois disso, é manual no Play Console: preencher o restante dos campos (descrição, screenshots, content rating questionnaire), adicionar testers, e promover internal → closed → production.
