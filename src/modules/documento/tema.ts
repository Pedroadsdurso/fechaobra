/**
 * Tema do documento PDF.
 *
 * Trocar `corPrimaria` aqui muda o documento inteiro: faixa do topo, títulos
 * de seção, destaque de validade, cabeçalho da tabela, pacote recomendado,
 * marcadores e rodapé. Na Fase 2 este valor virá de perfis.cor_primaria.
 */

export const CORES = {
  /** A ÚNICA variável que precisa mudar para reetiquetar o documento. */
  primaria: '#0B3D2E',

  texto: '#111827',
  textoSuave: '#4B5563',
  textoFraco: '#8A93A0',

  linha: '#E1E5EA',
  linhaForte: '#C9D0D8',
  fundoSuave: '#F6F7F9',
  branco: '#FFFFFF',
} as const

export const FONTE = {
  familia: 'Inter',
  regular: 400,
  media: 500,
  negrito: 700,
} as const

/**
 * Tamanhos em pontos. A4 tem 595x842pt.
 *
 * A escala foi subida em ~15% depois do teste de leitura no celular. Com o
 * corpo em 9,5pt, uma A4 ajustada à largura de uma tela de 6 polegadas
 * renderizava o texto a 1,10mm de altura de em — abaixo de bula de remédio
 * (~1,5mm). Continua exigindo zoom para a letra miúda, mas agora o que decide
 * a venda (total, validade, valores dos pacotes) se lê sem ampliar.
 */
export const TAM = {
  microTitulo: 8,
  micro: 8.5,
  mini: 9.5,
  pequeno: 10,
  corpo: 11,
  medio: 12,
  titulo: 14.5,
  destaque: 19,
} as const

export const ESP = {
  paginaX: 40,
  paginaTopo: 30,
  paginaBase: 58,
  secao: 16,
  bloco: 9,
  linha: 5,
  celulaY: 5,
  celulaX: 6,
} as const

/** Altura de linha dos parágrafos longos. 1,45 compensa parte do corpo maior. */
export const ENTRELINHA = 1.45

/**
 * Versão clara da cor da marca, para fundo de realce.
 *
 * Calculada, não fixada: um hex escrito à mão só serviria para o verde padrão,
 * e o realce continuaria esverdeado quando o prestador trocasse a marca para
 * azul — quebrando a promessa de que uma variável muda o documento inteiro.
 * Aqui o react-pdf não aceita rgba em todos os contextos, então a mistura com
 * branco é feita na mão.
 *
 * @param hex cor da marca, no formato #RRGGBB
 * @param forca quanto da cor permanece (0,1 = 10% de cor, 90% de branco)
 */
export function clarear(hex: string, forca = 0.11) {
  const limpo = hex.replace('#', '')
  const canal = (inicio: number) => parseInt(limpo.slice(inicio, inicio + 2), 16)

  const misturar = (valor: number) => Math.round(valor * forca + 255 * (1 - forca))
  const doisDigitos = (valor: number) => misturar(valor).toString(16).padStart(2, '0')

  return `#${doisDigitos(canal(0))}${doisDigitos(canal(2))}${doisDigitos(canal(4))}`
}

/** Larguras da tabela de itens, em fração da largura útil. Somam 1. */
export const COLUNAS = {
  indice: 0.05,
  descricao: 0.485,
  quantidade: 0.08,
  unidade: 0.07,
  unitario: 0.145,
  total: 0.17,
} as const
