'use client'

import { useEffect, useState } from 'react'

/**
 * O espaço que sobra na tela depois do teclado.
 *
 * ===========================================================================
 * NO iOS, ABRIR O TECLADO NÃO MUDA innerHeight NEM dvh
 * ===========================================================================
 * É a raiz do problema. O teclado do iPhone não encolhe a janela de layout:
 * `window.innerHeight` continua o mesmo, `100dvh` continua o mesmo, e um
 * elemento ancorado na base da janela continua ancorado lá — atrás do
 * teclado.
 *
 * Quem enxerga o teclado é a `visualViewport`: a altura dela diminui, e o
 * `offsetTop` acompanha quando a página é empurrada para cima.
 *
 * Foi o que escondia o campo de busca da folha "Escolher cliente". Medido no
 * aparelho emulado, com a folha aberta:
 *
 *     folha   559 – 852   (293px de altura, colada na base)
 *     campo   679 – 723   (nos últimos 170px da tela)
 *
 * Com poucos clientes a folha fica baixa, e o campo cai exatamente na faixa
 * que o teclado ocupa. Nenhum código lia visualViewport — daí ninguém se
 * mexia quando ele subia.
 * ===========================================================================
 *
 * Devolve:
 *   altura  — quanto de tela sobra, em pixels
 *   teclado — quanto o teclado come na base, para descolar o que está ancorado
 */
export type EspacoVisivel = { altura: number; teclado: number }

export function useEspacoVisivel(ativo: boolean): EspacoVisivel | null {
  const [espaco, setEspaco] = useState<EspacoVisivel | null>(null)

  useEffect(() => {
    // Fechado não mede nada; quem lê trata null como "use o CSS de sempre".
    if (!ativo) return

    const medir = () => {
      const vv = window.visualViewport
      if (!vv) {
        setEspaco({ altura: window.innerHeight, teclado: 0 })
        return
      }

      /*
        A base da área visível, em coordenadas da janela de layout. O que
        estiver abaixo disso está atrás do teclado.
      */
      const baseVisivel = vv.offsetTop + vv.height
      setEspaco({
        altura: Math.round(vv.height),
        teclado: Math.max(0, Math.round(window.innerHeight - baseVisivel)),
      })
    }

    medir()

    const vv = window.visualViewport
    vv?.addEventListener('resize', medir)
    vv?.addEventListener('scroll', medir)
    window.addEventListener('resize', medir)
    window.addEventListener('orientationchange', medir)

    return () => {
      vv?.removeEventListener('resize', medir)
      vv?.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
      window.removeEventListener('orientationchange', medir)
    }
  }, [ativo])

  // Enquanto fechado, ninguém deve usar medida velha: a próxima abertura pode
  // ser com o teclado noutro estado.
  return ativo ? espaco : null
}
