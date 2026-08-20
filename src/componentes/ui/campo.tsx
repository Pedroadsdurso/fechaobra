import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type Props = ComponentProps<'input'> & {
  rotulo: string
  dica?: string
  erros?: string[]
}

export function Campo({ rotulo, dica, erros, id, className, ...props }: Props) {
  const identificador = id ?? props.name
  const idErro = `${identificador}-erro`
  const idDica = `${identificador}-dica`
  const temErro = Boolean(erros?.length)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={identificador} className="text-sm font-medium text-tinta">
        {rotulo}
      </label>

      <input
        id={identificador}
        aria-invalid={temErro || undefined}
        aria-describedby={cn(temErro && idErro, dica && idDica) || undefined}
        className={cn(
          // text-base (16px) não é estética: abaixo disso o Safari do iPhone
          // dá zoom automático ao focar o campo.
          'min-h-11 w-full rounded-lg border bg-superficie px-3 text-base text-tinta',
          'placeholder:text-tinta-suave/60',
          'outline-none transition-colors',
          'focus:border-marca focus:ring-2 focus:ring-marca/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          temErro ? 'border-perigo focus:border-perigo focus:ring-perigo/20' : 'border-borda',
          className,
        )}
        {...props}
      />

      {dica && !temErro && (
        <p id={idDica} className="text-xs text-tinta-suave">
          {dica}
        </p>
      )}

      {temErro && (
        <p id={idErro} className="text-xs font-medium text-perigo">
          {erros![0]}
        </p>
      )}
    </div>
  )
}
