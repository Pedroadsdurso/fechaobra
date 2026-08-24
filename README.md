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
- **Cliente mínimo: só o nome é obrigatório.** Telefone, e-mail e endereço são
  opcionais no cadastro. O prestador está no canteiro e precisa emitir o
  orçamento agora — exigir dados que ele não tem em mãos trava o fluxo.

- **`snapshot_aceite` (jsonb) é onde os dados do cliente chegam de verdade.**
  Na Fase 3, o aceite pelo link público pede nome completo, CPF e endereço
  **depois** do clique em "Aceitar", nunca antes: formulário na frente do botão
  derruba a conversão. Esses dados são exatamente os que faltam para emitir
  contrato e recibo depois, ficam congelados em `snapshot_aceite` como prova do
  que foi aceito, e **enriquecem a linha correspondente em `clientes`** — o
  cadastro que começou como só um nome se completa sozinho, pelas mãos de quem
  tem a informação correta. Por isso o cadastro de cliente é propositalmente
  frouxo: ele é um rascunho até o aceite.

- **Pacotes: valor derivado, texto gravado.** O valor de cada nível sai da soma
  acumulada dos itens marcados nele (`orcamento_itens.pacote`); rótulo, frase e
  destaque ficam em `orcamento_pacotes` (migration 0003). Três números
  crescentes sem justificativa empurram o cliente para o mais barato — a frase
  é o que sustenta a ancoragem. Nível cujo valor repete o anterior é filtrado
  pelo adaptador e não chega ao papel: duas opções boas convencem mais que três
  com uma repetida.

  **Pendente para a Etapa E:** ao DUPLICAR um orçamento, copiar as linhas de
  `orcamento_pacotes` apenas se os pacotes estavam em uso na origem (itens
  espalhados em mais de um nível). Duplicar sempre faria o novo orçamento
  nascer carregando texto que ninguém vai ver.

- **Nunca usar `toISOString()` para derivar data local** — em UTC−3 qualquer
  horário após 21h vira o dia seguinte. Use `dataLocalISO`/`dataLocalEmDias`
  de `lib/utils`.

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

- **O dia da cota do Google zera à meia-noite no Pacífico, não em São Paulo.**
  Contar em fuso local faz o contador divergir do real e o 429 chegar sem
  aviso. A virada cai às 4h de Brasília no verão americano e às 5h fora dele —
  quem testa de madrugada vê o contador local zerar enquanto o do Google não
  zerou. `inicioDoDiaDeCota()` em `modules/ia/limite.ts` deriva do relógio de
  parede em `America/Los_Angeles`, e não de um deslocamento fixo, para
  atravessar a mudança de horário de verão sem ajuste.

- **Em insert em lote pelo PostgREST, chave ausente numa linha vira NULL
  explícito e atropela o DEFAULT da coluna.** Ponha todas as chaves em todas as
  linhas. O PostgREST unifica as chaves do array inteiro e preenche o que falta
  com NULL — então `status` omitido em duas linhas de três não cai no
  `default 'ativa'`, cai em `null` e bate na constraint `not null`. Vale para
  `recursos_liberados`, `liberacoes` e qualquer tabela com DEFAULT. Falha
  barulhento, o que é sorte: se a coluna aceitasse nulo, a linha entraria
  errada e calada.

- **`exigirRecurso` cobra acesso E recurso, nessa ordem.** Quem não comprou
  recebe `SemAcesso` e vai para a tela de compra, não `SemRecurso`, que
  mandaria procurar um botão que não existe para ela. A ordem é a mensagem
  certa; a soma é a tranca: sem ela, uma linha solta em `recursos_liberados`
  daria um pedaço do produto a quem nunca pagou os R$ 47.

