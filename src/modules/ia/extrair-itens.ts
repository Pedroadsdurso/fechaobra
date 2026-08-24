import 'server-only'

import { gerarJson, type ResultadoIA } from './gemini'
import { LIMITE_DESCRICAO, payloadExtracao, unidadeConhecida } from './saneamento'

/**
 * Etapa B: virar texto corrido em linhas de orçamento.
 *
 * O prestador escreve como fala — "pintar a sala e os dois quartos, uns 40
 * metros, e trocar 3 tomadas" — e recebe as linhas separadas, com quantidade e
 * unidade. O preço ele põe.
 *
 * ===========================================================================
 * A IA NÃO ESTIMA PREÇO QUE NÃO FOI DITO — E A GARANTIA É O SCHEMA
 * ===========================================================================
 * A regra não está escrita na instrução, ou melhor: não está SÓ na instrução.
 * Pedir "não invente preços" ao modelo é confiar na boa vontade dele, e é o
 * tipo de garantia que funciona nos testes e falha no dia estranho.
 *
 * O schema abaixo NÃO TEM CAMPO DE VALOR. Não há onde escrever um preço. O
 * modelo não desobedece a regra porque não existe a casa onde ela seria
 * desobedecida — e o item chega no editor com `valorUnitario` vazio, que é o
 * campo que o prestador vai preencher de qualquer jeito.
 *
 * Se um dia alguém acrescentar `valorUnitario` a este schema "para adiantar",
 * estará desfazendo a única garantia real que existe aqui.
 * ===========================================================================
 */

export type ItemExtraido = {
  descricao: string
  quantidade: number
  unidade: string
}

const INSTRUCAO = [
  'Você separa serviços de obra e reforma em linhas de orçamento.',
  'A entrada é um JSON com o tipo de serviço e a descrição escrita pelo prestador, em português do Brasil.',
  '',
  'Regras:',
  '- Uma linha por serviço ou material distinto. Não junte coisas diferentes na mesma linha.',
  '- A descrição de cada linha deve ser curta e objetiva, como aparece num orçamento: "Pintura de parede interna", não uma frase.',
  '- Use a quantidade que o prestador informou. Se ele não informou nenhuma, use 1.',
  '- NUNCA invente medidas. "pintar a sala" sem metragem é quantidade 1, unidade vb.',
  '- A unidade deve ser uma destas: un, m, m², m³, kg, sc, lt, cx, pç, h, dia, vb.',
  '- Não escreva valores, preços nem estimativas de custo em lugar nenhum.',
  '- Se a descrição não tiver nenhum serviço identificável, devolva a lista vazia.',
].join('\n')

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          descricao: { type: 'STRING' },
          quantidade: { type: 'NUMBER' },
          unidade: { type: 'STRING' },
        },
        required: ['descricao', 'quantidade', 'unidade'],
      },
    },
  },
  required: ['itens'],
}

/** Teto de linhas. Descrição longa que virasse 80 itens seria pior que nada. */
const MAXIMO_ITENS = 25

/**
 * A validação de conteúdo, que o `responseSchema` não faz.
 *
 * O schema garante que veio um array de objetos com três chaves dos tipos
 * certos. Não garante que a quantidade é positiva, que a unidade existe no
 * editor, nem que a descrição não veio vazia. Sem isto, o item chegaria na
 * tela com `quantidade: -3` e unidade "metros quadrados" — que o `select` não
 * tem — e o prestador veria campos em branco sem entender o porquê.
 */
function validar(bruto: unknown): ItemExtraido[] | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const lista = (bruto as { itens?: unknown }).itens
  if (!Array.isArray(lista)) return null

  const itens: ItemExtraido[] = []
  for (const cru of lista) {
    if (typeof cru !== 'object' || cru === null) continue
    const { descricao, quantidade, unidade } = cru as Record<string, unknown>

    const texto = typeof descricao === 'string' ? descricao.trim().slice(0, 200) : ''
    if (!texto) continue

    const numero = Number(quantidade)
    itens.push({
      descricao: texto,
      // Zero, negativo e NaN viram 1: o prestador corrige um número errado num
      // toque, mas um item que não apareceu ele não corrige — nem percebe.
      quantidade: Number.isFinite(numero) && numero > 0 ? Math.min(numero, 100_000) : 1,
      unidade: unidadeConhecida(typeof unidade === 'string' ? unidade : ''),
    })
    if (itens.length >= MAXIMO_ITENS) break
  }

  // Lista vazia é resposta legítima ("não achei serviço nenhum aqui"), não
  // falha — e quem chama trata como aviso na tela, não como erro.
  return itens
}

export async function extrairItens(parametros: {
  userId: string
  tipoServico: string
  descricao: string
}): Promise<ResultadoIA<ItemExtraido[]>> {
  const entrada = payloadExtracao({
    tipoServico: parametros.tipoServico,
    descricao: parametros.descricao,
  })

  return gerarJson<ItemExtraido[]>({
    userId: parametros.userId,
    recurso: 'ia_orcamento',
    instrucao: INSTRUCAO,
    entrada,
    schema: SCHEMA,
    validar,
  })
}

export { LIMITE_DESCRICAO }
