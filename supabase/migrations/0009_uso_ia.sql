-- ===========================================================================
-- FechaObra — 0009_uso_ia.sql
--
-- Toda chamada ao Gemini, com ou sem sucesso.
--
-- Serve a três coisas de uma vez:
--
--   1. RATE LIMIT POR USUÁRIO. A cota da camada gratuita é POR PROJETO
--      (confirmado na doc oficial do Gemini), então um prestador sozinho pode
--      queimar o dia de todos. O limite tem que ser por usuário, e tem que
--      viver no banco: o limite-taxa.ts existente é em memória e vale por
--      instância serverless — três instâncias significam três vezes o limite,
--      e um reinício zera a contagem. Para conter cota compartilhada isso não
--      serve.
--
--   2. VER A COTA APERTANDO. Falha por 429 fica registrada com o motivo. Sem
--      isso, "o assistente parou de funcionar" chega por reclamação de
--      usuário, não por observação.
--
--   3. CUSTO POR USO. tokens de entrada e saída por chamada, para dimensionar
--      a migração para a camada paga quando houver receita.
--
-- NÃO GUARDA O CONTEÚDO. Nem o prompt, nem a resposta. O que sai daqui para o
-- Gemini já é minimizado por lista de inclusão; guardar cópia no banco criaria
-- um segundo lugar com o mesmo dado e nenhum ganho.
--
-- Rode DEPOIS de 0001 a 0008. Idempotente.
-- ===========================================================================

create table if not exists public.uso_ia (
  id            uuid primary key default gen_random_uuid(),

  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Qual chamada: 'texto_escopo', 'texto_exclusoes', 'texto_garantia',
  -- 'texto_condicoes', 'orcamento_por_comando'. Texto solto pelo mesmo motivo
  -- de recursos_liberados: recurso novo não deve exigir migration.
  recurso       text not null,

  modelo        text,

  tokens_entrada integer,
  tokens_saida   integer,

  sucesso       boolean not null,

  /*
    O motivo quando falhou: 'cota' (429), 'timeout', 'resposta_invalida',
    'erro_rede', 'sem_chave'. É por aqui que se enxerga a cota apertando antes
    de o usuário reclamar.
  */
  motivo_falha  text,

  -- Quanto a chamada demorou. Chamada lenta em 4G é abandono.
  duracao_ms    integer,

  criado_em     timestamptz not null default now()
);

/*
  O índice que o rate limit usa: "quantas chamadas este usuário fez na última
  hora / no último dia". Sem ele, cada verificação varre a tabela inteira — e
  ela cresce a cada clique no botão de gerar.
*/
create index if not exists uso_ia_usuario_janela_idx
  on public.uso_ia (user_id, criado_em desc);

-- Para eu olhar as falhas sem varrer o sucesso.
create index if not exists uso_ia_falhas_idx
  on public.uso_ia (criado_em desc)
  where not sucesso;

comment on table public.uso_ia is
  'Uma linha por chamada ao Gemini. Rate limit por usuário, visibilidade da cota e custo. Não guarda conteúdo.';


-- ---------------------------------------------------------------------------
-- RLS — ninguém lê pelo app.
--
-- Sem policy nenhuma, o RLS nega tudo para anon e authenticated. Só o service
-- role escreve e lê, e é ele que a Server Action usa para contar a janela.
--
-- O usuário não precisa ver isto: se ele estourar o limite, a mensagem na tela
-- diz o que fazer, e o número em si é operação nossa.
-- ---------------------------------------------------------------------------
alter table public.uso_ia enable row level security;


-- ===========================================================================
-- Conferência (rode depois):
--
--   select relrowsecurity from pg_class where relname = 'uso_ia';   -- true
--   select count(*) from pg_policies where tablename = 'uso_ia';    -- 0
--
-- E, depois que a IA estiver em uso, o painel de cota:
--
--   select date_trunc('day', criado_em) as dia,
--          count(*) filter (where sucesso)        as ok,
--          count(*) filter (where not sucesso)    as falhas,
--          count(*) filter (where motivo_falha = 'cota') as por_cota,
--          sum(tokens_entrada + tokens_saida)     as tokens
--     from public.uso_ia
--    group by 1 order by 1 desc limit 14;
-- ===========================================================================