- **Nenhuma âncora de wa.me no produto usa `target="_blank"`.** O iOS
  intercepta o universal link e passa para o app; em aba nova essa passagem
  falha e sobra aba em branco. Vale para toda âncora de WhatsApp, não só o
  diálogo de envio — o achado nasceu lá (`dialogo-envio.tsx`), mas a página
  pública inteira estava com o mesmo problema até a varredura de agosto/2026.
  Consequência de projeto: a página **sai de verdade** quando o link é tocado,
  então qualquer registro que precise viajar junto vai de
  `fetch(..., { keepalive: true })`, nunca de `await`.

  **`npm run verificar:whatsapp` quebra o build se alguém reintroduzir.** O
  comentário sozinho não segurou: a correção nasceu em `dialogo-envio.tsx`, e
  meses depois a página pública inteira e o botão de WhatsApp da lista ainda
  tinham o defeito. Link interno com `target="_blank"` continua liberado — o
  "Ver em PDF" abre noutra aba de propósito, para não custar o orçamento.

- **Dúvida do cliente não é recusa, e não mexe no status.** O link público não
  tem botão de "Recusar" — tem "Tenho uma dúvida", e o motivo é capturado ali
  (migration 0010, evento `tipo='duvida'`). O orçamento continua `enviado` ou
  `visualizado` e `respondido_em` continua nulo, porque mudar o status tiraria
  o orçamento da fila de trabalho do prestador exatamente quando ele mais
  precisa aparecer nela. Ver a decisão original no cabeçalho de `aceite.tsx`.

  **`POST /api/p/[token]/duvida` devolve 204 e ninguém espera a resposta. A
  ausência de tratamento de erro no cliente é deliberada, não esquecimento.**
  Quem for mexer nisto vai querer "consertar" com `await` e uma mensagem de
  falha — e vai quebrar o fluxo. Duas razões, e a segunda decide:

  1. **A conversa vale mais que o dado.** Registro que falha custa uma
     informação útil ao prestador; conversa que falha custa a venda. Não há
     erro aqui que justifique segurar a pessoa numa tela.
  2. **Abrir link depois de um `await` é bloqueado no Safari do iPhone**,
     porque já não está dentro do gesto do usuário. Por isso cada opção é uma
     **âncora de verdade**, que navega no próprio toque, e o POST viaja junto
     com `fetch(..., { keepalive: true })`, que sobrevive à página sair.

### Variável de ambiente em Client Component nunca

Toda URL e toda configuração é resolvida **no servidor** e passada por prop.
Client Component não lê `process.env` sem o prefixo `NEXT_PUBLIC_`.

O Next injeta no bundle do navegador apenas variáveis com esse prefixo. Sem ele,
no cliente a variável é `undefined` — e essa é a classe de bug mais traiçoeira
do projeto, porque nada a denuncia antes do usuário:

- o `tsc` não vê: `process.env.X` é string em qualquer ambiente;
- o `eslint` não vê: é acesso a propriedade, sintaticamente perfeito;
- **o build passa**: durante o build, no servidor, a variável existe;
- **o `npm run dev` funciona**: o fallback de localhost cobre o buraco.

Ela só aparece no navegador de quem pagou, em produção.

Foi assim que quase foi para o ar: `DialogoEnvio` — a tela onde o prestador copia
o link para mandar no WhatsApp — chamava `urlBase()`, que lê
`VERCEL_PROJECT_PRODUCTION_URL`. Num deploy que dependesse do fallback da Vercel,
o build passaria e o diálogo quebraria com erro no primeiro envio de orçamento.
Encontrado inspecionando o bundle gerado, não rodando o app.

Por isso a regra tem um **check que derruba o build**, não um comentário:

```
npm run verificar:fronteira    # roda sozinho antes de `next build`
```

`scripts/verificar-fronteira.mjs` percorre o grafo de imports a partir de cada
arquivo `'use client'` — **transitivamente**, porque o defeito não precisa estar
no componente, basta ele importar quem lê — e falha se encontrar leitura de
`process.env` sem `NEXT_PUBLIC_` (exceto `NODE_ENV`, que o próprio Next
substitui) ou import de `lib/url-base`.

