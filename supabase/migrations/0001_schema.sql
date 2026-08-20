-- ===========================================================================
-- FechaObra — 0001_schema.sql
-- Fase 0: tabelas, índices, RLS, triggers de perfil e de numeração.
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute uma vez.
-- É idempotente o suficiente para reexecutar em projeto limpo.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Utilitário: manter atualizado_em sempre correto
-- ---------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. perfis — dados da empresa do prestador (1 por usuário)
--    proximo_numero é o contador da numeração sequencial POR usuário.
-- ---------------------------------------------------------------------------
create table if not exists public.perfis (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users(id) on delete cascade,
  nome_empresa   text not null default '',
  logo_url       text,
  cor_primaria   text not null default '#1F2937',
  responsavel    text,
  telefone       text,
  email          text,
  cnpj_cpf       text,
  endereco       text,
  nicho          text not null default 'obra_reforma',
  proximo_numero integer not null default 1,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint perfis_proximo_numero_positivo check (proximo_numero >= 1)
);

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 3. clientes
-- ---------------------------------------------------------------------------
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  telefone      text,
  email         text,
  endereco      text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists clientes_user_id_idx on public.clientes (user_id);
create index if not exists clientes_user_id_nome_idx on public.clientes (user_id, nome);

drop trigger if exists clientes_atualizado_em on public.clientes;
create trigger clientes_atualizado_em
  before update on public.clientes
  for each row execute function public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 4. orcamentos
-- ---------------------------------------------------------------------------
create table if not exists public.orcamentos (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  cliente_id                uuid references public.clientes(id) on delete set null,
  numero                    integer not null,
  titulo                    text not null default '',
  tipo_servico              text,
  local_servico             text,
  status                    text not null default 'rascunho',
  validade_dias             integer not null default 15,
  data_validade             date,
  prazo_execucao            text,
  texto_escopo              text,
  texto_exclusoes           text,
  texto_garantia            text,
  texto_condicoes_pagamento text,
  observacoes               text,
  token_publico             uuid not null default gen_random_uuid(),
  snapshot_aceite           jsonb,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  constraint orcamentos_status_valido check (
    status in ('rascunho', 'enviado', 'visualizado', 'aceito', 'recusado', 'expirado')
  ),
  constraint orcamentos_validade_dias_positiva check (validade_dias > 0),
  constraint orcamentos_numero_unico_por_usuario unique (user_id, numero)
);

-- Índices pedidos explicitamente
create unique index if not exists orcamentos_token_publico_idx on public.orcamentos (token_publico);
create index if not exists orcamentos_user_id_idx on public.orcamentos (user_id);
create index if not exists orcamentos_cliente_id_idx on public.orcamentos (cliente_id);
-- Listagem da dashboard: "meus orçamentos, mais recentes primeiro"
create index if not exists orcamentos_user_id_criado_em_idx on public.orcamentos (user_id, criado_em desc);

drop trigger if exists orcamentos_atualizado_em on public.orcamentos;
create trigger orcamentos_atualizado_em
  before update on public.orcamentos
  for each row execute function public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 5. orcamento_itens
-- ---------------------------------------------------------------------------
create table if not exists public.orcamento_itens (
  id             uuid primary key default gen_random_uuid(),
  orcamento_id   uuid not null references public.orcamentos(id) on delete cascade,
  descricao      text not null,
  quantidade     numeric(12, 3) not null default 1,
  unidade        text not null default 'un',
  valor_unitario numeric(12, 2) not null default 0,
  tipo           text not null default 'mao_de_obra',
  pacote         text not null default 'essencial',
  ordem          integer not null default 0,
  criado_em      timestamptz not null default now(),
  constraint orcamento_itens_tipo_valido check (tipo in ('material', 'mao_de_obra')),
  constraint orcamento_itens_pacote_valido check (pacote in ('essencial', 'recomendado', 'completo')),
  constraint orcamento_itens_quantidade_positiva check (quantidade > 0),
  constraint orcamento_itens_valor_nao_negativo check (valor_unitario >= 0)
);

create index if not exists orcamento_itens_orcamento_id_idx on public.orcamento_itens (orcamento_id);
create index if not exists orcamento_itens_orcamento_id_ordem_idx on public.orcamento_itens (orcamento_id, ordem);


-- ---------------------------------------------------------------------------
-- 6. itens_biblioteca — catálogo pessoal de itens para reuso
-- ---------------------------------------------------------------------------
create table if not exists public.itens_biblioteca (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  descricao      text not null,
  unidade        text not null default 'un',
  valor_unitario numeric(12, 2) not null default 0,
  tipo           text not null default 'mao_de_obra',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint itens_biblioteca_tipo_valido check (tipo in ('material', 'mao_de_obra')),
  constraint itens_biblioteca_valor_nao_negativo check (valor_unitario >= 0)
);

