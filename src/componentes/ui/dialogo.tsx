'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Diálogo modal em cima do <dialog> nativo.
 *
 * O elemento nativo entrega de graça o que costuma sair errado numa
 * implementação manual: prende o foco dentro do modal, devolve o foco ao
 * fechar, fecha no Esc e bloqueia o conteúdo de trás para leitores de tela.
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  const referencia = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return

    if (aberto && !dialogo.open) {
      dialogo.showModal()

      // O <dialog> nativo foca o primeiro elemento focável do seu conteúdo —
      // que aqui é o botão de fechar, por vir antes no DOM. Resultado: abrir
      // "Editar" deixava o foco no X, o Enter fechava o modal em vez de
      // salvar, e no celular o teclado nem subia. Foco vai para o primeiro
      // campo de fato editável.
      const primeiroCampo = dialogo.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      )
      primeiroCampo?.focus()
    }

    if (!aberto && dialogo.open) {
      /*
        close() é imediato: o modal sumiria de estalo. Marcamos o elemento,
        o CSS toca a saída, e só então fechamos de verdade.

        O tempo limite é rede de segurança: se a animação não rodar — por
        prefers-reduced-motion, que a encurta para 0.01ms, ou por qualquer
        motivo em que animationend não dispare — o diálogo fecha assim mesmo.
        Um modal que não fecha é pior do que um modal sem animação.
      */
      dialogo.setAttribute('data-fechando', '')

      let encerrado = false
      const encerrar = () => {
        if (encerrado) return
        encerrado = true
        dialogo.removeAttribute('data-fechando')
        if (dialogo.open) dialogo.close()
      }

      dialogo.addEventListener('animationend', encerrar, { once: true })
      const rede = setTimeout(encerrar, 300)

      return () => {
        clearTimeout(rede)
        dialogo.removeEventListener('animationend', encerrar)
        encerrar()
      }
    }
  }, [aberto])

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return

    // O Esc fecha o <dialog> por conta própria, sem passar pelo React. Sem
    // ouvir o evento, o estado de quem chamou ficaria dizendo "aberto".
    const aoCancelar = (evento: Event) => {
      evento.preventDefault()
      aoFechar()
    }
    dialogo.addEventListener('cancel', aoCancelar)
    return () => dialogo.removeEventListener('cancel', aoCancelar)
  }, [aoFechar])

  return (
    <dialog
      ref={referencia}
      aria-labelledby="titulo-dialogo"
      onClick={(evento) => {
        // Clique no ::backdrop chega no próprio <dialog>, não nos filhos.
        if (evento.target === referencia.current) aoFechar()
      }}
      /*
        `m-auto` não é decoração: o <dialog> nativo se centraliza sozinho por
        margin auto, e o reset do Tailwind zera a margem de todo elemento —
        sem isso o modal cola no canto superior esquerdo da tela.
        No celular, mt-auto com mb-0 joga o painel para baixo, ao alcance do
        polegar, no formato de folha que o sistema usa.
      */
      className="
        m-auto w-full max-w-lg rounded-2xl border border-borda bg-superficie p-0
        backdrop:bg-black/40
        max-sm:mt-auto max-sm:mb-0 max-sm:max-h-[92dvh] max-sm:rounded-b-none
      "
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
          <div className="min-w-0">
            <h2 id="titulo-dialogo" className="text-base font-semibold text-tinta">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-sm text-tinta-suave">{descricao}</p>}
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-tinta-suave transition-colors hover:bg-fundo hover:text-tinta"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  )
}
