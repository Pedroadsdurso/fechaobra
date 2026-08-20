import type { Tabela } from '@/lib/banco'
import type { Cliente } from '@/modules/clientes/tipos'

import type { PACOTES, STATUS_ORCAMENTO, TIPOS_ITEM } from './constantes'

export type Orcamento = Tabela<'orcamentos'>
export type ItemOrcamento = Tabela<'orcamento_itens'>
export type TextoPadrao = Tabela<'textos_padrao'>
export type EventoOrcamento = Tabela<'eventos_orcamento'>

export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number]['valor']
export type TipoItem = (typeof TIPOS_ITEM)[number]['valor']
export type Pacote = (typeof PACOTES)[number]['valor']

/**
 * Item como o editor manipula.
 *
 * O `id` aqui é gerado no navegador e não é o id do banco: itens novos ainda
 * não existem lá, e a lista precisa de chave estável para o React e para o
 * arrastar-e-soltar desde o primeiro caractere digitado. Quem persiste
 * reescreve a tabela inteira do orçamento a partir desta ordem.
 */
export type ItemEditor = {
  id: string
  descricao: string
  /** Texto cru do campo, não número: "2," é estado intermediário válido. */
  quantidade: string
  unidade: string
  valorUnitario: string
  tipo: TipoItem
  pacote: Pacote
}

/** Estado completo do editor. É o que vai e volta do autosave. */
export type RascunhoOrcamento = {
  id: string
  numero: number
  clienteId: string | null
  titulo: string
  tipoServico: string
  localServico: string
  validadeDias: string
  dataValidade: string
  prazoExecucao: string
  textoEscopo: string
  textoExclusoes: string
  textoGarantia: string
  textoCondicoesPagamento: string
  observacoes: string
  status: StatusOrcamento
  itens: ItemEditor[]
  pacotes: PacoteEditor[]
}

/** Rótulo e justificativa de um nível. O valor não mora aqui: vem dos itens. */
export type PacoteEditor = {
  nivel: Pacote
  rotulo: string
  descricao: string
  destaque: boolean
}

/**
 * Um pacote pronto para o documento: o rótulo e a frase vêm da tabela
 * orcamento_pacotes; o valor sai da soma acumulada dos itens de cada nível.
 *
 * Essencial   = itens marcados como essencial
 * Recomendado = Essencial + itens marcados como recomendado
 * Completo    = Recomendado + itens marcados como completo
 *
 * A soma fica derivada porque já está nos itens — guardar o número de novo só
 * criaria duas verdades. O que a soma não sabe dizer, e por isso é gravado, é
 * como o nível se chama e o que ele entrega a mais.
 */
export type PacoteDerivado = {
  nivel: Pacote
  rotulo: string
  descricao: string
  destaque: boolean
  /** Soma acumulada: cada nível inclui os anteriores. */
  valor: number
  /** Descrições dos itens que entram NESTE nível, para a lista do documento. */
  inclui: string[]
}

export type OrcamentoCarregado = {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
}

export type ItemBiblioteca = {
  id: string
  descricao: string
  unidade: string
  valorUnitario: number
  tipo: TipoItem
}

/** Os 4 textos do seed, na forma que o editor consome. */
export type TextosDoServico = {
  escopo: string
  exclusoes: string
  garantia: string
  condicoes: string
}

/** Retorno do autosave. Fora de acoes.ts: lá só podem morar funções async. */
export type ResultadoSalvar = {
  ok: boolean
  erro?: string
  /** Data de validade recalculada, para o editor exibir sem recarregar. */
  dataValidade?: string
  /** ids reais gravados, na ordem enviada. */
  idsItens?: string[]
}
