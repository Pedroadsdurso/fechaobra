import type { ItemCakto } from './payload'
import type { Recurso } from '@/modules/acesso/recursos'

/**
 * Qual produto da Cakto libera o quê.
 *
 * ===========================================================================
 * POR QUE CONSTANTE, E NÃO TABELA
 * ===========================================================================
 * Quatro razões, e a terceira é a que decide.
 *
 * 1. ISTO É REGRA DE NEGÓCIO, NÃO DADO. "O bump de contrato libera contratos"
 *    é uma decisão de produto, da mesma natureza de "R$ 47 vitalício".
 *    Decisão de produto mora no código.
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
 * sete produtos, conjunto fechado.
 *
 * O que VAI para o banco é o resultado, não a regra: `recursos_liberados`
 * guarda qual pedido concedeu qual recurso. A regra é constante; a aplicação
 * dela é linha.
 * ===========================================================================
 */

/**
 * O UUID do FechaObra — o produto que vende o vitalício de R$ 47.
 *
 * ===========================================================================
 * É POR ESTE UUID QUE O VITALÍCIO É ENCONTRADO. NUNCA POR POSIÇÃO.
 * ===========================================================================
 * No evento real 8X7Zs1S o item principal é `data[3]`, o ÚLTIMO, e `data[0]`
 * é o bump da Recuperação de Cliente. Qualquer código que assuma `data[0]`
 * libera o vitalício carimbado com o pedido de um bump de R$ 10,90 — e aí o
 * reembolso desse bump derruba o acesso de R$ 47 inteiro.
 *
 * Nem por `offer_type === 'main'`: os upsells também chegam como 'main', cada
 * um no evento dele. 'main' quer dizer "é o produto deste checkout", não "é o
 * FechaObra".
 * ===========================================================================
 */
export const PRODUTO_PRINCIPAL = '6ba610fb-1bc6-46d2-919f-4db497b6da84'

/**
 * A chave é o `product.id` do payload — o UUID, não o `short_id` nem o
 * `offer.id`.
 *
 * Medido em evento real: `product` traz
 * `{ id: '6ba610fb-…', name, type, short_id: '6HHKsfM' }` e `offer` traz
 * `{ id: 'fkxh94h', name, price }`. O UUID é o produto; a oferta é o preço, e
 * um produto pode ter várias (promoção, teste de preço). Casar por oferta
 * quebraria no dia da primeira promoção.
 */
export type Produto = {
  /** `product.id` — o UUID. É por aqui que o casamento acontece. */
  produtoId: string
  /** Só para eu reconhecer no log e no painel. Não participa da decisão. */
  apelido: string
  /** Os recursos que uma compra aprovada deste produto libera. */
  recursos: Recurso[]
  /**
   * `offer.id` — o short id da oferta.
   *
   * NÃO PARTICIPA DA DECISÃO, e está aqui por dois motivos: conferir no log
   * que o item casado é o que eu penso, e montar o `linkCheckout` sem ter o
   * short id escrito em dois lugares.
   */
  oferta: string
  /**
   * O checkout da Cakto deste produto. Vazio quando ele não tem um próprio.
   *
   * Mora aqui, junto do id, para produto novo ser UMA entrada só: o id casa o
   * webhook na volta, o link leva a pessoa na ida. Separar os dois em lugares
   * diferentes é como um deles fica desatualizado sem ninguém perceber — e o
   * sintoma seria o pior possível: a tela manda para o checkout certo e o
   * webhook não reconhece o que voltou, ou o contrário.
   *
   * ===========================================================================
   * ORDER BUMP NÃO TEM CHECKOUT PRÓPRIO — E ISSO NÃO É CAMPO ESQUECIDO
   * ===========================================================================
   * Conferido no payload real: os três bumps chegam com
   * `checkoutUrl: 'https://pay.cakto.com.br/fkxh94h_1054119'`, que é o
   * checkout DO FECHAOBRA. Eles não são páginas de venda; são caixas marcadas
   * dentro da página do principal.
   *
   * Por isso o campo fica vazio nos três, e NÃO recebe o link do principal.
   * Quem vê o cadeado do recurso de IA dentro do editor já comprou o
   * FechaObra — mandar essa pessoa para o checkout de R$ 47 a faria pagar o
   * vitalício de novo para tentar comprar um bump de R$ 29,90.
   *
   * Vazio faz a tela dizer "ainda não está à venda", que é verdade hoje: não
   * há como comprar o bump depois do checkout. Para haver, o bump precisa
   * virar oferta avulsa na Cakto — e aí é só preencher o link aqui.
   * ===========================================================================
   */
  linkCheckout: string
}

/**
 * O catálogo — os sete produtos que existem na Cakto hoje.
 *
 * Os UUIDs, ofertas e links foram lidos dos eventos reais em `eventos_cakto`,
 * não digitados do painel: o que o webhook recebe é a única fonte que não
 * mente sobre o que o webhook vai receber.
 */
