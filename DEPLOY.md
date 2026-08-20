# Deploy — primeira subida para produção

Repositório: `https://github.com/Pedroadsdurso/fechaobra.git`
Domínio: o da Vercel por enquanto (`fechaobra.vercel.app` ou o que a Vercel atribuir).

---

## 1. O push está bloqueado — precisa de você

O remote já está configurado e os quatro commits estão prontos:

```
457de90  Corrige urlBase quebrando no navegador em produção
f06cd90  Fase 3: link público e aceite
0efc222  Fase 2: o editor
2f2f90a  Fase 0 e Fase 1: fundação e motor do documento PDF
```

O push falhou assim:

```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

Não há credencial do GitHub no keychain e o `gh` não está instalado. Como combinado,
não mexi em credencial. **Escolha uma das três** e rode você mesmo (no chat, prefixando
com `!` para a saída aparecer aqui):

### Opção A — `gh` (mais simples, resolve para sempre)

```
! brew install gh
! gh auth login
```
No `gh auth login`: GitHub.com → HTTPS → Yes (autenticar o Git) → Login with a web browser.
Depois:
```
! git push -u origin main
```

### Opção B — Personal Access Token

1. https://github.com/settings/tokens → *Generate new token (classic)*
2. Escopo: só **`repo`**. Validade: o que preferir.
3. Copie o token (só aparece uma vez).
4. `! git push -u origin main`
   Usuário: `Pedroadsdurso` · Senha: **cole o token** (não a sua senha do GitHub).
   O `osxkeychain` já está ativo — ele guarda e você não digita de novo.

### Opção C — SSH (se você já tem chave no GitHub)

```
! git remote set-url origin git@github.com:Pedroadsdurso/fechaobra.git
! git push -u origin main
```

---

## 2. A ordem do primeiro deploy

**Sua pergunta:** o fallback para `VERCEL_PROJECT_PRODUCTION_URL` resolve o primeiro
deploy, ou é deploy → pegar URL → definir variável → redeploy?

**Resposta: resolve.** Verifiquei simulando o primeiro deploy (build com
`NEXT_PUBLIC_URL_BASE` ausente e só `VERCEL_PROJECT_PRODUCTION_URL` definida):

- a trava do `next.config.ts` **não dispara** — ela enxerga as variáveis da Vercel;
- o build compila;
- a URL resolvida no servidor é `https://fechaobra.vercel.app`, e é essa que vai para o link.

**Mas o fallback escondia um defeito, que corrigi antes de te entregar isto.**

O `DialogoEnvio` — a tela onde o prestador copia o link e manda no WhatsApp — é Client
Component e chamava `urlBase()` direto. O Next injeta no bundle do navegador **apenas**
variáveis com prefixo `NEXT_PUBLIC_`. `VERCEL_PROJECT_PRODUCTION_URL` e `VERCEL_URL` não
têm esse prefixo: no navegador elas são `undefined`.

Resultado antes da correção: **o build passava e o diálogo quebrava no navegador**, com
erro, exatamente no primeiro envio de orçamento. Achei inspecionando o bundle gerado —
não teria aparecido em nenhum teste local, porque em desenvolvimento a função cai em
`localhost`.

A URL agora é resolvida no servidor e entregue por prop. `lib/url-base.ts` levou um aviso
em caixa alta de que só pode ser chamada no servidor.

**Ordem recomendada mesmo assim:**

1. Suba o repositório e conecte na Vercel **já com as variáveis do Supabase** definidas
   (a `NEXT_PUBLIC_URL_BASE` pode ficar de fora nesta primeira vez).
2. Deploy. Anote a URL de produção que a Vercel atribuir.
3. Defina `NEXT_PUBLIC_URL_BASE` com essa URL e **redeploy**.

O passo 3 não é para consertar o passo 2 — é para tirar a dependência de uma variável da
Vercel numa coisa que vai impressa em PDF e mandada por WhatsApp. Quando você plugar um
domínio próprio, essa é a única variável que muda.

---

## 3. Variáveis de ambiente na Vercel

*Vercel → seu projeto → Settings → Environment Variables*

| Nome exato | De onde tirar o valor | Ambientes | Exposição |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → Data API** → campo **Project URL** (`https://xxxx.supabase.co`) | Production, Preview, Development | **Pública** — vai para o navegador. É só o endereço. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API Keys** → chave **`anon` / `publishable`** | Production, Preview, Development | **Pública** — segura por design: o RLS limita tudo o que ela alcança. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API Keys** → **`service_role` / `secret`** (clique em *Reveal*) | Production, Preview, Development | **SECRETA — NUNCA `NEXT_PUBLIC_`** |
| `NEXT_PUBLIC_URL_BASE` | A URL de produção da Vercel, **depois** do primeiro deploy (ex.: `https://fechaobra.vercel.app`). Sem barra no fim. | **Production** (deixe fora de Preview: lá o fallback `VERCEL_URL` aponta para o deploy certo) | **Pública** — precisa ser. É o link do cliente. |
| `SUPABASE_PROJECT_ID` | O subdomínio da Project URL (ex.: `abcdefghijklmnop`) | **Não cadastre na Vercel** | Só o `npm run tipos` usa, na sua máquina. |

### O que nunca pode ter prefixo `NEXT_PUBLIC_`

Só uma, e é a que importa: **`SUPABASE_SERVICE_ROLE_KEY`**.

Essa chave **ignora o RLS por completo**. Com ela em mãos qualquer pessoa lê, altera e
apaga o banco inteiro — de todos os prestadores, não só do seu. O prefixo `NEXT_PUBLIC_`
faz o Next.js gravar o valor em texto puro dentro do JavaScript baixado pelo navegador;
bastaria abrir o DevTools. Não existe cenário em que ela precise estar no cliente: no
código ela só é importada por Route Handlers e Server Actions, protegidos por
`import 'server-only'`.

