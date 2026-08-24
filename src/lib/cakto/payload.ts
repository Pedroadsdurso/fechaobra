import type { Json } from '@/lib/tipos-banco'

/**
 * O que a Cakto manda, virado em itens.
 *
 * ===========================================================================
 * UM EVENTO NÃO É UMA COMPRA. É UM ENVELOPE DE COMPRAS.
 * ===========================================================================
 * A versão anterior deste código lia `payload.data[0]` e pronto. Estava
 * errada, e o erro só apareceria com dinheiro em jogo — medido no evento real
 * 8X7Zs1S, que está em eventos_cakto:
 *
 *     data[0]  Recuperação de Cliente   orderbump   pedido 5713ddd2-…
 *     data[1]  Orçamento com IA         orderbump   pedido 74c97f50-…
 *     data[2]  Contrato e Recibo        orderbump   pedido 7b07650f-…
 *     data[3]  FechaObra                main        pedido 22f8e1f3-…
 *
 * Três coisas nisso derrubam a leitura antiga:
 *
 * 1. São QUATRO pedidos, cada um com id próprio. Ler um item é ignorar três
 *    compras pagas.
 * 2. `data[0]` NÃO é o principal. A ordem não é garantida e, no evento medido,
 *    o principal é o ÚLTIMO. Quem quer o vitalício tem que procurar pelo
 *    product.id do FechaObra, nunca pela posição.
 * 3. O vitalício carimbado com o pedido errado é uma bomba-relógio: reembolso
 *    do bump de R$ 10,90 derrubaria o acesso de R$ 47 inteiro.
 *
 * Este módulo não decide nada sobre acesso. Ele só transforma o payload em
 * itens — e é de propósito que seja burro: o mesmo resultado alimenta o log
 * (uma linha por item) e a liberação, e os dois têm que enxergar a mesma
 * coisa. Quando divergirem, o log deixa de servir para explicar a liberação,
 * que é a única razão de o log existir.
 * ===========================================================================
 */

/** Um item de `data[]` — uma compra. */
export type ItemCakto = {
  /** `id` do item. É o pedido, e é ele que carimba liberação e revogação. */
  pedidoId: string
  /** `customer.email`, normalizado. O acesso é ligado por e-mail. */
  email: string
  /** `product.id` — o UUID. Nulo quando o payload não traz produto. */
  produtoId: string | null
  /** `product.name`. Só para o log dizer o que era, quando o UUID não está no mapa. */
  nomeProduto: string | null
  /** `offer.id` — o short id da oferta. Conferência humana, nunca decide nada. */
  ofertaId: string | null
  /** `main` | `orderbump`. Nulo em evento que não tem essa noção. */
  offerType: string | null
  /**
   * `parent_order` — o `refId` do item principal, repetido nos bumps.
   *
   * Vazio no próprio principal, e aqui vira nulo: vazio e ausente são a mesma
   * coisa, e manter os dois estados só cria caso a mais para todo mundo.
   *
   * CUIDADO: aponta para o `refId` do principal, não para o `id` dele. Juntar
   * por `parent_order = id` não casa nada — e não casar nada se parece com
   * "não havia bumps", que é o pior jeito de um defeito se esconder.
   */
  parentOrder: string | null
}

