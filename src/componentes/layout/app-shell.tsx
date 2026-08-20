import type { ReactNode } from 'react'

import { BarraLateral } from './barra-lateral'
import { IconeSair } from './icones'
import { NavegacaoInferior } from './navegacao-inferior'

/**
 * Estrutura do app autenticado.
 * Celular: cabeçalho fixo no topo + navegação fixa embaixo.
 * Desktop (md+): barra lateral à esquerda, sem cabeçalho nem barra inferior.
 */
export function AppShell({
  nomeEmpresa,
  email,
  children,
}: {
  nomeEmpresa: string
  email: string
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh">
      <BarraLateral nomeEmpresa={nomeEmpresa} email={email} />

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borda bg-superficie px-4 md:hidden">
        <span className="text-base font-semibold tracking-tight text-tinta">FechaObra</span>

        <form action="/auth/sair" method="post">
          <button
            type="submit"
            aria-label="Sair da conta"
            className="-mr-2 flex size-11 items-center justify-center rounded-lg text-tinta-suave transition-colors hover:bg-fundo hover:text-tinta"
          >
            <IconeSair className="size-5" />
          </button>
        </form>
      </header>

      <main className="md:pl-60">
        {/* pb generoso no celular para o conteúdo não ficar sob a barra inferior */}
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-10">
          {children}
        </div>
      </main>

      <NavegacaoInferior />
    </div>
  )
}