create index if not exists itens_biblioteca_user_id_idx on public.itens_biblioteca (user_id);

drop trigger if exists itens_biblioteca_atualizado_em on public.itens_biblioteca;
create trigger itens_biblioteca_atualizado_em
  before update on public.itens_biblioteca
  for each row execute function public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 7. textos_padrao — tabela GLOBAL de seed (sem user_id)
-- ---------------------------------------------------------------------------
create table if not exists public.textos_padrao (
  id           uuid primary key default gen_random_uuid(),
  nicho        text not null default 'obra_reforma',
  tipo_servico text not null,
  tipo_texto   text not null,
  conteudo     text not null,
  criado_em    timestamptz not null default now(),
  constraint textos_padrao_tipo_texto_valido check (
    tipo_texto in ('escopo', 'exclusoes', 'garantia', 'condicoes')
  ),
  constraint textos_padrao_unico unique (nicho, tipo_servico, tipo_texto)
);

create index if not exists textos_padrao_nicho_tipo_servico_idx
  on public.textos_padrao (nicho, tipo_servico);


-- ---------------------------------------------------------------------------
-- 8. eventos_orcamento — trilha de auditoria do link público
--    Escrita na Fase 1 pelo servidor (service role, que ignora RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.eventos_orcamento (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo         text not null,
  nome_aceite  text,
  ip           text,
  user_agent   text,
  criado_em    timestamptz not null default now(),
  constraint eventos_orcamento_tipo_valido check (
    tipo in ('visualizado', 'aceito', 'recusado')
  )
);

create index if not exists eventos_orcamento_orcamento_id_idx on public.eventos_orcamento (orcamento_id);
create index if not exists eventos_orcamento_orcamento_id_criado_em_idx
  on public.eventos_orcamento (orcamento_id, criado_em desc);


-- ===========================================================================
-- 9. CRIAÇÃO AUTOMÁTICA DO PERFIL
--    Dispara em auth.users, não na aplicação. Se o usuário fechar a aba no
--    meio do cadastro, o perfil já existe — não fica conta órfã, e o trigger
--    de numeração nunca encontra perfil ausente.
--    SECURITY DEFINER porque roda no contexto do cadastro, antes de existir
--    uma sessão autenticada que satisfaça o RLS de perfis.
-- ===========================================================================
create or replace function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (user_id, nome_empresa, email, responsavel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome_empresa', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'responsavel', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();

-- Cobre usuários que já existiam antes desta migration rodar.
insert into public.perfis (user_id, email)
select u.id, u.email
from auth.users u
on conflict (user_id) do nothing;


-- ===========================================================================
-- 10. NUMERAÇÃO SEQUENCIAL POR USUÁRIO
--     Usa UPDATE ... RETURNING sobre a linha do perfil: o próprio UPDATE
--     tira o lock da linha e devolve o valor no mesmo comando, de forma
--     atômica. Dois orçamentos criados no mesmo instante pegam números
--     diferentes — o segundo espera o commit do primeiro.
--     MAX(numero)+1 NÃO teria essa garantia: as duas transações leriam o
--     mesmo máximo e gerariam número duplicado.
--     Aproveita para calcular data_validade a partir de validade_dias.
-- ===========================================================================
create or replace function public.definir_numero_orcamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  if new.numero is null then
    update public.perfis
       set proximo_numero = proximo_numero + 1
     where user_id = new.user_id
    returning proximo_numero - 1 into v_numero;

    -- Rede de segurança: perfil inexistente (usuário criado fora do fluxo
    -- normal). Cria na hora em vez de derrubar o insert do orçamento.
    if v_numero is null then
      insert into public.perfis (user_id, proximo_numero)
      values (new.user_id, 2)
      on conflict (user_id) do update
        set proximo_numero = public.perfis.proximo_numero + 1
      returning proximo_numero - 1 into v_numero;
    end if;

    new.numero := v_numero;
  end if;

  if new.data_validade is null then
    new.data_validade := (current_date + new.validade_dias);
  end if;

  return new;
end;
$$;

drop trigger if exists orcamentos_definir_numero on public.orcamentos;
create trigger orcamentos_definir_numero
  before insert on public.orcamentos
  for each row execute function public.definir_numero_orcamento();


-- ===========================================================================
-- 11. RLS — ativado em TODAS as tabelas
--     Padrão: cada usuário só enxerga as próprias linhas.
--     (select auth.uid()) em vez de auth.uid() — o Postgres avalia uma vez
--     por consulta em vez de uma vez por linha.
-- ===========================================================================
alter table public.perfis             enable row level security;
alter table public.clientes           enable row level security;
alter table public.orcamentos         enable row level security;
alter table public.orcamento_itens    enable row level security;
alter table public.itens_biblioteca   enable row level security;
alter table public.textos_padrao      enable row level security;
alter table public.eventos_orcamento  enable row level security;

-- ------------------------------- perfis ------------------------------------
-- Sem policy de INSERT: quem cria perfil é o trigger. Sem policy de DELETE:
-- o perfil morre junto com a conta, por cascade.
drop policy if exists "perfis: dono lê" on public.perfis;
create policy "perfis: dono lê" on public.perfis
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "perfis: dono atualiza" on public.perfis;
create policy "perfis: dono atualiza" on public.perfis
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------ clientes -----------------------------------
drop policy if exists "clientes: dono lê" on public.clientes;
create policy "clientes: dono lê" on public.clientes
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "clientes: dono insere" on public.clientes;
create policy "clientes: dono insere" on public.clientes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "clientes: dono atualiza" on public.clientes;
create policy "clientes: dono atualiza" on public.clientes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "clientes: dono apaga" on public.clientes;
create policy "clientes: dono apaga" on public.clientes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ----------------------------- orcamentos ----------------------------------
drop policy if exists "orcamentos: dono lê" on public.orcamentos;
create policy "orcamentos: dono lê" on public.orcamentos
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "orcamentos: dono insere" on public.orcamentos;
create policy "orcamentos: dono insere" on public.orcamentos
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "orcamentos: dono atualiza" on public.orcamentos;
create policy "orcamentos: dono atualiza" on public.orcamentos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "orcamentos: dono apaga" on public.orcamentos;
create policy "orcamentos: dono apaga" on public.orcamentos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -------------------------- orcamento_itens --------------------------------
-- Não tem user_id: a dona da linha é a do orçamento pai.
drop policy if exists "itens: dono do orcamento lê" on public.orcamento_itens;
create policy "itens: dono do orcamento lê" on public.orcamento_itens
  for select to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "itens: dono do orcamento insere" on public.orcamento_itens;
create policy "itens: dono do orcamento insere" on public.orcamento_itens
  for insert to authenticated
  with check (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "itens: dono do orcamento atualiza" on public.orcamento_itens;
create policy "itens: dono do orcamento atualiza" on public.orcamento_itens
  for update to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.user_id = (select auth.uid())
  ));

drop policy if exists "itens: dono do orcamento apaga" on public.orcamento_itens;
create policy "itens: dono do orcamento apaga" on public.orcamento_itens
  for delete to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and o.user_id = (select auth.uid())
  ));

