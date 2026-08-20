import type { Metadata } from 'next'

import { BotaoNovoOrcamento } from '@/modules/orcamentos/componentes/botao-novo-orcamento'
import { ListaOrcamentos } from '@/modules/orcamentos/componentes/lista-orcamentos'
import { listarOrcamentos } from '@/modules/orcamentos/consultas'

export const metadata: Metadata = { title: 'Orçamentos' }

export default async function PaginaOrcamentos() {
  const orcamentos = await listarOrcamentos()
  const reais = orcamentos.filter((o) => !o.vazio).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-tinta sm:text-2xl">Orçamentos</h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {orcamentos.length === 0
              ? 'Comece pelo primeiro.'
              : `${reais} ${reais === 1 ? 'orçamento' : 'orçamentos'}. O que precisa de você vem primeiro.`}
          </p>
        </div>

        {orcamentos.length > 0 && <BotaoNovoOrcamento />}
      </div>

      <ListaOrcamentos orcamentos={orcamentos} />
    </div>
  )
}
