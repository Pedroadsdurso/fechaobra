-- ===========================================================================
-- FechaObra — 0008_recursos.sql
--
-- O que cada e-mail pode usar ALÉM do núcleo.
--
-- O vitalício de R$ 47 continua sendo `liberacoes`, e esta tabela NÃO o toca:
-- orçamento, PDF, aceite, rastreio e os 12 tipos de serviço são o que a página
-- de vendas promete hoje e permanecem completos para quem já comprou.
--
-- POR QUE UMA LINHA POR RECURSO, E NÃO UMA COLUNA POR RECURSO:
-- `has_audio_ai`, `has_contracts`, `has_profile` como colunas obrigariam uma
-- migration a cada recurso novo — e migration em produção é o passo mais caro
-- deste projeto. Com uma linha por par (e-mail, recurso), recurso novo é uma
-- string nova, sem tocar no schema.
--
-- Mesmo padrão de `liberacoes`: chave por e-mail, vínculo com a conta quando
-- ela existir, e escrita exclusiva do service role.
--
-- Rode DEPOIS de 0001 a 0007. Idempotente.
-- ===========================================================================

create table if not exists public.recursos_liberados (
  id            uuid primary key default gen_random_uuid(),

  -- Sempre minúsculo e sem espaço nas pontas, igual a `liberacoes`.
  email         text not null,

  -- Nulo até a conta existir: a compra chega antes do cadastro com frequência.
  user_id       uuid references auth.users(id) on delete set null,

  /*
    O identificador do recurso. Texto solto de propósito — ver o bloco acima.
    Em uso hoje: 'ia_textos', 'ia_orcamento', 'contratos', 'perfil_publico',
    'relatorio_mensal'. Não há check: recurso desconhecido deve ser
    investigado, não recusado na porta.
  */
  recurso       text not null,

  status        text not null default 'ativa',

  -- payload.data[0].id da compra que liberou. Nulo quando foi liberação manual.
  pedido_id     text,

  liberada_em   timestamptz not null default now(),
  revogada_em   timestamptz,
  motivo_revogacao text,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint recursos_status_valido check (status in ('ativa', 'revogada')),
  constraint recursos_email_normalizado check (email = lower(btrim(email))),
  constraint recursos_revogacao_coerente check (
    (status = 'revogada' and revogada_em is not null)
    or (status = 'ativa' and revogada_em is null)
  )
);

-- Um e-mail não pode ter o mesmo recurso duas vezes.
create unique index if not exists recursos_email_recurso_idx
  on public.recursos_liberados (email, recurso);

create index if not exists recursos_user_id_idx
  on public.recursos_liberados (user_id) where user_id is not null;

comment on table public.recursos_liberados is
  'Recursos além do núcleo de R$ 47. O vitalício continua em liberacoes e não é afetado.';


-- ---------------------------------------------------------------------------
-- RLS — o usuário lê os próprios recursos, e só lê.
--
-- Sem policy de escrita: quem pudesse inserir a própria linha se daria acesso
-- de graça. Escrita é só do service role (webhook e liberação manual).
-- ---------------------------------------------------------------------------
alter table public.recursos_liberados enable row level security;

drop policy if exists "usuario le os proprios recursos" on public.recursos_liberados;
create policy "usuario le os proprios recursos"
  on public.recursos_liberados for select
  to authenticated
  using (
    user_id = auth.uid()
    or email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );

drop trigger if exists recursos_tocar on public.recursos_liberados;
create trigger recursos_tocar
  before update on public.recursos_liberados
  for each row execute function public.tocar_liberacao();


-- ===========================================================================
-- LIBERAR OS RECURSOS DE IA PARA AS SUAS CONTAS (rode depois)
--
--   insert into public.recursos_liberados (email, user_id, recurso, pedido_id)
--   select lower(btrim(u.email)), u.id, r.recurso, 'manual-fundador'
--     from auth.users u
--    cross join (values ('ia_textos'), ('ia_orcamento')) as r(recurso)
--    where lower(u.email) in ('pedrodurso8@gmail.com', 'pedrodursoads@gmail.com')
--   on conflict (email, recurso) do update
--      set status = 'ativa', user_id = excluded.user_id,
--          revogada_em = null, motivo_revogacao = null;
--
--   select email, recurso, status from public.recursos_liberados order by email;
-- ===========================================================================
