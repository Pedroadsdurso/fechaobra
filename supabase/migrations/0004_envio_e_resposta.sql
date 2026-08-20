-- ===========================================================================
-- FechaObra — 0004_envio_e_resposta.sql
--
-- Duas marcas de tempo que o ciclo do link público precisa e que hoje não têm
-- onde morar.
--
-- Por que não dá para derivar das colunas existentes:
--
--   atualizado_em  muda a cada tecla do autosave. Um orçamento enviado ontem e
--                  corrigido hoje perderia a data real de envio.
--   eventos_orcamento  só aceita 'visualizado', 'aceito' e 'recusado' — o
--                  envio não é evento do cliente, é ação do prestador.
--   snapshot_aceite  guarda O QUE foi aceito, não QUANDO. E fica nulo em
--                  orçamento recusado, que também precisa de data de resposta.
--
-- Rode DEPOIS de 0001, 0002 e 0003. Idempotente.
-- ===========================================================================

-- Quando o prestador enviou. Nulo enquanto for rascunho.
alter table public.orcamentos
  add column if not exists enviado_em timestamptz;

-- Quando o cliente respondeu — aceitando ou recusando. Nulo até lá.
alter table public.orcamentos
  add column if not exists respondido_em timestamptz;

comment on column public.orcamentos.enviado_em is
  'Momento em que o prestador enviou o orçamento ao cliente. Não confundir com atualizado_em, que muda a cada edição.';

comment on column public.orcamentos.respondido_em is
  'Momento da resposta do cliente pelo link público, seja aceite ou recusa.';


-- ---------------------------------------------------------------------------
-- Índice para a fila de trabalho da lista.
--
-- A tela de orçamentos ordena por "o que precisa de ação": aceito hoje,
-- visualizado sem resposta, vencendo. Todas essas perguntas passam por status
-- dentro de um usuário.
-- ---------------------------------------------------------------------------
create index if not exists orcamentos_user_id_status_idx
  on public.orcamentos (user_id, status);


-- ===========================================================================
-- Conferência (rode depois):
--
--   select column_name, data_type
--     from information_schema.columns
--    where table_name = 'orcamentos'
--      and column_name in ('enviado_em', 'respondido_em');
--
-- Devem aparecer as duas, como timestamp with time zone.
-- ===========================================================================
