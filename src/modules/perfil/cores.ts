/**
 * Paleta de partida da marca.
 *
 * Oito cores escuras o bastante para o texto branco em cima passar em
 * contraste, e sóbrias o bastante para um orçamento — nada de tom fluorescente
 * que faz o documento parecer panfleto. O campo hex livre continua existindo
 * para quem já tem identidade visual.
 */
export const CORES_MARCA = [
  { valor: '#0B3D2E', nome: 'Verde obra' },
  { valor: '#14532D', nome: 'Verde mata' },
  { valor: '#1D4ED8', nome: 'Azul' },
  { valor: '#1E3A5F', nome: 'Azul marinho' },
  { valor: '#7F1D1D', nome: 'Bordô' },
  { valor: '#9A3412', nome: 'Terracota' },
  { valor: '#4C1D95', nome: 'Roxo' },
  { valor: '#1F2937', nome: 'Grafite' },
] as const

export const COR_PADRAO = CORES_MARCA[0].valor

/** #RGB ou #RRGGBB, com ou sem cerquilha. */
export const PADRAO_HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Normaliza para #RRGGBB maiúsculo. Devolve null se não for hex válido. */
export function normalizarHex(entrada: string): string | null {
  const limpo = entrada.trim()
  if (!PADRAO_HEX.test(limpo)) return null

  const semCerquilha = limpo.replace('#', '')
  const seisDigitos =
    semCerquilha.length === 3
      ? semCerquilha
          .split('')
          .map((c) => c + c)
          .join('')
      : semCerquilha

  return `#${seisDigitos.toUpperCase()}`
}

/**
 * Luminância relativa (WCAG). Usada para avisar quando a cor escolhida é clara
 * demais — o documento escreve em branco por cima dela.
 */
export function ehClaraDemais(hex: string) {
  const normal = normalizarHex(hex)
  if (!normal) return false

  const canal = (inicio: number) => {
    const v = parseInt(normal.slice(inicio, inicio + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }

  const luminancia = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
  // Contraste com branco = 1.05 / (L + 0.05). Abaixo de 4.5:1 fica ruim.
  return 1.05 / (luminancia + 0.05) < 4.5
}
