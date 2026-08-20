import type { Metadata } from 'next'

import { ListaClientes } from '@/modules/clientes/componentes/lista-clientes'
import { listarClientes } from '@/modules/clientes/consultas'

export const metadata: Metadata = { title: 'Clientes' }

export default async function PaginaClientes() {
  const clientes = await listarClientes()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tinta sm:text-2xl">Clientes</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          {clientes.length === 0
            ? 'Sua agenda começa aqui.'
            : `${clientes.length} ${clientes.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}.`}
        </p>
      </div>

      <ListaClientes clientes={clientes} />
    </div>
  )
}