Se ela vazar: Supabase → Project Settings → API Keys → **Reveal → Generate new secret**
(revoga a antiga imediatamente) e atualize na Vercel.

---

## 4. Supabase depois do deploy

Substitua `https://fechaobra.vercel.app` pela URL real.

### 4.1 Site URL e Redirect URLs

*Supabase → **Authentication** → **URL Configuration***

1. **Site URL**: `https://fechaobra.vercel.app`
   (é a base que o Supabase usa nos links de e-mail — hoje o cadastro é direto, sem
   confirmação, mas isto passa a valer no minuto em que você ligar recuperação de senha)
2. **Redirect URLs** → *Add URL*, uma por linha:
   - `https://fechaobra.vercel.app/auth/callback`
   - `https://fechaobra.vercel.app/**`
   - `http://localhost:3000/**` — mantenha, senão você quebra o próprio desenvolvimento
3. **Save**

O `/auth/callback` existe no projeto e faz `exchangeCodeForSession`. Sem ele na lista,
qualquer fluxo por link de e-mail cai fora.

### 4.2 CORS

**Não precisa mexer.** O `@supabase/ssr` conversa com o Supabase a partir do servidor
Next e, no cliente, pela API REST — que já aceita qualquer origem, porque a proteção real
é o RLS, não a origem. Se aparecer erro de CORS, o problema é outro (URL errada ou chave
trocada), não configuração de CORS.

### 4.3 Confirmação de e-mail — confira que continua desligada

*Authentication → **Sign In / Providers** → **Email*** → **Confirm email** deve estar
**desligado**. Ligada, o cadastro em produção cria o usuário mas não devolve sessão, e a
pessoa fica presa numa tela que não explica nada.

### 4.4 Bucket de logos

*Storage* → confirme que existe o bucket **privado** de logos. É o mesmo projeto Supabase
do desenvolvimento, então ele já está lá. Se você tiver criado um projeto novo para
produção, rode antes: `node scripts/criar-bucket-logos.mjs` (idempotente), e aplique as
cinco migrations `supabase/migrations/0001` a `0005` na ordem.

---

## 5. Checklist pós-deploy

Faça **no celular**, e não no desktop — é onde o produto vive. Marque um a um.

### Fumaça

- [ ] `https://<url>/entrar` abre, sem erro no console
- [ ] `https://<url>/painel` sem estar logado **redireciona** para `/entrar`

### Conta e marca

- [ ] **Criar conta** em `/cadastro` com um e-mail real seu → cai direto no painel, logado
- [ ] Supabase → *Table Editor* → `perfis`: a linha foi criada sozinha pelo trigger, com `proximo_numero = 1`
- [ ] **Upload de logo** em Perfil da marca → a imagem aparece depois de salvar e depois de um refresh
- [ ] Preencher nome, telefone, e-mail da empresa e cor → salva

### Orçamento

- [ ] **Criar um orçamento** com cliente novo, 2+ itens e um texto de escopo
- [ ] O número saiu como **001** e o `proximo_numero` do perfil virou 2
- [ ] **Baixar o PDF** → abre, o logo aparece, o texto é selecionável, o QR está no rodapé
- [ ] O total do PDF bate com o do editor

### O link público — a parte que não pode falhar

- [ ] **Enviar** o orçamento → o diálogo abre **sem erro** (era exatamente aqui que quebrava antes da correção)
- [ ] **O link mostrado NÃO contém `localhost`** e começa com `https://` — copie e cole aqui para conferirmos juntos
- [ ] O botão do WhatsApp abre a conversa com a mensagem certa e **sem o valor do orçamento** no texto
- [ ] Aponte a câmera do celular para o **QR do PDF** → abre a mesma página pública
- [ ] Abrir o link numa **aba anônima** → a proposta carrega: escopo e o que está incluso **antes** do valor
- [ ] No painel do prestador, o status virou **visualizado** (a aba anônima conta; o seu próprio acesso logado, não)
- [ ] **Aceitar** na aba anônima → formulário pede nome (obrigatório), CPF e endereço → confirma
- [ ] No painel: status **aceito**, o card foi para o topo da fila, e **"Já combinei"** aparece
- [ ] Supabase → `orcamentos` → `snapshot_aceite` preenchido com itens, empresa e dados do aceite
- [ ] Editar o orçamento aceito (mudar um valor) → o `snapshot_aceite` **não muda**

### Isolamento

- [ ] Criar uma **segunda conta** → ela não enxerga nenhum cliente nem orçamento da primeira

### Vazamento

- [ ] Na página pública, *ver código-fonte*: não aparece `service_role`, nem `user_id`, nem o e-mail de login do prestador

---

## 6. Se o build falhar na Vercel

| Mensagem | Causa | Correção |
|---|---|---|
| `Build de produção interrompido: falta a URL pública` | nenhuma das três fontes de URL existe | defina `NEXT_PUBLIC_URL_BASE` em Production |
| `supabaseUrl is required` | `NEXT_PUBLIC_SUPABASE_URL` ausente ou com espaço | recadastre a variável e redeploy |
| erro 500 no cadastro | as migrations não foram aplicadas neste projeto Supabase | rode `0001` a `0005` na ordem |
| `FRONTEIRA SERVIDOR/CLIENTE VIOLADA` | um Client Component passou a ler variável de ambiente sem `NEXT_PUBLIC_` | é o check propositalmente derrubando o build. A saída diz o arquivo, a linha e o caminho de imports. Resolva o valor no servidor e passe por prop — ver README |
