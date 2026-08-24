-- ===========================================================================
-- FechaObra — 0010_motivo_duvida.sql
--
-- O motivo da dúvida do cliente, capturado no caminho do "Tenho uma dúvida".
--
-- ---------------------------------------------------------------------------
-- POR QUE 'duvida' E NÃO 'recusado'
-- ---------------------------------------------------------------------------
-- `aceite.tsx` registra a decisão de nunca oferecer "Recusar": recusa
-- explícita encerra a conversa e não deixa nada para o prestador fazer, e a
-- maior parte das recusas em obra é dúvida não respondida, não desinteresse.
--
-- Esta migration não desfaz isso. O evento novo é 'duvida', que é o que de
-- fato acontece: o cliente parou antes de decidir e disse o que travou. Motivo
-- dado com a conversa viva serve para fechar a venda; motivo dado num botão de
-- recusa é autópsia.
--
-- CONSEQUÊNCIA QUE VALE ESCREVER: o status do orçamento NÃO muda. Continua
-- 'enviado' ou 'visualizado'. É por isso que não há coluna nova em
-- `orcamentos` aqui — dúvida não é resposta do cliente, então `respondido_em`
-- também continua nulo. Quem for mexer nisto depois: mudar o status faria o
-- orçamento sair da fila de trabalho do prestador exatamente no momento em que
-- ele mais precisa aparecer nela.
-- ---------------------------------------------------------------------------
--
-- Rode DEPOIS de 0001. Idempotente.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. As colunas.
--
-- Duas, não uma. `motivo` é a categoria de um toque, que é o que quase todo
-- mundo vai responder e o único campo agrupável ("40% param no preço").
-- `motivo_texto` é o campo livre, que é onde mora a informação que ainda não
-- sabemos categorizar — e a fonte da Etapa A quando a IA entrar.
-- ---------------------------------------------------------------------------
alter table public.eventos_orcamento
  add column if not exists motivo text;

alter table public.eventos_orcamento
  add column if not exists motivo_texto text;

comment on column public.eventos_orcamento.motivo is
  'Categoria da dúvida do cliente: preco, prazo, escopo ou outro. Só em eventos tipo=duvida.';

comment on column public.eventos_orcamento.motivo_texto is
  'O que o cliente escreveu, até 200 caracteres. Opcional mesmo quando há categoria.';


-- ---------------------------------------------------------------------------
-- 2. O tipo novo.
--
-- A constraint de 0001 aceitava só 'visualizado', 'aceito' e 'recusado'.
-- 'recusado' FICA: o prestador ainda marca recusa à mão no painel quando o
-- cliente responde por fora. O que não existe é o botão de recusar no link.
--
-- Constraint não tem "add if not exists", então derruba e recria — que é
-- idempotente do mesmo jeito e deixa o estado final explícito, em vez de
-- depender do que já estava lá.
-- ---------------------------------------------------------------------------
alter table public.eventos_orcamento
  drop constraint if exists eventos_orcamento_tipo_valido;

alter table public.eventos_orcamento
  add constraint eventos_orcamento_tipo_valido check (
    tipo in ('visualizado', 'aceito', 'recusado', 'duvida')
  );


-- ---------------------------------------------------------------------------
-- 3. As regras do motivo.
--
-- A lista fechada de categorias vive AQUI, e não só no TypeScript, porque a
-- inserção é feita pelo service role numa rota pública: o que chega no corpo
-- do POST é do cliente final, e a última linha de defesa contra um valor
-- inventado é o banco.
--
-- Os 200 caracteres também são cobrados aqui pelo mesmo motivo. O formulário
-- limita, mas formulário é sugestão para quem monta a requisição na mão.
-- ---------------------------------------------------------------------------
alter table public.eventos_orcamento
  drop constraint if exists eventos_motivo_valido;

alter table public.eventos_orcamento
  add constraint eventos_motivo_valido check (
    motivo is null or motivo in ('preco', 'prazo', 'escopo', 'outro')
  );

alter table public.eventos_orcamento
  drop constraint if exists eventos_motivo_texto_curto;

alter table public.eventos_orcamento
  add constraint eventos_motivo_texto_curto check (
    motivo_texto is null or char_length(motivo_texto) <= 200
  );

/*
  Motivo só existe em evento de dúvida.

  Sem isto, nada impediria um 'visualizado' de nascer com motivo preenchido —
  e como a leitura do painel vai buscar "o último evento com motivo", uma linha
  dessas apareceria no cartão como se fosse dúvida do cliente. Barato de
  garantir agora, caro de descobrir depois.

  As linhas que já existem passam: todas têm motivo nulo.
*/
alter table public.eventos_orcamento
  drop constraint if exists eventos_motivo_so_em_duvida;

alter table public.eventos_orcamento
  add constraint eventos_motivo_so_em_duvida check (
    tipo = 'duvida' or (motivo is null and motivo_texto is null)
  );


-- ---------------------------------------------------------------------------
-- 4. Índice: nenhum.
--
-- A leitura do painel é "a última dúvida de cada orçamento desta página".
-- `eventos_orcamento_orcamento_id_criado_em_idx` (orcamento_id, criado_em desc),
-- de 0001, já atende: o filtro por orcamento_id usa o índice e a ordenação sai
-- de graça. Um índice parcial em tipo='duvida' só se pagaria com a tabela
-- grande e a maioria dos eventos sendo de outro tipo — não é o caso, e índice
-- que não se paga é escrita mais lenta em toda visualização.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 5. RLS: nada a fazer, e isso é resultado, não esquecimento.
--
-- A policy "eventos: dono do orcamento lê" já cobre as colunas novas — policy
-- de RLS vale para a linha, não para a coluna. O prestador enxerga a dúvida do
-- próprio orçamento e de nenhum outro, e `anon` continua sem permissão: a
-- gravação vem do service role na rota pública, igual ao aceite.
-- ---------------------------------------------------------------------------


-- Conferência: deve devolver as quatro constraints e as duas colunas.
--
--   select conname from pg_constraint
--    where conrelid = 'public.eventos_orcamento'::regclass and contype = 'c'
--    order by conname;
--
--   select column_name, data_type from information_schema.columns
--    where table_name = 'eventos_orcamento' and column_name like 'motivo%';
