-- ===========================================================================
-- FechaObra — 0006_eventos_cakto.sql
--
-- O diário do webhook da Cakto.
--
-- Existe antes de qualquer lógica de liberação, e de propósito: webhook
-- construído no escuro falha exatamente quando entra dinheiro. Esta tabela
-- guarda o que a Cakto MANDA DE VERDADE, para o mapeamento de campos ser
-- escrito olhando o payload real e não a imaginação de quem programou.
--
-- Depois que a liberação estiver no ar, ela continua útil: é o histórico que
-- responde "o que a Cakto disse sobre este pedido, e quando" numa disputa.
--
-- A tabela de `liberacoes` vem na 0007. A numeração combinada era 0006 para
-- ela, mas a Etapa A precisa deste log primeiro — e migration aplicada não
-- se renumera.
--
-- Rode DEPOIS de 0001 a 0005. Idempotente.
-- ===========================================================================

create table if not exists public.eventos_cakto (
  id         uuid primary key default gen_random_uuid(),

  -- O nome do evento como a Cakto manda: purchase_approved, refund,
  -- chargeback, etc. Fica solto (sem check) de propósito: se a Cakto criar um
  -- evento novo, o certo é registrar e investigar, não recusar na porta.
  tipo       text,

  -- O corpo inteiro, como chegou — MENOS o campo `secret`.
  --
  -- A Cakto não assina o payload com HMAC nem manda header de assinatura: o
  -- segredo viaja dentro do próprio corpo JSON. Guardar o corpo cru aqui
  -- colocaria a credencial em texto puro no banco, onde ela seria lida por
  -- qualquer backup, export ou consulta de suporte. A rota troca o valor por
  -- '[removido]' antes de gravar.
  payload    jsonb not null,

  -- Cabeçalhos da requisição, sem os de autenticação.
  --
  -- Não estavam no combinado, e entram porque nesta etapa a pergunta é "o que
  -- a Cakto manda?" — e parte da resposta está nos cabeçalhos: que
  -- Content-Type usa, se manda algum id de entrega para deduplicar, se
  -- identifica a retentativa. Sem isso a Etapa A responde metade.
  cabecalhos jsonb,

  -- Se o segredo do corpo bateu com CAKTO_WEBHOOK_SECRET.
  -- Falso aqui significa: registrado para investigação, NUNCA processado.
  segredo_valido boolean not null default false,

  -- Vira true quando a lógica de liberação (Etapa B) tratar este evento.
  -- Na Etapa A nada é processado: tudo entra como false.
  processado boolean not null default false,

  criado_em  timestamptz not null default now()
);

create index if not exists eventos_cakto_criado_em_idx
  on public.eventos_cakto (criado_em desc);

create index if not exists eventos_cakto_tipo_idx
  on public.eventos_cakto (tipo, criado_em desc);

-- Para a Etapa B varrer o que ficou para trás sem escanear a tabela inteira.
create index if not exists eventos_cakto_pendentes_idx
  on public.eventos_cakto (criado_em)
  where segredo_valido and not processado;

comment on table public.eventos_cakto is
  'Diário bruto dos webhooks da Cakto. O campo secret do corpo é removido antes de gravar: a Cakto não usa HMAC e o segredo viaja no payload.';


-- ---------------------------------------------------------------------------
-- RLS: ninguém lê isto pelo app.
--
-- Sem nenhuma policy, o RLS nega tudo para anon e authenticated. A rota do
-- webhook escreve com service role, que ignora RLS por definição.
--
-- Isto não é excesso de zelo: o payload traz nome, e-mail e telefone de quem
-- comprou, além do valor pago. É o dado mais sensível do projeto depois da
-- própria chave de serviço.
-- ---------------------------------------------------------------------------
alter table public.eventos_cakto enable row level security;


-- ===========================================================================
-- Conferência (rode depois):
--
--   select column_name, data_type
--     from information_schema.columns
--    where table_name = 'eventos_cakto'
--    order by ordinal_position;
--
--   select relrowsecurity from pg_class where relname = 'eventos_cakto';
--   -- deve devolver true
--
--   select count(*) from pg_policies where tablename = 'eventos_cakto';
--   -- deve devolver 0: sem policy, ninguém lê pelo app
-- ===========================================================================
