-- ===========================================================================
-- FechaObra — 0011_bumps_e_upsells.sql
--
-- Um checkout, várias compras.
--
-- Até aqui o webhook lia `payload.data[0]` e tratava o evento como UMA compra.
-- Medido no payload real (evento 8X7Zs1S, em eventos_cakto): quando o checkout
-- tem order bumps, a Cakto manda UM evento com `data[]` de até quatro itens —
-- cada um com o seu próprio `id` de pedido, o seu produto e o seu valor. São
-- quatro compras dentro de um envelope só.
--
-- E `data[0]` NÃO é o principal. No evento 8X7Zs1S a ordem é:
--
--     data[0]  Recuperação de Cliente   orderbump
--     data[1]  Orçamento com IA         orderbump
--     data[2]  Contrato e Recibo        orderbump
--     data[3]  FechaObra                main        <- o vitalício está aqui
--
-- Ou seja: o código antigo, olhando só data[0], liberaria o vitalício de R$ 47
-- carimbado com o pedido da Recuperação, e não veria os outros três itens.
-- Reembolso da Recuperação depois derrubaria o acesso inteiro.
--
-- Esta migration é a parte de banco da correção: o log passa a ter UMA LINHA
-- POR ITEM, e ganha os dois campos que ligam os itens entre si.
--
-- Rode DEPOIS de 0001 a 0010. Idempotente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Os dois campos novos de eventos_cakto
-- ---------------------------------------------------------------------------

/*
  `main` para o produto do checkout, `orderbump` para os bumps marcados nele.

  Nulo NÃO significa "não sei": significa que o evento não tem essa noção.
  Conferido no payload real — `checkout_abandonment` chega com um corpo
  reduzido, sem `offer_type`, sem `parent_order` e sem `id` de pedido. Um
  `default 'main'` aqui inventaria estrutura onde não há, e é justamente o tipo
  de invenção que faria alguém confiar no campo depois.

  Também fica solto, sem check, pelo mesmo motivo de `tipo`: valor novo da
  Cakto deve ser registrado e investigado, não recusado na porta.
*/
alter table public.eventos_cakto
  add column if not exists offer_type text;

/*
  O `refId` do item principal, repetido em cada bump — é o que amarra os itens
  do mesmo checkout.

  Repare que ele aponta para o `refId` do principal, NÃO para o `id` dele. No
  evento 8X7Zs1S os bumps trazem parent_order = '8X7Zs1S', e o item principal
  tem id = '22f8e1f3-…' e refId = '8X7Zs1S'. Quem tentar juntar bump e
  principal por `parent_order = id` não vai casar nada — e o sintoma seria
  silencioso, porque não casar nada parece simplesmente "não havia bumps".

  No item principal a Cakto manda string vazia. A aplicação grava nulo: vazio e
  ausente são a mesma coisa aqui, e ter os dois estados só cria caso a mais
  para toda consulta futura tratar.
*/
alter table public.eventos_cakto
  add column if not exists parent_order text;

comment on column public.eventos_cakto.offer_type is
  'main | orderbump, como a Cakto manda. Nulo em evento sem essa noção (checkout_abandonment).';

comment on column public.eventos_cakto.parent_order is
  'refId do item principal, repetido nos bumps do mesmo checkout. Aponta para o refId, não para o id. Nulo no próprio principal.';

-- O comentário antigo dizia data[0].id, e não diz mais a verdade: agora cada
-- item de data[] vira uma linha, com o pedido DELE.
comment on column public.eventos_cakto.pedido_id is
  'O id do item de data[] que originou ESTA linha. Uma linha por item. Chave de deduplicação junto com tipo — a Cakto não manda id de entrega em header.';

-- Para achar os irmãos de um checkout sem varrer a tabela. Parcial porque só
-- bump tem parent_order: no principal e nos eventos avulsos ele é nulo.
create index if not exists eventos_cakto_parent_order_idx
  on public.eventos_cakto (parent_order)
  where parent_order is not null;


-- ---------------------------------------------------------------------------
-- 2. Nada a migrar nas linhas antigas — e por que isso é verdade
-- ---------------------------------------------------------------------------
/*
  As duas colunas nascem nulas nas linhas que já existem, e ficam assim.

  Não há backfill porque não há o que preencher com honestidade: as linhas
  anteriores a esta migration são um evento inteiro cada, não um item. Escrever
  offer_type = 'main' nelas afirmaria que aquela linha é o item principal de um
  checkout, o que é falso para uma linha que representa o envelope todo.

  Conferido antes de decidir: as 16 linhas existentes são pix_gerado e
  checkout_abandonment. Nenhuma é purchase_approved, nenhuma liberou nada.
  Backfill aqui seria trabalho para deixar o histórico menos verdadeiro.
*/


-- ===========================================================================
-- OS RECURSOS MUDARAM DE NOME (nada a rodar — leia antes de procurar bug)
--
-- No código, três recursos foram renomeados junto com esta migration:
--
--     ia_audio     -> audio_orcamento
--     ia_medicao   -> medicao_foto
--     calculadora  -> calculadora_material
--
-- Os nomes antigos descreviam a tecnologia ("é IA"); os novos descrevem o que
-- a pessoa recebe. E `calculadora` sozinho não dizia calculadora de quê.
--
-- NÃO HÁ UPDATE AQUI de propósito: conferido em recursos_liberados antes de
-- renomear, as únicas linhas são ia_textos e ia_orcamento das duas contas do
-- fundador — nomes que não mudaram. Os três renomeados nunca foram concedidos
-- a ninguém, porque os produtos deles acabaram de entrar no catálogo.
--
-- Se um dia aparecer linha com nome antigo, ela não quebra nada: fica inerte,
-- porque ninguém pergunta por ela. O conserto seria um update de uma linha.
-- ===========================================================================


-- ===========================================================================
-- Conferência (rode depois):
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'eventos_cakto'
--      and column_name in ('offer_type', 'parent_order');
--   -- duas linhas, ambas text, ambas YES
--
--   select indexname from pg_indexes
--    where tablename = 'eventos_cakto' and indexname like '%parent_order%';
--   -- eventos_cakto_parent_order_idx
--
-- Depois da primeira compra com bump, isto mostra o checkout inteiro:
--
--   select coalesce(parent_order, '(principal)') as checkout,
--          tipo, offer_type, pedido_id, processado, nota
--     from public.eventos_cakto
--    where tipo = 'purchase_approved'
--    order by criado_em desc, offer_type;
-- ===========================================================================
