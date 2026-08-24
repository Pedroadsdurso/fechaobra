import 'server-only'

import { gerarJson, type ResultadoIA } from './gemini'
import { payloadTextos } from './saneamento'

/**
 * Etapa A: os quatro textos que sustentam o preço.
 *
 * ===========================================================================
 * ESTES TEXTOS NÃO SÃO ENFEITE — SÃO O QUE JUSTIFICA O NÚMERO
 * ===========================================================================
 * O README já registra: o escopo, as exclusões e a garantia existem para que o
 * cliente leia o valor acompanhado do que ele compra. Orçamento que chega só
 * com o total vira negociação de preço; orçamento com escopo vira decisão.
 *
 * E é justamente o pedaço que o prestador não escreve, porque escrever quatro
 * parágrafos no celular, no canteiro, não acontece. Daí o módulo.
 * ===========================================================================
 *
 * NENHUM VALOR, NENHUMA PROMESSA DE PRAZO. O schema não tem campo de preço,
 * pelo mesmo motivo da extração — não existe a casa onde a regra seria
 * desobedecida. Prazo e garantia em meses saem da instrução e são conferidos
 * na validação: número de mês inventado numa garantia é promessa contratual
 * que o prestador não fez.
 */

export type TextosGerados = {
  escopo: string
  exclusoes: string
  garantia: string
  condicoes: string
}

const INSTRUCAO = [
  'Você escreve as cláusulas de um orçamento de obra ou reforma, em português do Brasil.',
  'A entrada é um JSON com o tipo de serviço, o título do orçamento e a lista de itens.',
  '',
  'Escreva quatro textos, todos na voz do prestador falando com o cliente:',
  '- escopo: o que está incluso, cobrindo os itens da lista. Frases curtas, uma por linha, começando com verbo.',
  '- exclusoes: o que NÃO está incluso. Só o que é comum e costuma gerar briga: mobiliário, licenças, taxas de condomínio, serviços de outras especialidades.',
  '- garantia: o que o prestador cobre depois de entregue, e o que não cobre (mau uso, desgaste natural).',
  '- condicoes: forma de pagamento em termos gerais.',
  '',
  'Regras que valem para os quatro:',
  '- NUNCA escreva valores, preços, percentuais de desconto ou estimativas de custo.',
  '- NUNCA invente prazo em dias nem garantia em meses ou anos. Se o texto pedir um número, escreva "conforme combinado" ou "o prazo acordado".',
  '- Não invente serviço que não está na lista de itens.',
  '- Sem saudação, sem despedida, sem emoji, sem "prezado cliente". É cláusula de documento, não mensagem.',
  '- Português simples, de quem trabalha em obra. Nada de "outrossim" ou "por conseguinte".',
].join('\n')

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    escopo: { type: 'STRING' },
    exclusoes: { type: 'STRING' },
    garantia: { type: 'STRING' },
    condicoes: { type: 'STRING' },
  },
  required: ['escopo', 'exclusoes', 'garantia', 'condicoes'],
}

const LIMITE_CADA = 1500

/**
 * Números que viram promessa.
 *
 * A instrução pede para não inventar prazo nem garantia, e o modelo obedece na
 * maioria das vezes — "na maioria das vezes" não serve para cláusula que o
 * cliente pode cobrar depois. Aqui a promessa é neutralizada: "garantia de 12
 * meses" vira "garantia conforme combinado".
 *
 * Deliberadamente conservador: prefiro trocar um número correto por uma frase
 * genérica a deixar passar um prazo que o prestador nunca prometeu.
 */
const PROMESSAS = [
  { de: /\b\d+\s*(mes|mês|meses)\b/gi, para: 'o prazo combinado' },
  { de: /\b\d+\s*(ano|anos)\b/gi, para: 'o prazo combinado' },
  { de: /\b\d+\s*(dia|dias|dias úteis|dias uteis)\b/gi, para: 'o prazo combinado' },
  { de: /R\$\s*[\d.,]+/g, para: 'o valor combinado' },
  { de: /\b\d+\s*%/g, para: 'a parcela combinada' },
]

function limpar(bruto: unknown): string {
  if (typeof bruto !== 'string') return ''
  let texto = bruto.trim().slice(0, LIMITE_CADA)
  for (const { de, para } of PROMESSAS) texto = texto.replace(de, para)
  return texto
}

function validar(bruto: unknown): TextosGerados | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const b = bruto as Record<string, unknown>

  const textos = {
    escopo: limpar(b.escopo),
    exclusoes: limpar(b.exclusoes),
    garantia: limpar(b.garantia),
    condicoes: limpar(b.condicoes),
  }

  // Vazio em todos significa que não veio nada aproveitável. Vazio em um só é
  // legítimo — nem todo orçamento tem exclusão que valha escrever.
  const algum = Object.values(textos).some((t) => t.length > 0)
  return algum ? textos : null
}

export async function gerarTextos(parametros: {
  userId: string
  tipoServico: string
  titulo: string
  itens: { descricao: string }[]
}): Promise<ResultadoIA<TextosGerados>> {
  return gerarJson<TextosGerados>({
    userId: parametros.userId,
    recurso: 'ia_textos',
    instrucao: INSTRUCAO,
    entrada: payloadTextos(parametros),
    schema: SCHEMA,
    validar,
  })
}
