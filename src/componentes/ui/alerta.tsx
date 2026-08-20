import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const TONS = {
  erro: 'border-perigo/25 bg-perigo/5 text-perigo',
  aviso: 'border-atencao/30 bg-atencao/10 text-atencao-forte',
  info: 'border-borda bg-fundo text-tinta-suave',
} as const

export function Alerta({
  tom = 'erro',
  children,
}: {
  tom?: keyof typeof TONS
  children: ReactNode
}) {
  return (
    <div role="alert" className={cn('rounded-lg border px-3 py-2.5 text-sm', TONS[tom])}>
      {children}
    </div>
  )
}
