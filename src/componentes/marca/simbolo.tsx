/**
 * O símbolo da identidade — 1a, "O Selo".
 *
 * Check de terminais retos dentro de uma moldura sólida: o gesto de orçamento
 * aprovado. Traçado em currentColor, então herda a cor de quem o contém e não
 * precisa de variante clara/escura.
 *
 * Vem inline, nunca como <img>: sem requisição, sem piscar, e a cor acompanha
 * o tema. Ver a nota em logotipo.tsx sobre onde ele NÃO pode aparecer.
 */
export function SimboloFechaObra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      <rect x="9" y="9" width="82" height="82" rx="20" stroke="currentColor" strokeWidth="9" />
      <path d="M31 52 45 66 70 37" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
    </svg>
  )
}