A travessia para em arquivos `'use server'` e em quem importa `server-only`: o
Next troca esses imports por RPC, nada deles vai para o bundle, e ler
`SUPABASE_SERVICE_ROLE_KEY` ali é o comportamento correto. Um check que acusasse
isso ensinaria a ignorá-lo.

### O que sai para a IA é montado por inclusão

**Monte por inclusão, nunca filtre por exclusão.** A diferença não é de estilo,
é de modo de falhar. `delete payload.cpf` funciona até alguém acrescentar uma
coluna à tabela — e aí o campo novo **vaza por padrão**, calado. Montar o
literal à mão (`{ tipoServico, descricao }`) faz o padrão ser não vazar, e
vazar exigir um ato deliberado.

O que pode sair: tipo de serviço, título do orçamento, descrições dos itens. O
que nunca sai: nome do cliente, endereço da obra, CPF, telefone, valores
unitários, valores totais, nome ou dados da empresa do prestador.

O texto livre da extração é o pedido, então vai inteiro — e é por isso que a
folha avisa, **antes** de gerar, que aquele campo é enviado.

```
npm run verificar:saneamento    # roda sozinho antes de `next build`
```

Nada disso quebra `tsc` nem teste comum, então a verificação é comportamental:
monta o payload a partir de um rascunho cheio de dado sensível e conta o que
sobreviveu. Valida também que **só `modules/ia/gemini.ts` fala com a API do
Gemini e lê `GEMINI_API_KEY`** — um segundo `fetch` em qualquer outro arquivo
passaria por fora da cota, do registro de uso e do limite de taxa.

Quebrando de propósito (trocando o literal por um spread), o check acusa os
nove campos sensíveis vazando.

### A IA não estima preço, e a garantia é o schema

Pedir "não invente preços" na instrução é confiar na boa vontade do modelo. O
schema mandado ao Gemini em `modules/ia/extrair-itens.ts` **não tem campo de
valor** — não existe a casa onde a regra seria desobedecida, e o item chega no
editor com `valorUnitario` vazio. Quem acrescentar `valorUnitario` ao schema
"para adiantar" estará desfazendo a única garantia real que existe ali.

### O check de hidratação é gate de push, não lembrete

Mudança em editor, auth ou sessão **não sobe sem prova de que o painel ainda
hidrata**. O hook de `pre-push` chama `scripts/exige-hidratacao.mjs`, que olha o
que está subindo e, se tocar em

```
src/modules/orcamentos/componentes/   src/app/(painel)/
src/modules/auth/                     src/app/auth/
src/lib/supabase/                     src/componentes/layout/
src/componentes/ui/                   src/proxy.ts, src/app/layout.tsx
```

exige um carimbo `.hidratacao-ok` **do mesmo commit**. O carimbo só é escrito
quando as seis rodadas passam. Verde de ontem, noutro commit, não vale: o que se
quer saber é se o código que está subindo agora hidrata.

```
git config core.hooksPath .githooks      # uma vez, por clone
BASE=https://app.fechaobra.online npm run verificar:hidratacao
```

O gate **não roda o teste sozinho** de propósito: rodar exige servidor de pé e
cria conta descartável no banco. Isso é decisão de quem está empurrando, não de
um hook silencioso — ele só recusa avançar sem a prova.

### Página oculta não hidrata — e é armadilha de teste, não do produto

**O scheduler do React adia trabalho não urgente enquanto `document.visibilityState`
é `'hidden'`, e a hidratação é trabalho não urgente.** Em Chrome headless a aba
pode ser tratada como oculta depois de uma troca de sessão — e aí o sintoma é
idêntico ao do defeito que `verificar:hidratacao` existe para caçar: HTML certo,
JavaScript baixado, clique morto.

Perdi meia investigação nisso. A sequência "conta A hidrata, conta B não" parecia
provar que o recurso novo quebrava a página; invertendo a ordem, quem não
hidratou foi a conta sem recurso nenhum. O fator era a ordem no navegador.

