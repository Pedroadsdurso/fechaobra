import 'server-only'

import { criarClienteServidor } from '@/lib/supabase/servidor'
import type { Cliente } from '@/modules/clientes/tipos'

import { pacotesPadrao } from './calculos'
import { NICHO_PADRAO, TIPOS_SERVICO, VALIDADE_PADRAO_DIAS } from './constantes'
import type {
  ItemBiblioteca,
  ItemEditor,
  OrcamentoCarregado,
  Pacote,
  PacoteEditor,
  StatusOrcamento,
  TextosDoServico,
  TipoItem,
} from './tipos'

/** Número vindo do banco (numeric) chega como string ou number conforme o driver. */
function paraTexto(valor: unknown) {
  if (valor === null || valor === undefined) return ''
  return String(valor)
}

/**
 * Carrega um orçamento inteiro — cabeçalho, itens e cliente — em duas idas ao
 * banco, e devolve já no formato que o editor manipula.
 */
export async function carregarOrcamento(id: string): Promise<OrcamentoCarregado | null> {
  const supabase = await criarClienteServidor()

  const { data: orcamento } = await supabase
    .from('orcamentos')
    .select(
      `id, numero, cliente_id, titulo, tipo_servico, local_servico, status,
       validade_dias, data_validade, prazo_execucao, texto_escopo, texto_exclusoes,
       texto_garantia, texto_condicoes_pagamento, observacoes,
       clientes ( id, nome, telefone, email, endereco )`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!orcamento) return null

  const { data: itens } = await supabase
    .from('orcamento_itens')
    .select('id, descricao, quantidade, unidade, valor_unitario, tipo, pacote, ordem')
    .eq('orcamento_id', id)
    .order('ordem', { ascending: true })

  const { data: pacotesGravados } = await supabase
    .from('orcamento_pacotes')
    .select('nivel, rotulo, descricao, destaque')
    .eq('orcamento_id', id)

  // Orçamento que nunca usou pacotes não tem linha nenhuma. Em vez de deixar
  // o editor vazio, começa com os padrões — a pessoa edita a partir de algo.
  const pacotes: PacoteEditor[] =
    pacotesGravados && pacotesGravados.length > 0
      ? pacotesPadrao().map((padrao) => {
          const gravado = pacotesGravados.find((p) => p.nivel === padrao.nivel)
          return gravado
            ? {
                nivel: padrao.nivel,
                rotulo: gravado.rotulo || padrao.rotulo,
                descricao: gravado.descricao || padrao.descricao,
                destaque: gravado.destaque,
              }
            : padrao
        })
      : pacotesPadrao()

  const itensEditor: ItemEditor[] = (itens ?? []).map((i) => ({
    id: i.id,
    descricao: i.descricao,
    quantidade: paraTexto(i.quantidade),
    unidade: i.unidade,
    valorUnitario: paraTexto(i.valor_unitario),
    tipo: i.tipo as TipoItem,
    pacote: i.pacote as Pacote,
  }))

  const bruto = orcamento as unknown as {
    clientes: Cliente | Cliente[] | null
  }
  const clienteBruto = Array.isArray(bruto.clientes) ? bruto.clientes[0] : bruto.clientes

  const cliente: Cliente | null = clienteBruto
    ? {
        id: clienteBruto.id,
        nome: clienteBruto.nome,
        telefone: clienteBruto.telefone ?? '',
        email: clienteBruto.email ?? '',
        endereco: clienteBruto.endereco ?? '',
      }
    : null

  return {
    cliente,
    rascunho: {
      id: orcamento.id,
      numero: orcamento.numero,
      clienteId: orcamento.cliente_id,
      titulo: orcamento.titulo ?? '',
      tipoServico: orcamento.tipo_servico ?? '',
      localServico: orcamento.local_servico ?? '',
      validadeDias: paraTexto(orcamento.validade_dias ?? VALIDADE_PADRAO_DIAS),
      dataValidade: orcamento.data_validade ?? '',
      prazoExecucao: orcamento.prazo_execucao ?? '',
      textoEscopo: orcamento.texto_escopo ?? '',
      textoExclusoes: orcamento.texto_exclusoes ?? '',
      textoGarantia: orcamento.texto_garantia ?? '',
      textoCondicoesPagamento: orcamento.texto_condicoes_pagamento ?? '',
      observacoes: orcamento.observacoes ?? '',
      status: orcamento.status as StatusOrcamento,
      itens: itensEditor,
      pacotes,
    },
  }
}

/**
 * Busca os 4 textos do seed para um tipo de serviço.
 *
 * textos_padrao é global e liberado para leitura de qualquer autenticado, então
 * não há filtro por usuário aqui — é catálogo, não dado de ninguém.
 */
export async function carregarTextosPadrao(tipoServico: string): Promise<TextosDoServico | null> {
  if (!tipoServico) return null

  const supabase = await criarClienteServidor()
  const { data } = await supabase
    .from('textos_padrao')
    .select('tipo_texto, conteudo')
    .eq('nicho', NICHO_PADRAO)
    .eq('tipo_servico', tipoServico)

  if (!data || data.length === 0) return null

  const porTipo = Object.fromEntries(data.map((t) => [t.tipo_texto, t.conteudo]))

  return {
    escopo: porTipo.escopo ?? '',
    exclusoes: porTipo.exclusoes ?? '',
    garantia: porTipo.garantia ?? '',
    condicoes: porTipo.condicoes ?? '',
  }
}

