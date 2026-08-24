import { UNIDADES } from '@/modules/orcamentos/constantes'

/**
 * O que sai daqui para a IA.
 *
 * ===========================================================================
 * MONTE POR INCLUSÃO. NUNCA FILTRE POR EXCLUSÃO.
 * ===========================================================================
 * A diferença não é de estilo, é de modo de falhar.
 *
 * Filtrar por exclusão é escrever `delete payload.cpf`. Funciona até alguém
 * acrescentar um campo à tabela — e aí o campo novo VAZA POR PADRÃO, calado,
 * sem erro nenhum. O dia em que `orcamentos` ganhar uma coluna, quem escreveu
 * o filtro já esqueceu que ele existe.
 *
 * Montar por inclusão é escrever `{ tipoServico, descricao }` à mão. Campo
 * novo na tabela não aparece aqui a menos que alguém venha e digite o nome
 * dele. O padrão passa a ser NÃO VAZAR, e vazar exige um ato deliberado.
 *
 * Por isso estas funções recebem o objeto inteiro e devolvem um literal com os
 * campos escritos um a um. Nada de spread, nada de `Object.entries`, nada de
 * varredura — qualquer uma dessas coisas reintroduz o padrão errado.
 * ===========================================================================
 *
 * O QUE PODE SAIR: tipo de serviço, título do orçamento, descrições dos itens.
 *
 * O QUE NUNCA SAI: nome do cliente, endereço da obra, CPF, telefone, valores
 * unitários, valores totais, nome ou dados da empresa do prestador.
 *
 * Sobre o texto livre da extração: ele É o pedido, então vai inteiro. É por
 * isso que a tela precisa dizer, com todas as letras, que aquele campo é
 * enviado — a pessoa tem que saber antes de digitar o nome de alguém ali.
 */

/** O payload da extração de itens. Dois campos, e são estes dois. */
export type PayloadExtracao = {
  tipoServico: string
  descricao: string
}

export function payloadExtracao(entrada: {
  tipoServico: string
  descricao: string
}): PayloadExtracao {
  return {
    // tipoServico ajuda o modelo a escolher unidade: "m²" numa pintura,
    // "un" numa elétrica. É rótulo de catálogo, não dado de ninguém.
    tipoServico: entrada.tipoServico.trim().slice(0, 60),
    descricao: entrada.descricao.trim().slice(0, LIMITE_DESCRICAO),
  }
}

/** O teto do texto livre. Também cobrado na tela e na Server Action. */
export const LIMITE_DESCRICAO = 1200

/** O payload da geração de textos. Três campos, e são estes três. */
export type PayloadTextos = {
  tipoServico: string
  titulo: string
  itens: string[]
  /**
   * A garantia padrão do tipo de serviço, vinda do seed (migration 0002).
   *
   * Vai junto para o modelo ter DE ONDE tirar prazo em vez de inventar: o seed
   * traz 5 anos em impermeabilização, 3 em marcenaria, 2 em telhado, 12 meses
   * na maioria. É catálogo do produto, não dado de ninguém — cabe na lista de
   * inclusão pelo mesmo critério que `tipoServico`.
   */
  garantiaPadrao: string
}

/**
 * Etapa A: escopo, exclusões, garantia e condições a partir do que já existe
 * no orçamento.
 *
 * SÓ A DESCRIÇÃO DE CADA ITEM SAI. Quantidade, unidade e valor unitário ficam,
 * e não é excesso de zelo: quantidade e unidade não melhoram um texto de
 * escopo, e valor unitário é a informação comercial mais sensível que o
 * prestador tem. A lista de `itens` é montada por `map` para uma string, não
 * por `map` para um objeto reduzido — objeto reduzido é filtro por exclusão
 * com outro nome, e volta a vazar no dia em que ItemEditor ganhar campo.
 */
export function payloadTextos(entrada: {
  tipoServico: string
  titulo: string
  itens: { descricao: string }[]
  garantiaPadrao?: string
}): PayloadTextos {
  return {
    tipoServico: entrada.tipoServico.trim().slice(0, 60),
    titulo: entrada.titulo.trim().slice(0, 120),
    itens: entrada.itens
      .map((i) => i.descricao.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 40),
    garantiaPadrao: (entrada.garantiaPadrao ?? '').trim().slice(0, 1500),
  }
}

/**
 * As chaves que podem existir num payload de IA, em qualquer etapa.
 *
 * Serve à conferência automática: um teste percorre o payload montado e falha
 * se aparecer chave fora desta lista. É a rede que pega o dia em que alguém
 * acrescentar um campo "só para ajudar o modelo".
 */
export const CHAVES_PERMITIDAS = [
  'tipoServico',
  'titulo',
  'descricao',
  'itens',
  'garantiaPadrao',
] as const

export function chavesForaDaLista(payload: object): string[] {
  const permitidas = new Set<string>(CHAVES_PERMITIDAS)
  return Object.keys(payload).filter((k) => !permitidas.has(k))
}

/**
 * A unidade que o modelo devolveu, reduzida à lista que o editor conhece.
 *
 * O modelo escreve "metros quadrados", "m2", "unidades". O editor tem um
 * `select` com doze opções. Traduzir aqui evita item que chega com unidade que
 * o campo não aceita — que apareceria como campo vazio, e o prestador teria
 * que adivinhar o que faltou.
 */
const SINONIMOS: Record<string, string> = {
  'metro quadrado': 'm²',
  'metros quadrados': 'm²',
  m2: 'm²',
  'metro cubico': 'm³',
  'metros cubicos': 'm³',
  m3: 'm³',
  metro: 'm',
  metros: 'm',
  unidade: 'un',
  unidades: 'un',
  peca: 'pç',
  pecas: 'pç',
  hora: 'h',
  horas: 'h',
  dias: 'dia',
  quilo: 'kg',
  quilos: 'kg',
  saco: 'sc',
  sacos: 'sc',
  litro: 'lt',
  litros: 'lt',
  caixa: 'cx',
  caixas: 'cx',
  verba: 'vb',
}

export function unidadeConhecida(bruta: string): string {
  const limpa = bruta.trim().toLowerCase()
  if (UNIDADES.includes(limpa)) return limpa

  const semAcento = limpa.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (SINONIMOS[semAcento]) return SINONIMOS[semAcento]

  // Desconhecida vira 'un', que é o palpite mais seguro: erra para a unidade
  // mais comum em vez de deixar o campo em branco.
  return 'un'
}
