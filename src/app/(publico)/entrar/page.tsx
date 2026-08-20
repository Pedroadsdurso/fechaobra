import type { Metadata } from 'next'

import { FormularioLogin } from '@/modules/auth/componentes/formulario-login'

export const metadata: Metadata = { title: 'Entrar' }

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>
}) {
  const { proximo } = await searchParams

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-tinta">Entrar</h1>
      <p className="mb-5 text-sm text-tinta-suave">Acesse sua conta para montar orçamentos.</p>
      <FormularioLogin proximo={proximo} />
    </>
  )
}
