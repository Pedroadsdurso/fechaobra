import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'
type Tamanho = 'medio' | 'grande'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-white hover:bg-marca-forte active:bg-marca-forte',
  secundario: 'bg-superficie text-tinta border border-borda hover:bg-fundo active:bg-fundo',
  fantasma: 'bg-transparent text-tinta-suave hover:bg-fundo hover:text-tinta',
  perigo: 'bg-transparent text-perigo border border-perigo/30 hover:bg-perigo/5',
}

const TAMANHOS: Record<Tamanho, string> = {
  // 44px de altura mínima: alvo de toque confortável no celular, de luva, no canteiro.
  medio: 'min-h-11 px-4 text-sm',
  grande: 'min-h-12 px-5 text-base',
}

type Props = ComponentProps<'button'> & {
  variante?: Variante
  tamanho?: Tamanho
  larguraTotal?: boolean
}

export function Botao({
  variante = 'primario',
  tamanho = 'medio',
  larguraTotal = false,
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraTotal && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