Por isso o `verificar:hidratacao` sobe o Chrome com
`--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding` e
`--disable-background-timer-throttling`. Prova causal: mesma sequência, mesma
máquina, mudando só as flags — sem elas `visibilityState=hidden` e a página não
hidrata; com elas `visible` e hidrata em ~300ms. **Em Chrome com janela, os
mesmos passos hidratam sempre.** Nenhum usuário real foi atingido.

Regra que fica: **antes de acusar o produto, confira `document.visibilityState`.**

E o cenário virou rodada permanente: o checker agora sai da conta pelo mesmo
botão do usuário (form POST para `/auth/sair`), entra de novo no mesmo navegador
e reabre o editor. Se um dia quebrar de verdade, o editor fica morto e a pessoa
acha que o app acabou — as outras rodadas não pegariam, porque cada uma nascia
num navegador novo.

Detalhe que travou o teste por dez minutos: **expressão que navega a página nunca
devolve resultado ao CDP.** `Runtime.evaluate` com `awaitPromise` fica pendurado
para sempre. Clique que submete formulário vai por `disparar` (sem await), e a
rota é conferida do lado de fora, com `esperarRota`.

### Defeito que se repete vira verificador, não mais uma correção

**Três ocorrências do mesmo defeito significam que vai haver uma quarta. Quando
um defeito se repete em lugares diferentes, o conserto é um verificador que roda
no build, não mais uma correção pontual.**

O caso que originou a regra: `target="_blank"` em âncora de wa.me. O achado é
antigo e estava comentado em `dialogo-envio.tsx` — o iOS intercepta o universal
link e passa para o WhatsApp, e em aba nova essa passagem falha e sobra aba em
branco. Corrigiu-se **um** arquivo.

Meses depois o mesmo defeito estava em mais três lugares: as âncoras da página
pública, a faixa de "orçamento venceu" e o botão de WhatsApp da lista do painel.
Um deles fui eu que reintroduzi, copiando uma âncora antiga ao escrever o fluxo
da dúvida — com o comentário explicando o problema a duas telas de distância.

```
npm run verificar:whatsapp    # roda sozinho antes de `next build`
```

`scripts/verificar-whatsapp.mjs` olha só os arquivos que mexem com WhatsApp e
falha se uma âncora com `target="_blank"` tiver `href` que não seja caminho
interno. Ignora comentários — na primeira execução ele acusou os próprios avisos
contra o defeito — e libera `href` interno, que é o caso do "Ver em PDF", onde
abrir noutra aba é o certo: ninguém quer perder o orçamento para ler o anexo.

Como todo check daqui, foi validado quebrando de propósito o que ele guarda.

### `transform` em ancestral quebra todo `position: fixed` descendente

**Um ancestral com `transform` (ou `filter`, ou `will-change: transform`) vira
bloco de contenção, e `position: fixed` descendente deixa de grudar na janela:
passa a se posicionar relativo ao ancestral, como um `absolute`.**

O `template.tsx` do painel aplica a animação de entrada de rota (`.fo-rota`)
em volta de TODAS as rotas. Com `animation-fill-mode: both`, o `transform` do
keyframe continuava em efeito depois da animação terminar — e a barra fixa do
editor parava no fim do documento, cobrindo o campo "Prazo de execução" sem
rolagem que alcançasse. A correção foi `backwards`: aplica o estado inicial
antes de começar (o que evita o piscar) e não deixa resíduo depois.

