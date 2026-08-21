-- ===========================================================================
-- FechaObra — 0007_liberacoes.sql
--
-- Quem pagou.
--
-- Pagamento único de R$ 47, vitalício. Não há plano, não há renovação, não há
-- data de expiração: existe uma linha por e-mail que comprou, e ela vale para
-- sempre até um reembolso ou chargeback derrubá-la.
--
-- A LIGAÇÃO É POR E-MAIL. A pessoa paga na Cakto com um e-mail e precisa criar
-- a conta com o MESMO e-mail. É a principal fonte de suporte quando falha, e
-- por isso o aviso aparece na tela de cadastro, não escondido.
--
-- Rode DEPOIS de 0001 a 0006. Idempotente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. eventos_cakto ganha o id do pedido
--
-- É a chave de deduplicação: a Cakto retenta até 5 vezes, e nenhum cabeçalho
-- dela serve para identificar a entrega (conferido no payload real — só manda
-- user-agent CaktoBot/1.0 e traceparent). Os ids da Vercel identificam a
-- invocação da função, não o evento: numa retentativa viriam diferentes.
--
-- Fica NULO nos eventos que não têm pedido (abandono de checkout, assinatura)
-- e nos que chegaram com corpo incompleto.
-- ---------------------------------------------------------------------------
alter table public.eventos_cakto
  add column if not exists pedido_id text;

-- Para a checagem "este pedido já foi processado?" não varrer a tabela.
create index if not exists eventos_cakto_pedido_idx
  on public.eventos_cakto (pedido_id, tipo)
  where pedido_id is not null;

comment on column public.eventos_cakto.pedido_id is
  'payload.data[0].id — chave de deduplicação. A Cakto não manda id de entrega em header.';

-- Por que o evento não foi processado, ou o que foi feito com ele. Sem isto,
-- entender um caso estranho exige reler o payload inteiro.
alter table public.eventos_cakto
  add column if not exists nota text;


-- ---------------------------------------------------------------------------
-- 2. liberacoes
-- ---------------------------------------------------------------------------
create table if not exists public.liberacoes (
  id            uuid primary key default gen_random_uuid(),

  -- Sempre em minúsculas e sem espaço nas pontas.
  --
  -- A normalização acontece na aplicação E aqui, pelo índice único: o mesmo
  -- e-mail em maiúsculas não pode virar uma segunda liberação. Quem digita
  -- "Joao@Gmail.com" no checkout e "joao@gmail.com" no cadastro é a mesma
  -- pessoa, e ela não pode ficar sem acesso por causa disso.
  email         text not null,

  -- Nulo enquanto a conta não existe: a compra pode chegar antes do cadastro,
  -- e chega com frequência — a pessoa paga e só depois cria a conta.
  user_id       uuid references auth.users(id) on delete set null,

  status        text not null default 'ativa',

  -- payload.data[0].id da compra que originou esta liberação. É por ele que a
  -- revogação encontra a linha certa quando o reembolso chega.
  pedido_id     text,

  liberada_em   timestamptz not null default now(),
  revogada_em   timestamptz,
  motivo_revogacao text,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint liberacoes_status_valido check (status in ('ativa', 'revogada')),
  constraint liberacoes_email_normalizado check (email = lower(btrim(email))),
  -- Revogada sem carimbo, ou carimbo sem revogação, é estado impossível.
  constraint liberacoes_revogacao_coerente check (
    (status = 'revogada' and revogada_em is not null)
    or (status = 'ativa' and revogada_em is null)
  )
);

create unique index if not exists liberacoes_email_idx on public.liberacoes (email);
create index if not exists liberacoes_user_id_idx on public.liberacoes (user_id) where user_id is not null;
create index if not exists liberacoes_pedido_idx on public.liberacoes (pedido_id) where pedido_id is not null;

comment on table public.liberacoes is
  'Quem pagou os R$ 47 vitalícios. Ligada por e-mail: o do checkout tem que ser o do cadastro.';


-- ---------------------------------------------------------------------------
-- 3. RLS — o usuário lê a própria linha, e só lê
--
-- Escrita é exclusiva do service role (webhook e vinculação no cadastro).
-- Sem policy de insert/update/delete, ninguém escreve pelo app: um usuário
-- que pudesse inserir a própria liberação teria acesso vitalício de graça.
-- ---------------------------------------------------------------------------
alter table public.liberacoes enable row level security;

drop policy if exists "usuario le a propria liberacao" on public.liberacoes;
create policy "usuario le a propria liberacao"
  on public.liberacoes for select
  to authenticated
  using (
    user_id = auth.uid()
    -- Também pelo e-mail: entre o cadastro e a vinculação existe uma janela
    -- em que user_id ainda é nulo, e nela a pessoa já pagou.
    or email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );


-- ---------------------------------------------------------------------------
-- 4. atualizado_em automático
-- ---------------------------------------------------------------------------
create or replace function public.tocar_liberacao()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists liberacoes_tocar on public.liberacoes;
create trigger liberacoes_tocar
  before update on public.liberacoes
  for each row execute function public.tocar_liberacao();


-- ===========================================================================
-- LIBERAR AS CONTAS QUE JÁ EXISTEM (rode depois de criar a tabela)
--
-- Troque os e-mails pelos seus. O pedido_id fica marcado como manual para
-- ficar claro, numa auditoria, que não veio de venda.
--
--   insert into public.liberacoes (email, user_id, status, pedido_id)
--   select lower(btrim(u.email)), u.id, 'ativa', 'manual-fundador'
--     from auth.users u
--    where lower(u.email) in ('pedrodurso8@gmail.com', 'pedrodursoads@gmail.com')
--   on conflict (email) do update
--      set status = 'ativa', user_id = excluded.user_id,
--          revogada_em = null, motivo_revogacao = null;
--
-- Conferência:
--   select email, status, user_id is not null as vinculada, pedido_id
--     from public.liberacoes order by criado_em;
-- ===========================================================================


-- ===========================================================================
-- Conferência da estrutura:
--
--   select relrowsecurity from pg_class where relname = 'liberacoes';  -- true
--   select policyname, cmd from pg_policies where tablename = 'liberacoes';
--   -- deve listar só a de SELECT
-- ===========================================================================