-- -------------------------- itens_biblioteca -------------------------------
drop policy if exists "biblioteca: dono lê" on public.itens_biblioteca;
create policy "biblioteca: dono lê" on public.itens_biblioteca
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "biblioteca: dono insere" on public.itens_biblioteca;
create policy "biblioteca: dono insere" on public.itens_biblioteca
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "biblioteca: dono atualiza" on public.itens_biblioteca;
create policy "biblioteca: dono atualiza" on public.itens_biblioteca
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "biblioteca: dono apaga" on public.itens_biblioteca;
create policy "biblioteca: dono apaga" on public.itens_biblioteca
  for delete to authenticated using ((select auth.uid()) = user_id);

-- --------------------------- textos_padrao ---------------------------------
-- Global e somente leitura para quem está logado. Ninguém escreve pela API:
-- o conteúdo vem do seed (0002), rodado no SQL Editor.
drop policy if exists "textos_padrao: autenticado lê" on public.textos_padrao;
create policy "textos_padrao: autenticado lê" on public.textos_padrao
  for select to authenticated using (true);

-- --------------------------- eventos_orcamento -----------------------------
-- Só leitura, e só do dono do orçamento. A escrita acontece na Fase 1, no
-- servidor, com service role — que ignora RLS. Por isso não há policy de
-- INSERT aqui: nenhum cliente do navegador pode forjar um "aceito".
drop policy if exists "eventos: dono do orcamento lê" on public.eventos_orcamento;
create policy "eventos: dono do orcamento lê" on public.eventos_orcamento
  for select to authenticated
  using (exists (
    select 1 from public.orcamentos o
    where o.id = eventos_orcamento.orcamento_id
      and o.user_id = (select auth.uid())
  ));


-- ===========================================================================
-- 12. Blindagem extra: a role anônima não tem nada aqui.
--     A leitura pública do orçamento por token_publico é da Fase 1 e vai ser
--     feita por route handler no servidor com service role — não abrindo RLS.
-- ===========================================================================
revoke all on public.perfis            from anon;
revoke all on public.clientes          from anon;
revoke all on public.orcamentos        from anon;
revoke all on public.orcamento_itens   from anon;
revoke all on public.itens_biblioteca  from anon;
revoke all on public.textos_padrao     from anon;
revoke all on public.eventos_orcamento from anon;
