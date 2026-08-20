/**
 * Formatação pt-BR do documento.
 *
 * Intl.NumberFormat com pt-BR insere espaço estreito não separável (U+00A0)
 * entre "R$" e o número. Em algumas fontes isso vira um vão largo demais na
 * célula da tabela, então normalizo para espaço simples.
 */

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
    .format(valor)
    .replace(/ /g, ' ')
}

/** Sem o "R$", para colunas onde o símbolo já aparece no cabeçalho. */
export function formatarNumero(valor: number, casas = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

/** Quantidade sem casas inúteis: 2 vira "2", 2.5 vira "2,5". */
export function formatarQuantidade(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(valor)
}

/**
 * "2026-08-19" -> "19/08/2026".
 * Monta a data pelos componentes em vez de new Date(iso), que interpretaria
 * a string como UTC e voltaria um dia em fuso negativo como o do Brasil.
 */
export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Transforma o parágrafo corrido do seed em marcadores, sem inventar texto:
 * separa a frase de abertura (até o primeiro ":") e quebra o resto nos ";".
 * Usado nas exclusões, onde a leitura em lista evita discussão depois.
 */
export function emMarcadores(texto: string): { abertura: string; itens: string[] } {
  const corte = texto.indexOf(':')
  if (corte === -1) return { abertura: '', itens: [texto] }

  const abertura = texto.slice(0, corte + 1).trim()
  const itens = texto
    .slice(corte + 1)
    .split(';')
    .map((parte) =>
      parte
        .trim()
        .replace(/\.$/, '')
        // O último trecho da enumeração vem com "e ..." / "ou ...". Solto num
        // marcador, "E a hospedagem de móveis" fica com cara de frase cortada.
        .replace(/^(e|ou)\s+/i, ''),
    )
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))

  return { abertura, itens }
}
