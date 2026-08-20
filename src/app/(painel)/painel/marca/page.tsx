import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FormularioMarca } from '@/modules/perfil/componentes/formulario-marca'
import { carregarMarca } from '@/modules/perfil/consultas'

export const metadata: Metadata = { title: 'Sua marca' }

export default async function PaginaMarca() {
  const marca = await carregarMarca()
  if (!marca) redirect('/entrar')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tinta sm:text-2xl">
          {marca.primeiraVez ? 'Vamos deixar o orçamento com a sua cara' : 'Sua marca'}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-tinta-suave">
          {marca.primeiraVez
            ? 'Leva dois minutos e vale para todos os orçamentos que você mandar. Dá para pular e ajustar depois, mas é isso que separa o seu orçamento do bilhete de papel do concorrente.'
            : 'Estes dados aparecem no topo de todo orçamento que você gera.'}
        </p>
      </div>

      <FormularioMarca marca={marca} />
    </div>
  )
}