A implicação que vale mais que o bug: **qualquer `fixed` novo dentro do painel
quebra do mesmo jeito se houver resíduo de `transform` no template — e o
sintoma vai parecer outro problema** (elemento "sumido", barra "no lugar
errado", sobreposição). Antes de caçar z-index ou layout, confira se algum
ancestral está com `transform` em efeito: no DevTools, um `fixed` que rola com
a página é este bug, sempre.

### Hidratação quebrada é invisível — rode `verificar:hidratacao` antes e depois de todo deploy

**Hidratação quebrada é invisível em `tsc`, `lint`, screenshot e peso de bundle.
Rodar `verificar:hidratacao` contra produção antes e depois de todo deploy.**

As duas leituras respondem perguntas diferentes, e é a diferença entre elas que
tem valor:

- **antes** diz se o problema já existia;
- **depois** diz se foi você que o criou.

Sem as duas, um alarme não distingue regressão de defeito antigo — e essa foi
exatamente a informação que faltou no alarme falso que originou este script.
Eu não sabia se o que estava vendo era novo, e tratei "está quebrado" como
"eu quebrei agora".

Quando o React não monta, o HTML do servidor continua perfeito: a tela aparece
inteira, o print fica idêntico ao de uma página saudável, os arquivos JS são
baixados normalmente e o peso do bundle não se mexe. O `tsc` passa porque o
código está correto — ele só não executa. O que some é a resposta ao clique.

```
npm run verificar:hidratacao                                  # local
BASE=https://app.fechaobra.online npm run verificar:hidratacao  # produção
```

`scripts/verificar-hidratacao.mjs` sobe um Chrome headless por CDP — sem
dependência nova, o Node 22 tem WebSocket embutido — cria uma conta
descartável pela própria tela de cadastro, abre cada rota do painel e faz uma
ação que **só funciona com estado do React**: abrir diálogo, filtrar lista,
digitar em campo controlado, adicionar item. No fim apaga a conta e tudo o que
ela gerou, em `finally`, mesmo quando uma prova falha.

Duas decisões que vieram de erro meu, e que não devem ser desfeitas:

- **o teste sobe o próprio Chrome**, com perfil temporário e `--disable-extensions`.
  Eu já diagnostiquei "o painel não hidrata em produção" a partir de um
  navegador que eu mesmo havia deixado num estado inválido, e confirmei o
  diagnóstico no mesmo navegador estragado. O app estava íntegro;
- **as provas rodam no mundo da página**, não num mundo isolado. As chaves
  `__react*` que o React põe nos nós do DOM são invisíveis de fora do mundo da
  página, e isso me deu um falso negativo.

Anomalia impossível é motivo para suspeitar do instrumento, não para tratar
como dado.

O teste foi validado quebrando a hidratação de propósito — um `throw` que só
dispara no navegador — e confirmando que ele falha com código de saída 1. Um
teste que só sabe passar não prova nada.

### Afirme sobre o mecanismo, não sobre o resultado

**Teste que valida resultado sem validar caminho fica verde enquanto o caminho
apodrece.**

Ao testar "compra aprovada depois de reembolso não reativa o acesso", a
afirmação era só sobre o resultado: `status` continua `revogada`. Verde. Mas a
razão estava errada — quem barrou foi a **idempotência** (aquele pedido já
tinha sido processado), não a guarda de revogado. A guarda nunca rodou.

Só apareceu porque uma segunda afirmação olhava o caminho: `processado ===
false`, que a idempotência não produz. Sem ela, o teste ficaria verde para
sempre — e no dia em que a idempotência mudasse de lugar, o acesso voltaria
sozinho para quem pediu o dinheiro de volta.

Na prática, três hábitos:

- **verifique COMO, não só O QUÊ.** "Não criou" é fraco: um id inválido, uma
  sessão expirada ou um erro de banco também não criam. Prove que foi o gate;
- **desligue o caminho alternativo** quando existir um que produziria o mesmo
  resultado, para isolar o que se quer medir;
- **prova causal** onde der: mude só a variável em questão e mostre que o
  resultado vira. Em `verificar:acesso`, a mesma chamada com o mesmo cookie
  passa depois de inserir a liberação — logo, o que barrava era ela.

Vale junto com a regra do `verificar:hidratacao`: um teste verde por acidente
é pior que teste nenhum, porque desliga a vigilância.
