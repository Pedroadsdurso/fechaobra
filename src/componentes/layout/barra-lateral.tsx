'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { IconeSair } from './icones'
import { ITENS_NAVEGACAO } from './navegacao'

/** Barra lateral: só aparece de md (768px) para cima. */
export function BarraLateral({ nomeEmpresa, email }: { nomeEmpresa: string; email: string }) {
  const caminho = usePathname()

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-borda md:bg-superficie">
      <div className="flex h-16 items-center border-b border-borda px-5">
        <Link href="/painel" className="text-lg font-semibold tracking-tight text-tinta">
          FechaObra
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Navegação principal">
        {ITENS_NAVEGACAO.map((item) => {
          const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`)
          const Icone = item.icone

          if (item.emBreve) {
            return (
              <span
                key={item.href}
                aria-disabled
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-tinta-suave/50"
              >
                <Icone className="size-5 shrink-0" />
                <span className="flex-1">{item.rotulo}</span>
                <span className="rounded bg-fundo px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-tinta-suave">
                  EM BREVE
                </span>
              </span>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                ativo ? 'bg-fundo text-tinta' : 'text-tinta-suave hover:bg-fundo hover:text-tinta',
              )}
            >
              <Icone className="size-5 shrink-0" />
              {item.rotulo}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-borda p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-tinta">{nomeEmpresa}</p>
          <p className="truncate text-xs text-tinta-suave">{email}</p>
        </div>

        <form action="/auth/sair" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-tinta-suave transition-colors hover:bg-fundo hover:text-tinta"
          >
            <IconeSair className="size-5 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
