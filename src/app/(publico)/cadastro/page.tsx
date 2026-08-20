import type { Metadata } from 'next'

import { FormularioCadastro } from '@/modules/auth/componentes/formulario-cadastro'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function PaginaCadastro({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>
}) {
  const { proximo } = await searchParams

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-tinta">Criar conta</h1>
      <p className="mb-5 text-sm text-tinta-suave">
        Leva menos de um minuto. Você já entra direto no painel.
      </p>
      <FormularioCadastro proximo={proximo} />
    </>
  )
}
