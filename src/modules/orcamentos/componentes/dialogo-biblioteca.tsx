'use client'

import { useMemo, useState, useTransition } from 'react'

import { Dialogo } from '@/componentes/ui/dialogo'
import { formatarMoeda } from '@/lib/utils'

import { apagarItemBiblioteca } from '../acoes'
import type { ItemBiblioteca } from '../tipos'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Catálogo pessoal de itens.
 *
 * É o que faz o segundo orçamento sair em um minuto: o preço do metro de
 * porcelanato assentado é o mesmo na semana que vem, e ninguém quer digitar
 * de novo.
 */
export function DialogoBiblioteca({
  aberto,
  aoFechar,
  itens,
  aoEscolher,
  aoRemover,
}: {
  aberto: boolean
  aoFechar: () => void
  itens: ItemBiblioteca[]
  aoEscolher: (item: ItemBiblioteca) => void
  aoRemover: (id: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [pendente, iniciar] = useTransition()

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return itens
    return itens.filter((i) => normalizar(i.descricao).includes(termo))
  }, [itens, busca])

  function remover(id: string) {
    iniciar(async () => {
      await apagarItemBiblioteca(id)
      aoRemover(id)
    })
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Sua biblioteca"
      descricao="Itens que você já usou antes. Tocar adiciona ao orçamento."
    >
      <div className="flex flex-col gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="search"
          placeholder="Buscar item"
          aria-label="Buscar item na biblioteca"
          className="min-h-11 w-full rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
        />

        {itens.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-tinta-suave">
            Sua biblioteca está vazia. Use “Guardar na biblioteca” em qualquer item do orçamento e
            ele fica salvo para a próxima.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-tinta-suave">
            Nenhum item com “{busca.trim()}”.
          </p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {filtrados.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => aoEscolher(item)}
                  className="flex min-h-12 flex-1 flex-col justify-center rounded-lg px-3 py-2 text-left transition-colors hover:bg-fundo"
                >
                  <span className="text-sm font-medium text-tinta">{item.descricao}</span>
                  <span className="text-xs text-tinta-suave">
                    {formatarMoeda(item.valorUnitario)} / {item.unidade} ·{' '}
                    {item.tipo === 'material' ? 'Material' : 'Mão de obra'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => remover(item.id)}
                  disabled={pendente}
                  aria-label={`Remover ${item.descricao} da biblioteca`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-tinta-suave transition-colors hover:bg-perigo/5 hover:text-perigo disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialogo>
  )
}
