'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { hrefAtivo, ITENS_NAVEGACAO } from './navegacao'

/** Navegação inferior: o padrão no celular, que é onde o app vive. */
export function NavegacaoInferior() {
  const caminho = usePathname()
  const ativoAgora = hrefAtivo(caminho)

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {ITENS_NAVEGACAO.map((item) => {
          const ativo = ativoAgora === item.href
          const Icone = item.icone

          const conteudo = (
            <>
              <Icone className="size-6" />
              <span className="text-[11px] leading-none">{item.rotulo}</span>
            </>
          )

          return (
            <li key={item.href} className="flex-1">
              {item.emBreve ? (
                <span
                  aria-disabled
                  className="flex min-h-14 cursor-not-allowed flex-col items-center justify-center gap-1 text-tinta-suave/40"
                >
                  {conteudo}
                </span>
              ) : (
                <Link
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 transition-colors',
                    ativo ? 'text-tinta' : 'text-tinta-suave',
                  )}
                >
                  {conteudo}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
