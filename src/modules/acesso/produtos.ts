import type { Recurso } from './recursos'

/**
 * Qual produto da Cakto libera quais recursos.
 *
 * ===========================================================================
 * POR QUE CONSTANTE, E NÃO TABELA
 * ===========================================================================
 * Quatro razões, e a terceira é a que decide.
 *
 * 1. ISTO É REGRA DE NEGÓCIO, NÃO DADO. "O bump libera contratos e IA" é uma
 *    decisão de produto, da mesma natureza de "R$ 47 vitalício". Decisão de
 *    produto mora no código.
 *
 * 2. COMMIT É RASTRO. Em tabela, uma linha muda sem diff, sem revisão e sem
 *    quem. Aqui, mudar exige commit e deploy — e é justamente o que se quer
 *    ter que fazer para alterar quem ganha acesso a quê.
 *
 * 3. O TIPO PROTEGE. `Recurso` é union, então o tsc recusa 'ia_texto' com typo.
 *    Em tabela é texto solto: o typo entra, o recurso nunca é concedido, e a
 *    falha é CALADA — o comprador paga e não recebe, e ninguém fica sabendo
 *    até ele reclamar. É o modo de falha mais caro possível para um produto
 *    pago.
 *
 * 4. NÃO HÁ GANHO EM RUNTIME. Produto novo exige código novo de qualquer jeito:
 *    o recurso precisa existir no app para ter o que liberar. O único ganho da
 *    tabela seria trocar um ID sem deploy — e trocar ID de produto sem
 *    revisão é exatamente o que não se quer poder fazer.
 *
 * QUANDO EU MUDARIA DE IDEIA: se produto novo virar rotina de marketing —
 * promoção com produto novo toda semana, sem código junto. Não é o caso: são
 * sete recursos, conjunto fechado.
 *
 * O que VAI para o banco é o resultado, não a regra: `recursos_liberados`
 * guarda qual pedido concedeu qual recurso. A regra é constante; a aplicação
 * dela é linha.
 * ===========================================================================
 */

/**
 * A chave é o `product.id` do payload — o UUID, não o `short_id` nem o
 * `offer.id`.
 *
 * Medido num evento real: `data[0].product` traz
 * `{ id: '6ba610fb-…', name, type, short_id: '6HHKsfM' }` e `data[0].offer`
 * traz `{ id: 'fkxh94h', price }`. O UUID é o produto; a oferta é o preço, e
 * um produto pode ter várias (promoção, teste de preço). Casar por oferta
 * quebraria no dia da primeira promoção.
 *
 * `ofertaId` fica junto só para conferência humana no log — nunca decide nada.
 */
export type Produto = {
  /** `data[0].product.id` — o UUID. É por aqui que o casamento acontece. */
  produtoId: string
  /** Só para eu reconhecer no log e no painel. Não participa da decisão. */
  apelido: string
  /** Os recursos que uma compra aprovada deste produto libera. */
  recursos: Recurso[]
}

/**
 * O catálogo.
 *
 * IDs vazios são produtos que ainda não existem na Cakto. Produto sem id NÃO
 * casa com nada — ver `produtoDoPagamento`, que ignora entradas vazias em vez
 * de casar com um payload que também viesse sem produto. Entrada vazia por
 * engano nunca libera nada.
 */
export const PRODUTOS: Produto[] = [
  {
    // O order bump: um produto, quatro recursos.
    produtoId: '',
    apelido: 'bump — pacote de produtividade',
    recursos: ['ia_textos', 'ia_orcamento', 'contratos', 'recuperacao'],
  },
  { produtoId: '', apelido: 'upsell — IA por áudio', recursos: ['ia_audio'] },
  { produtoId: '', apelido: 'upsell — IA de medição', recursos: ['ia_medicao'] },
  { produtoId: '', apelido: 'upsell — calculadora', recursos: ['calculadora'] },
]

/**
 * O produto do pagamento, ou null.
 *
 * Null quando o payload não traz produto, quando o produto não está no
 * catálogo (é o vitalício de R$ 47, ou algo novo que ninguém mapeou) ou
 * quando o id chega vazio.
 *
 * Null NÃO é erro: a compra do vitalício cai aqui todo dia e não libera
 * recurso nenhum. Quem chama trata como "esta compra não concede recursos".
 */
export function produtoDoPagamento(produtoId: string | null): Produto | null {
  if (!produtoId) return null
  return PRODUTOS.find((p) => p.produtoId !== '' && p.produtoId === produtoId) ?? null
}

/** Para o log dizer o que aconteceu sem eu ter que reler o payload. */
export function descreverProduto(produtoId: string | null) {
  const produto = produtoDoPagamento(produtoId)
  if (produto) return `${produto.apelido} (${produto.recursos.join(', ')})`
  return produtoId ? `produto fora do catálogo: ${produtoId}` : 'payload sem produto'
}
