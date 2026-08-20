# FechaObra

Orçamentos profissionais de obra e reforma em PDF, prontos para mandar no WhatsApp.

**Fase 0 — fundação.** Cadastro, login, rotas protegidas, schema completo e seed
dos textos padrão.

**Fase 1 — motor do documento.** PDF vetorial com `@react-pdf/renderer`, dados
mockados, visível em `/painel/documento-teste`. Editor, persistência e link
público são Fase 2.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 (CSS-first) · Supabase (São Paulo) · Vercel

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

## Configuração do Supabase (uma vez)

1. **Crie o projeto** em supabase.com, região `South America (São Paulo)`.

2. **Rode as migrations** no SQL Editor, nesta ordem:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_seed_textos.sql`

3. **Desligue a confirmação de e-mail**
   Authentication › Sign In / Providers › Email › desmarque **Confirm email**.
   O cadastro passa a devolver sessão na hora e o usuário cai direto no painel.

4. **Copie as chaves** em Project Settings › API para o `.env.local`.
   A `SUPABASE_SERVICE_ROLE_KEY` nunca leva prefixo `NEXT_PUBLIC_`.

5. **Gere a tipagem do banco:**
   ```bash
   npm run tipos
   ```
   Sobrescreve `src/lib/tipos-banco.ts` com os tipos reais de todas as tabelas.

## Estrutura

```
src/
  app/          rotas — (publico) sem sessão, (painel) protegido
  modules/      código por domínio: auth, perfil, clientes, orcamentos, biblioteca
  componentes/  UI compartilhada (ui/ e layout/)
  lib/          clients do Supabase, tipagem do banco, utilitários
  proxy.ts      renovação de sessão e controle de acesso (era middleware.ts)
supabase/
  migrations/   SQL para colar no SQL Editor
```

## Motor do documento (Fase 1)

O PDF vive em `src/modules/documento/`, um arquivo por bloco. Toda a aparência
sai de `tema.ts` — trocar `CORES.primaria` reetiqueta o documento inteiro.

```bash
npm run doc:render                        # gera os dois mocks em /tmp/fechaobra
npm run doc:verificar <arquivo.pdf>       # prova que o texto é selecionável
npm run doc:png <arquivo.pdf> [pasta]     # rasteriza para conferir layout
npm run doc:imagens-mock                  # regera as fixtures de imagem
```

`doc:verificar` é o teste que importa: extrai o texto com pdfjs (o mesmo motor
dos leitores de PDF). Se ele extrai, o mouse seleciona. Se um dia o documento
virar imagem, este comando falha com código 1.

## Decisões que valem lembrar

- **Numeração por usuário** sai de `perfis.proximo_numero` via `UPDATE ... RETURNING`,
  que trava a linha e é atômico. `MAX(numero)+1` geraria duplicata sob concorrência.
- **O perfil nasce no banco**, por trigger em `auth.users`, não na server action.
  Fechar a aba no meio do cadastro não deixa conta órfã.
- **RLS em todas as tabelas**, `anon` sem nenhuma permissão. A leitura pública por
  `token_publico` é Fase 2, via route handler com service role — não abrindo RLS.
- **Sem shadcn/ui**: o design é próprio, os componentes vivem em `src/componentes`.
- **Nenhum `letterSpacing` no documento.** O react-pdf posiciona glifo a glifo,
  e o extrator do leitor lê isso como espaço: "O QUE ESTÁ INCLUSO" saía do
  Ctrl+C como "O Q U E E S TÁ I N C L U S O". A hierarquia é feita com peso,
  tamanho e cor.
- **Corpo em 11pt**, subido de 9,5pt depois do teste de leitura em tela de 6
  polegadas. Ver a nota em `tema.ts`.
- **A4 ajustada à largura de tela de 6 polegadas é limitação de formato, não de
  tipografia.** Medido: com corpo 9,5pt o texto renderiza a 1,10mm de altura de
  em, abaixo de bula de remédio (~1,5mm). Subir para 11pt levou a 1,28mm — o que
  decide a venda (número, validade, total, valores dos pacotes) passou a se ler
  sem ampliar, mas o corpo continua exigindo zoom. Chegar a 1,8mm pediria corpo
  15,5pt numa A4, o que dobraria o documento. Não há tamanho que resolva.

  **Consequência para o produto: o PDF é para WhatsApp e impressão; o link
  público é o canal de leitura em celular.** Isso eleva a prioridade do link
  público — ele não é um extra do fluxo de aceite, é o único canal em que o
  cliente lê o orçamento inteiro com conforto no aparelho em que ele chega.
- **Fonte Inter em TTF**, registrada à mão, com hifenização desligada. A Helvetica
  embutida do PDF é Latin-1 e tropeça na acentuação; a hifenização automática do
  react-pdf usa regra do inglês e quebraria "im-permeabilização".
- **O documento não conhece o banco**: recebe `OrcamentoDocumento`, um formato
  próprio. Na Fase 2 entra um adaptador entre as tabelas e esse tipo.
