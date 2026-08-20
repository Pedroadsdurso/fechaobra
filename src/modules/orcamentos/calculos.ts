import { PACOTES_PADRAO } from './constantes'
import type { ItemEditor, Pacote, PacoteDerivado, PacoteEditor, TipoItem } from './tipos'

/**
 * Lê um número digitado em português.
 *
 * Aceita "1.234,56", "1234,56" e "1234.56". O usuário digita no teclado
 * numérico do celular, onde a vírgula é o separador natural — e vai colar
 * valor copiado de nota fiscal, que vem com ponto de milhar.
 */
export function paraNumero(texto: string): number {
  const limpo = texto.trim()
  if (!limpo) return 0

  // Com vírgula presente, ela é o decimal e o ponto é milhar.
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo.replace(/(\d)\.(?=\d{3}\b)/g, '$1')

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}

export function totalDoItem(item: ItemEditor) {
  return paraNumero(item.quantidade) * paraNumero(item.valorUnitario)
}

export function somar(itens: ItemEditor[]) {
  return itens.reduce((total, item) => total + totalDoItem(item), 0)
}

export function totalPorTipo(itens: ItemEditor[], tipo: TipoItem) {
  return somar(itens.filter((i) => i.tipo === tipo))
}

/** Ordem de acúmulo: cada nível contém os anteriores. */
const ESCADA: Pacote[] = ['essencial', 'recomendado', 'completo']

/**
 * Os pacotes existem quando os itens estão espalhados em mais de um nível.
 *
 * Se tudo está em "essencial" — o padrão — não há comparação a oferecer, e o
 * documento imprime só a tabela. É assim que os pacotes ficam opcionais sem
 * precisar de um interruptor para o usuário ligar.
 */
export function usaPacotes(itens: ItemEditor[]) {
  const niveis = new Set(itens.filter((i) => i.descricao.trim()).map((i) => i.pacote))
  return niveis.size > 1
}

export function pacotesDerivados(
  itens: ItemEditor[],
  // Default vazio de propósito: uma aba aberta durante um deploy pode mandar
  // um rascunho do formato antigo, sem `pacotes`. Melhor cair nos textos
  // padrão do que derrubar a página inteira do orçamento.
  metadados: PacoteEditor[] = [],
): PacoteDerivado[] {
  const validos = itens.filter((i) => i.descricao.trim())
  const porNivel = new Map((metadados ?? []).map((p) => [p.nivel, p]))

  let acumulado = 0

  return ESCADA.map((nivel) => {
    const doNivel = validos.filter((i) => i.pacote === nivel)
    acumulado += somar(doNivel)

    const meta = porNivel.get(nivel)

    return {
      nivel,
      rotulo: meta?.rotulo?.trim() || PACOTES_PADRAO[nivel].rotulo,
      descricao: meta?.descricao?.trim() || PACOTES_PADRAO[nivel].descricao,
      destaque: meta?.destaque ?? nivel === 'recomendado',
      valor: acumulado,
      inclui: doNivel.map((i) => i.descricao.trim()),
    }
  })
}

/** Os três níveis com rótulo e frase padrão, para orçamento que ainda não tem. */
export function pacotesPadrao(): PacoteEditor[] {
  return ESCADA.map((nivel) => ({
    nivel,
    rotulo: PACOTES_PADRAO[nivel].rotulo,
    descricao: PACOTES_PADRAO[nivel].descricao,
    destaque: nivel === 'recomendado',
  }))
}

/** dd/mm/aaaa a partir de hoje mais N dias. */
export function dataDeValidade(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() + dias)
  return data
}

export function formatarDataCurta(data: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data)
}

/**
 * O que ainda falta para o orçamento poder sair do rascunho.
 *
 * Rascunho salva sempre, mesmo vazio — travar o autosave até ter cliente e
 * item seria impedir a pessoa de começar. A exigência vale para finalizar.
 */
export function pendenciasParaFinalizar(clienteId: string | null, itens: ItemEditor[]) {
  const pendencias: string[] = []
  if (!clienteId) pendencias.push('escolher o cliente')
  if (itens.filter((i) => i.descricao.trim()).length === 0) pendencias.push('incluir ao menos 1 item')
  return pendencias
}

/**
 * Níveis que valem ser mostrados: descarta os que custam o mesmo que o
 * anterior.
 *
 * Acontece toda vez que o prestador esquece de marcar itens num nível — o
 * acumulado repete e a coluna vira cópia da vizinha. Três colunas com dois
 * números iguais parecem defeito e derrubam a ancoragem inteira: o cliente
 * deixa de comparar e passa a achar que o orçamento está errado. Duas opções
 * boas convencem mais que três com uma repetida.
 *
 * O primeiro nível com valor sempre entra, mesmo custando zero — é o piso da
 * comparação.
 */
export function pacotesVisiveis(derivados: PacoteDerivado[]): PacoteDerivado[] {
  const visiveis: PacoteDerivado[] = []

  for (const pacote of derivados) {
    const anterior = visiveis.at(-1)
    if (anterior && pacote.valor === anterior.valor) continue
    visiveis.push(pacote)
  }

  return visiveis
}

/**
 * Avisos para o editor: quais níveis estão repetindo o valor do anterior.
 * Devolve frases prontas, porque quem lê é o prestador no meio do trabalho.
 */
export function avisosDePacote(derivados: PacoteDerivado[]): string[] {
  const avisos: string[] = []

  for (let i = 1; i < derivados.length; i++) {
    const atual = derivados[i]
    const anterior = derivados[i - 1]
    if (atual.valor !== anterior.valor) continue

    // Aspas em volta dos rótulos, e dois-pontos no lugar do travessão: o
    // prestador pode ter batizado o nível de "Recomendado — o que eu faria",
    // e aí o travessão da frase se confundia com o do nome dele.
    avisos.push(
      `“${atual.rotulo}” está com o mesmo valor de “${anterior.rotulo}”: nenhum item foi marcado nesse nível. Assim ele não vai aparecer no documento.`,
    )
  }

  return avisos
}
