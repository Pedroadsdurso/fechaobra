-- ===========================================================================
-- FechaObra — 0003_pacotes.sql
--
-- Rótulo e justificativa de cada nível de pacote.
--
-- Por que uma tabela, e não soma derivada dos itens: os três pacotes existem
-- para ancoragem de preço, e ancoragem sem justificativa não funciona. Três
-- números crescentes, sem nome e sem uma frase dizendo o que muda, empurram o
-- cliente para o mais barato — o contrário do objetivo.
--
-- O VALOR continua saindo da soma dos itens de cada nível (coluna
-- orcamento_itens.pacote). Esta tabela guarda só o que a soma não sabe dizer:
-- como o nível se chama e o que ele entrega a mais.
--
-- Rode DEPOIS de 0001 e 0002. Idempotente em projeto já migrado.
-- ===========================================================================

create table if not exists public.orcamento_pacotes (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid not null references public.orcamentos(id) on delete cascade,
  nivel         text not null,
  rotulo        text not null default '',
  descricao     text not null default '',
  destaque      boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint orcamento_pacotes_nivel_valido check (
    nivel in ('essencial', 'recomendado', 'completo')
  ),
  constraint orcamento_pacotes_unico unique (orcamento_id, nivel)
);

create index if not exists orcamento_pacotes_orcamento_id_idx
  on public.orcamento_pacotes (orcamento_id);

-- Um único destaque por orçamento.
--
-- Índice único PARCIAL: a restrição só vale sobre as linhas com destaque = true.
-- Um unique (orcamento_id, destaque) comum permitiria um true e um false, mas
-- proibiria dois false — exatamente o contrário do que se quer. Aqui os false
-- são livres e os true, no máximo um por orçamento.
create unique index if not exists orcamento_pacotes_um_destaque_idx
  on public.orcamento_pacotes (orcamento_id)
  where destaque;

drop trigger if exists orcamento_pacotes_atualizado_em on public.orcamento_pacotes;
create trigger orcamento_pacotes_atualizado_em
  before update on public.orcamento_pacotes
  for each row execute function public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- RLS — mesmo padrão de orcamento_itens: a linha é de quem é o orçamento pai.
-- ---------------------------------------------------------------------------
alter table public.orcamento_pacotes enable row level security;

drop policy if exists "pacotes: dono do orcamento lê" on public.orcamento_pacotes;
create policy "pacotes: dono do orcamento lê" on public.orcamento_pacotes
  for select to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_pacotes.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "pacotes: dono do orcamento insere" on public.orcamento_pacotes;
create policy "pacotes: dono do orcamento insere" on public.orcamento_pacotes
  for insert to authenticated
  with check (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_pacotes.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "pacotes: dono do orcamento atualiza" on public.orcamento_pacotes;
create policy "pacotes: dono do orcamento atualiza" on public.orcamento_pacotes
  for update to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_pacotes.orcamento_id
      and o.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_pacotes.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "pacotes: dono do orcamento apaga" on public.orcamento_pacotes;
create policy "pacotes: dono do orcamento apaga" on public.orcamento_pacotes
  for delete to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_pacotes.orcamento_id
      and o.user_id = (select auth.uid())
  ));

revoke all on public.orcamento_pacotes from anon;


-- ===========================================================================
-- Conferência (opcional, rode depois):
--
--   select count(*) from public.orcamento_pacotes;              -- 0, tabela nova
--   \d public.orcamento_pacotes                                 -- estrutura
--
-- O índice de destaque deve aparecer como:
--   "orcamento_pacotes_um_destaque_idx" UNIQUE, btree (orcamento_id) WHERE destaque
-- ===========================================================================