export async function listarItensBiblioteca(): Promise<ItemBiblioteca[]> {
  const supabase = await criarClienteServidor()

  const { data } = await supabase
    .from('itens_biblioteca')
    .select('id, descricao, unidade, valor_unitario, tipo')
    .order('descricao', { ascending: true })

  return (data ?? []).map((i) => ({
    id: i.id,
    descricao: i.descricao,
    unidade: i.unidade,
    valorUnitario: Number(i.valor_unitario),
    tipo: i.tipo as TipoItem,
  }))
}

export type OrcamentoNaLista = {
  id: string
  numero: number
  titulo: string
  tipoServicoRotulo: string
  status: StatusOrcamento
  dataValidade: string | null
  atualizadoEm: string
  enviadoEm: string | null
  respondidoEm: string | null
  /** Quando o prestador marcou que já deu andamento. Nulo = ainda na fila. */
  tratadoEm: string | null
  /** Quando o cliente abriu pela primeira vez. Nulo se nunca abriu. */
  visualizadoEm: string | null
  clienteNome: string
  clienteTelefone: string
  total: number
  quantidadeItens: number
  /** Sem cliente e sem item: rascunho que nunca virou nada. */
  vazio: boolean
  /**
   * Endereço que o cliente informou no aceite, quando diferente do cadastro.
   * Nulo quando bate ou quando não houve aceite.
   */
  enderecoDivergente: string | null
}

/**
 * A lista da tela de trabalho.
 *
 * Traz o que responde "o que eu faço agora": além do estado, QUANDO ele
 * começou. "visualizado" é status; "visualizado há 4 dias" é uma tarefa.
 *
 * Os agregados vêm em consultas separadas e são casados aqui. PostgREST não
 * faz SUM agrupado nem "último evento por grupo" sem uma view, e criar views
 * para isso nesta escala seria mais schema do que o problema pede.
 */
export async function listarOrcamentos(): Promise<OrcamentoNaLista[]> {
  const supabase = await criarClienteServidor()

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select(
      `id, numero, titulo, tipo_servico, status, data_validade, atualizado_em,
       enviado_em, respondido_em, tratado_em, snapshot_aceite,
       clientes ( nome, telefone, endereco )`,
    )
    .order('atualizado_em', { ascending: false })

  if (!orcamentos || orcamentos.length === 0) return []

  const ids = orcamentos.map((o) => o.id)

  const [{ data: itens }, { data: eventos }] = await Promise.all([
    supabase
      .from('orcamento_itens')
      .select('orcamento_id, quantidade, valor_unitario')
      .in('orcamento_id', ids),
    supabase
      .from('eventos_orcamento')
      .select('orcamento_id, tipo, criado_em')
      .in('orcamento_id', ids)
      .eq('tipo', 'visualizado')
      .order('criado_em', { ascending: true }),
  ])

  const porOrcamento = new Map<string, { total: number; quantidade: number }>()
  for (const item of itens ?? []) {
    const atual = porOrcamento.get(item.orcamento_id) ?? { total: 0, quantidade: 0 }
    atual.total += Number(item.quantidade) * Number(item.valor_unitario)
    atual.quantidade += 1
    porOrcamento.set(item.orcamento_id, atual)
  }

  // Ordenado por criado_em ascendente, então o primeiro que entra no mapa é a
  // PRIMEIRA visualização — que é a que interessa para contar o tempo parado.
  const primeiraVisualizacao = new Map<string, string>()
  for (const evento of eventos ?? []) {
    if (!primeiraVisualizacao.has(evento.orcamento_id)) {
      primeiraVisualizacao.set(evento.orcamento_id, evento.criado_em)
    }
  }

  return orcamentos.map((o) => {
    const bruto = o as unknown as {
      clientes: { nome: string; telefone: string | null; endereco: string | null } | null
      snapshot_aceite: { aceite?: { endereco?: string | null } } | null
    }
    const cliente = Array.isArray(bruto.clientes) ? bruto.clientes[0] : bruto.clientes
    const agregado = porOrcamento.get(o.id) ?? { total: 0, quantidade: 0 }

    // O que o cliente informou no aceite pode não ser o que estava no cadastro.
    // O prestador precisa saber ANTES de emitir a nota, não na hora.
    const enderecoAceite = bruto.snapshot_aceite?.aceite?.endereco?.trim() || ''
    const enderecoCadastro = cliente?.endereco?.trim() || ''
    const enderecoDivergente =
      enderecoAceite && enderecoAceite !== enderecoCadastro ? enderecoAceite : null

    return {
      id: o.id,
      numero: o.numero,
      titulo: o.titulo ?? '',
      tipoServicoRotulo: TIPOS_SERVICO.find((t) => t.valor === o.tipo_servico)?.rotulo ?? '',
      status: o.status as StatusOrcamento,
      dataValidade: o.data_validade,
      atualizadoEm: o.atualizado_em,
      enviadoEm: o.enviado_em,
      respondidoEm: o.respondido_em,
      tratadoEm: o.tratado_em,
      visualizadoEm: primeiraVisualizacao.get(o.id) ?? null,
      clienteNome: cliente?.nome ?? '',
      clienteTelefone: cliente?.telefone ?? '',
      total: agregado.total,
      quantidadeItens: agregado.quantidade,
      vazio: !cliente && agregado.quantidade === 0,
      enderecoDivergente,
    }
  })
}
