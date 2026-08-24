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
 * NENHUM VALOR. O schema não tem campo de preço, pelo mesmo motivo da
 * extração — não existe a casa onde a regra seria desobedecida.
 *
 * PRAZO PODE SAIR, DESDE QUE VENHA DA REFERÊNCIA. A garantia padrão do tipo de
 * serviço viaja no payload, e todo período no texto gerado é conferido contra
 * ela: o que está lá passa, o que o modelo inventou vira "conforme combinado".
 * Ver o bloco de `prazosDaReferencia`.
 */

export type TextosGerados = {
  escopo: string
  exclusoes: string
  garantia: string
  condicoes: string
}

const INSTRUCAO = [
  'Você escreve as cláusulas de um orçamento de obra ou reforma, em português do Brasil.',
  'A entrada é um JSON com o tipo de serviço, o título do orçamento, a lista de itens e a garantia padrão desse tipo de serviço.',
  '',
  'Escreva quatro textos, todos na voz do prestador falando com o cliente:',
  '- escopo: o que está incluso, cobrindo os itens da lista. Frases curtas, uma por linha, começando com verbo.',
  '- exclusoes: o que NÃO está incluso. Só o que é comum e costuma gerar briga: mobiliário, licenças, taxas de condomínio, serviços de outras especialidades.',
  '- garantia: o que o prestador cobre depois de entregue, e o que não cobre (mau uso, desgaste natural).',
  '- condicoes: forma de pagamento em termos gerais.',
  '',
  'Regras que valem para os quatro:',
  '- NUNCA escreva valores, preços, percentuais de desconto ou estimativas de custo.',
  '- Os ÚNICOS prazos que você pode escrever são os que aparecem em garantiaPadrao. Copie o número e a unidade exatamente como estão lá.',
  '- Se garantiaPadrao vier vazia, ou se o prazo que você ia escrever não estiver nela, escreva "conforme combinado" — nunca um número seu.',
  '- Isso vale para prazo de execução também: não invente dias.',
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
 * Os prazos que este orçamento pode citar.
 *
 * ===========================================================================
 * O PROBLEMA NUNCA FOI O NÚMERO EXISTIR — É A IA INVENTAR UM
 * ===========================================================================
 * A primeira versão trocava todo prazo por "conforme combinado", e isso tirava
 * do texto justamente a informação mais útil: "garantia de 5 anos" vira uma
 * frase que não diz nada, e o prestador tem que escrever o prazo à mão toda
 * vez — o que faz o recurso perder o motivo de existir.
 *
 * O seed (migration 0002) já traz o prazo certo por tipo de serviço: 5 anos em
 * impermeabilização, 3 em marcenaria, 2 em telhado, 12 meses na maioria. Esse
 * texto vai junto no payload, e o que sai é conferido contra ele: prazo que
 * está na referência PASSA; prazo que o modelo inventou vira "conforme
 * combinado".
 *
 * Valor em reais e percentual continuam sempre neutralizados: não existe
 * referência nenhuma de preço no payload, então qualquer número desses é
 * invenção por definição.
 * ===========================================================================
 */
const PERIODO = /\b(\d{1,3})\s*(anos?|m[eê]s(?:es)?|dias?|semanas?)\b/gi

/*
  Para SUBSTITUIR, o recorte é maior: engole a preposição antes e o qualificador
  depois. Trocar só o miolo deixava frase capenga — "damos garantia DE conforme
  combinado" e "fica pronta em conforme combinado ÚTEIS". O texto vai para um
  documento que o cliente lê; português quebrado ali custa mais credibilidade do
  que o prazo faltando.
*/
const PERIODO_PARA_TROCAR =
  /\b(?:de|em|por|dentro de)?\s*(\d{1,3})\s*(anos?|m[eê]s(?:es)?|dias?|semanas?)(?:\s+(?:[úu]teis|corridos?))?\b/gi

/** "12 MESES", "12 mês", "12meses" -> "12|mes". Compara sentido, não grafia. */
function chaveDePrazo(numero: string, unidade: string) {
  const u = unidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const raiz = u.startsWith('ano')
    ? 'ano'
    : u.startsWith('mes')
      ? 'mes'
      : u.startsWith('dia')
        ? 'dia'
        : 'semana'
  return `${Number(numero)}|${raiz}`
}

function prazosDaReferencia(referencia: string) {
  const permitidos = new Set()
  for (const [, n, u] of referencia.matchAll(PERIODO)) permitidos.add(chaveDePrazo(n, u))
  return permitidos
}

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
/** Sempre inventados: não há referência de preço nenhuma no payload. */
const DINHEIRO = [
  // Mesmo cuidado do prazo com a preposição: "sinal de R$ 1.500" não pode
  // virar "sinal de o valor combinado".
  { de: /\b(?:de|em|por)?\s*R\$\s*[\d.,]+/gi, para: ' o valor combinado' },
  { de: /\b(?:de|em|por)?\s*\d+\s*%/gi, para: ' a parcela combinada' },
]

function limpar(bruto: unknown, permitidos: Set<unknown>): string {
  if (typeof bruto !== 'string') return ''
  let texto = bruto.trim().slice(0, LIMITE_CADA)

  texto = texto.replace(PERIODO_PARA_TROCAR, (inteiro, n, u) =>
    permitidos.has(chaveDePrazo(n, u)) ? inteiro : ' conforme combinado',
  )
  texto = texto.replace(/ {2,}/g, ' ').replace(/ ([.,;])/g, '$1')

  for (const { de, para } of DINHEIRO) texto = texto.replace(de, para)
  return texto
}

function validar(bruto: unknown, permitidos: Set<unknown>): TextosGerados | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const b = bruto as Record<string, unknown>

  const textos = {
    escopo: limpar(b.escopo, permitidos),
    exclusoes: limpar(b.exclusoes, permitidos),
    garantia: limpar(b.garantia, permitidos),
    condicoes: limpar(b.condicoes, permitidos),
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
  /** A garantia padrão do tipo de serviço. Define quais prazos podem sair. */
  garantiaPadrao?: string
}): Promise<ResultadoIA<TextosGerados>> {
  const entrada = payloadTextos(parametros)
  const permitidos = prazosDaReferencia(entrada.garantiaPadrao)

  return gerarJson<TextosGerados>({
    userId: parametros.userId,
    recurso: 'ia_textos',
    instrucao: INSTRUCAO,
    entrada,
    schema: SCHEMA,
    validar: (bruto) => validar(bruto, permitidos),
  })
}