export const PRODUTOS: Produto[] = [
  {
    /*
      O vitalício. NENHUM recurso: o núcleo — orçamento, PDF, aceite, rastreio,
      os 12 tipos de serviço — não passa por `recursos_liberados`, passa por
      `liberacoes`. Lista vazia aqui é a afirmação de que este produto não
      concede módulo nenhum, e é o que faz a asserção do handler ter sentido.
    */
    produtoId: PRODUTO_PRINCIPAL,
    apelido: 'FechaObra — vitalício',
    recursos: [],
    oferta: 'fkxh94h',
    linkCheckout: 'https://pay.cakto.com.br/fkxh94h_1054119',
  },
  {
    produtoId: 'e7a1a53f-29ec-4e6e-a0b4-d7aea797c90c',
    apelido: 'bump — Recuperação de Cliente',
    recursos: ['recuperacao'],
    oferta: 'gwjmcjt',
    linkCheckout: '',
  },
  {
    // Um bump, dois recursos: escrever os textos e montar o orçamento inteiro.
    produtoId: '8fe54020-3178-447d-bc4d-140174cdd494',
    apelido: 'bump — Orçamento com IA',
    recursos: ['ia_textos', 'ia_orcamento'],
    oferta: 'iqrjnua',
    linkCheckout: '',
  },
  {
    produtoId: '478dc215-b46e-46f0-80a2-efe86b77b1ab',
    apelido: 'bump — Contrato e Recibo',
    recursos: ['contratos'],
    oferta: '3ed238w',
    linkCheckout: '',
  },
  {
    // Os três de baixo são upsells: produto próprio, evento próprio, e
    // `offer_type: 'main'` — porque são o principal DO CHECKOUT DELES.
    produtoId: '7b678169-aff6-41ff-9396-1d025b2334a1',
    apelido: 'upsell — Áudio Vira Orçamento',
    recursos: ['audio_orcamento'],
    oferta: '3f2urd6',
    linkCheckout: 'https://pay.cakto.com.br/3f2urd6_1061021',
  },
  {
    produtoId: '945e918e-aaa8-4ea2-85fc-3d1458e54a2a',
    apelido: 'upsell — Medição por Foto',
    recursos: ['medicao_foto'],
    oferta: 'ndxpdrb',
    linkCheckout: 'https://pay.cakto.com.br/ndxpdrb_1061023',
  },
  {
    produtoId: 'bcf0f230-320d-49c5-aad7-59a1aded4e92',
    apelido: 'upsell — Calculadora de Material',
    recursos: ['calculadora_material'],
    oferta: '348f3s9',
    linkCheckout: 'https://pay.cakto.com.br/348f3s9_1061026',
  },
]

/** Qual produto vende este recurso. Null se nenhum o vende. */
export function produtoDoRecurso(recurso: Recurso): Produto | null {
  return PRODUTOS.find((p) => p.recursos.includes(recurso)) ?? null
}

/**
 * O checkout do recurso, já com o e-mail da conta preenchido.
 *
 * ===========================================================================
 * O APP MANDA O E-MAIL PARA O CHECKOUT, NÃO O CONTRÁRIO
 * ===========================================================================
 * Mesma decisão de `/acesso`, e aqui ela vale ainda mais: a pessoa já está
 * logada há tempo, dentro do editor, no meio de um orçamento. O acesso é
 * concedido por e-mail — comprar com um e ter conta noutro deixa a pessoa sem
 * o recurso e sem como saber por quê.
 *
 * Aviso na tela não resolve isso: o próprio Pedro errou testando, sabendo
 * exatamente como funciona. Preencher elimina o erro em vez de avisar sobre
 * ele.
 *
 * Isto NÃO libera ninguém: parâmetro de URL não concede recurso. A liberação
 * continua vindo só de `purchase_approved` no webhook.
 * ===========================================================================
 *
 * Devolve string vazia quando o produto não tem checkout próprio — hoje os
 * três order bumps. A tela trata isso como "em breve" em vez de oferecer um
 * botão que levaria a pessoa a pagar o vitalício de novo.
 */
export function checkoutDoRecurso(recurso: Recurso, email: string): string {
  const produto = produtoDoRecurso(recurso)
  if (!produto?.linkCheckout) return ''
  if (!email) return produto.linkCheckout
  const parametros = new URLSearchParams({ email, confirmEmail: email })
  return `${produto.linkCheckout}?${parametros}`
}

/**
 * O produto do pagamento, ou null.
 *
 * Null quando o item não traz produto ou quando o UUID não está no catálogo.
 * Os dois casos merecem aviso no log — ver `descreverItem` —, mas nenhum é
 * exceção: quem chama trata como "este item não concede recursos".
 */
export function produtoDoPagamento(produtoId: string | null): Produto | null {
  if (!produtoId) return null
  return PRODUTOS.find((p) => p.produtoId === produtoId) ?? null
}

export function ehProdutoPrincipal(produtoId: string | null) {
  return produtoId === PRODUTO_PRINCIPAL
}

/**
 * O item em uma linha, para o log.
 *
 * O caso importante é o produto FORA do catálogo: aí o texto carrega UUID,
 * nome e oferta juntos, porque é exatamente o que eu preciso para abrir o
 * painel da Cakto e decidir se é produto novo meu ou coisa errada. Só o UUID
 * me faria voltar ao payload para descobrir de que produto se trata.
 */
export function descreverItem(item: ItemCakto) {
  const produto = produtoDoPagamento(item.produtoId)
  if (produto) {
    const recursos = produto.recursos.length ? produto.recursos.join(', ') : 'nenhum módulo'
    return `${produto.apelido} (${recursos})`
  }
  if (!item.produtoId) return 'item sem produto no payload'
  return `PRODUTO FORA DO MAPA: ${item.produtoId} · ${item.nomeProduto ?? 'sem nome'} · oferta ${item.ofertaId ?? 'sem oferta'}`
}
