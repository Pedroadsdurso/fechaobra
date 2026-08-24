import type { SVGProps } from 'react'

/** Ícones inline: sem dependência externa, sem peso extra no bundle. */
const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconePainel(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function IconeOrcamentos(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

export function IconeClientes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.4 5.4 0 0 0-2-4.2" />
    </svg>
  )
}

export function IconeBiblioteca(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M11 4h3.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11z" />
      <path d="m18 6.5 2 12" />
    </svg>
  )
}

export function IconeConfiguracoes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  )
}

export function IconeSair(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M15 17v1.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </svg>
  )
}

/**
 * Os três brilhos, convenção que o público já associa a IA.
 *
 * Estrelas de quatro pontas com lados côncavos, em tamanhos diferentes, no
 * mesmo traço de 1.75 do resto do conjunto — não 1.5, para o ícone pertencer à
 * família: ao lado de `IconePainel` na barra inferior, meio ponto de diferença
 * aparece.
 *
 * Sem preenchimento e sem gradiente. O destaque do botão de IA vem de borda e
 * peso, não de cor nova: a paleta é neutra mais vermelho, laranja e verde, e
 * laranja é do CTA de envio. Inventar um roxo "de IA" seria exatamente o
 * enfeite de que este público desconfia.
 */
export function IconeIa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 4.5C9.5 8.46 11.54 10.5 15.5 10.5C11.54 10.5 9.5 12.54 9.5 16.5C9.5 12.54 7.46 10.5 3.5 10.5C7.46 10.5 9.5 8.46 9.5 4.5Z" />
      <path d="M18 2.5C18 4.48 19.02 5.5 21 5.5C19.02 5.5 18 6.52 18 8.5C18 6.52 16.98 5.5 15 5.5C16.98 5.5 18 4.48 18 2.5Z" />
      <path d="M17.5 14.6C17.5 16.18 18.32 17 19.9 17C18.32 17 17.5 17.82 17.5 19.4C17.5 17.82 16.68 17 15.1 17C16.68 17 17.5 16.18 17.5 14.6Z" />
    </svg>
  )
}

/** Cadeado fechado, mesmo traço do conjunto. Discreto: o recurso é oferta, não aviso. */
export function IconeCadeado(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