export type LeituraEvento = {
  /** Os itens aproveitáveis, na ordem em que a Cakto mandou. */
  itens: ItemCakto[]
  /** Quantos elementos `data[]` tinha ao todo. */
  total: number
  /**
   * Quantos elementos foram descartados por não terem id de pedido ou e-mail.
   *
   * Conta, e não some: `checkout_abandonment` chega assim (payload reduzido,
   * sem `id`), e é normal. Mas um `purchase_approved` com item descartado é
   * alguém que pagou e pode não receber — precisa aparecer na nota do evento
   * em vez de virar silêncio.
   */
  descartados: number
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function lerItem(bruto: unknown): ItemCakto | null {
  if (!bruto || typeof bruto !== 'object') return null
  const item = bruto as Record<string, unknown>

  const pedidoId = texto(item.id)

  const cliente = item.customer as Record<string, unknown> | undefined
  const email = texto(cliente?.email)?.toLowerCase() ?? null

  /*
    FALHA ALTA COM DADO INCOMPLETO — a mesma regra da versão anterior, agora
    por item. Sem pedido ou sem e-mail não há como liberar nem como revogar
    com precisão, e adivinhar qualquer um dos dois é como se dá acesso à
    pessoa errada ou se tira de quem pagou.
  */
  if (!pedidoId || !email) return null

  const produto = item.product as Record<string, unknown> | undefined
  const oferta = item.offer as Record<string, unknown> | undefined

  return {
    pedidoId,
    email,
    produtoId: texto(produto?.id),
    nomeProduto: texto(produto?.name),
    ofertaId: texto(oferta?.id),
    offerType: texto(item.offer_type),
    parentOrder: texto(item.parent_order),
  }
}

/** Lê o `data[]` inteiro. Nunca lança: payload torto vira leitura vazia. */
export function lerEvento(payload: unknown): LeituraEvento {
  if (!payload || typeof payload !== 'object') return { itens: [], total: 0, descartados: 0 }

  const dados = (payload as Record<string, unknown>).data
  if (!Array.isArray(dados)) return { itens: [], total: 0, descartados: 0 }

  const itens = dados.map(lerItem).filter((i): i is ItemCakto => i !== null)
  return { itens, total: dados.length, descartados: dados.length - itens.length }
}

/**
 * As linhas do log — uma por item.
 *
 * ===========================================================================
 * POR QUE UMA LINHA POR ITEM, E NÃO UMA POR EVENTO COM O ARRAY DENTRO
 * ===========================================================================
 * O log existe para responder "o que a Cakto disse sobre ESTE pedido, e o que
 * o sistema fez com ele". Com uma linha por evento, essa pergunta vira leitura
 * de JSON aninhado no meio de uma disputa — e a `nota`, que é onde eu escrevo
 * o que aconteceu, teria que descrever quatro desfechos diferentes num campo
 * de texto só.
 *
 * Com uma linha por item, cada pedido tem o seu desfecho, e a idempotência
 * — o par (tipo, pedido_id) — passa a valer por compra em vez de por
 * envelope. Isso importa de verdade: sem isso, um reembolso de bump marcaria
 * o envelope inteiro como processado.
 *
 * O `payload` completo se repete em todas as linhas do mesmo evento, e é
 * aceitável: são no máximo quatro cópias de alguns kilobytes, e cada linha
 * continuar auto-suficiente vale mais do que o espaço economizado.
 * ===========================================================================
 *
 * Evento sem item aproveitável — `checkout_abandonment`, payload torto —
 * ainda vira UMA linha, com pedido nulo. Registrar nada seria perder a
 * evidência de que a Cakto chamou.
 */
export type LinhaLog = {
  tipo: string | null
  payload: Json
  cabecalhos: Json
  segredo_valido: boolean
  processado: boolean
  nota: string | null
  pedido_id: string | null
  offer_type: string | null
  parent_order: string | null
}

export function linhasDoEvento(
  leitura: LeituraEvento,
  base: { tipo: string | null; payload: Json; cabecalhos: Json; segredoValido: boolean },
): LinhaLog[] {
  const comum = {
    tipo: base.tipo,
    payload: base.payload,
    cabecalhos: base.cabecalhos,
    segredo_valido: base.segredoValido,
    processado: false,
    nota: null,
  }

  if (leitura.itens.length === 0) {
    return [{ ...comum, pedido_id: null, offer_type: null, parent_order: null }]
  }

  /*
    Todas as chaves em todas as linhas, e nenhuma omitida: no insert em lote do
    PostgREST, chave ausente numa linha vira NULL explícito e atropela o
    DEFAULT da coluna. Ver a regra no README.
  */
  return leitura.itens.map((item) => ({
    ...comum,
    pedido_id: item.pedidoId,
    offer_type: item.offerType,
    parent_order: item.parentOrder,
  }))
}
