-- ===========================================================================
-- FechaObra — 0005_tratado.sql
--
-- Saída da fila de trabalho.
--
-- Sem isto, todo orçamento aceito fica no topo da lista para sempre. Com um ou
-- dois, funciona; com quinze aceitos no histórico, a fila entope exatamente
-- com o que já foi resolvido — e a tela perde a função no mês em que o
-- prestador começa a usar de verdade.
--
-- NÃO É UM STATUS NOVO. O orçamento continua 'aceito': o acordo não mudou,
-- o snapshot não mudou, o cliente não viu diferença nenhuma. A coluna só
-- responde a uma pergunta interna do prestador — "já combinei o início com
-- essa pessoa?" — e é isso que tira o item da fila.
--
-- Modelar como status seria errado por dois motivos: poluiria a máquina de
-- estados que o cliente enxerga, e obrigaria a inventar transições de volta
-- ('aceito' -> 'tratado' -> 'aceito'?) para algo que é só um marcador
-- reversível. Timestamp nulável resolve: nulo é "ainda na fila", preenchido é
-- "já cuidei", e desfazer é voltar para nulo.
--
-- Rode DEPOIS de 0001 a 0004. Idempotente.
-- ===========================================================================

alter table public.orcamentos
  add column if not exists tratado_em timestamptz;

comment on column public.orcamentos.tratado_em is
  'Quando o prestador marcou que já deu andamento ao orçamento aceito. Nulo = ainda na fila de trabalho. Não é status: o orçamento segue aceito.';


-- ===========================================================================
-- Conferência (rode depois):
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'orcamentos' and column_name = 'tratado_em';
--
-- Deve aparecer como timestamp with time zone, nullable YES.
-- ===========================================================================
