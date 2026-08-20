import { cn } from '@/lib/utils'

/**
 * Bloco cinza no lugar do conteúdo que ainda está vindo.
 *
 * Existe porque a espera é real: medida em produção, uma navegação no painel
 * gasta 176–209 ms de rede em wifi, e bem mais no 4G. Sem isto, esse intervalo
 * é tela branca — e tela branca não diz se o app está trabalhando ou travou.
 *
 * O esqueleto tem a forma aproximada do que vai chegar, então a tela não dá
 * um salto quando o conteúdo entra.
 */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('fo-esqueleto rounded-md bg-borda/70', className)}
    />
  )
}

/** Cabeçalho de página: título e uma linha de apoio. */
export function EsqueletoTitulo() {
  return (
    <div className="flex flex-col gap-2">
      <Esqueleto className="h-7 w-48" />
      <Esqueleto className="h-4 w-64" />
    </div>
  )
}

/** Cartão da lista de orçamentos ou de clientes. */
export function EsqueletoCartao() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4">
      <div className="flex items-start justify-between gap-3">
        <Esqueleto className="h-5 w-40" />
        <Esqueleto className="h-5 w-16" />
      </div>
      <Esqueleto className="h-4 w-56" />
      <div className="flex gap-2">
        <Esqueleto className="h-9 w-28" />
        <Esqueleto className="h-9 w-24" />
      </div>
    </div>
  )
}
