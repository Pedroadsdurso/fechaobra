'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * A folga que o formulário precisa ter embaixo para nada ficar atrás da barra.
 *
 * ===========================================================================
 * POR QUE NÃO DÁ PARA USAR VALOR FIXO
 * ===========================================================================
 * Havia um espaçador de altura fixa (80px). A barra de baixo mede menos que
 * isso quando traz só os botões, e MAIS quando traz a frase de pendência —
 * que quebra em duas linhas em tela de 393px ("Falta escolher o cliente e
 * incluir ao menos 1 item"). Nesse estado a barra cobria o campo "Prazo de
 * execução": o rótulo aparecia, o input ficava atrás, e não havia rolagem
 * que alcançasse, porque o conteúdo simplesmente acabava ali.
 *
 * É o caminho principal do app — orçamento em rascunho, sem cliente e sem
 * itens, que é exatamente como todo orçamento começa.
 *
 * O valor certo não é uma constante: depende do texto da barra, da altura da
 * navegação inferior e da área segura do aparelho. Então é medido.
 * ===========================================================================
 *
 * A MEDIDA: para um elemento `position: fixed`, `innerHeight - rect.top` é
 * exatamente o espaço que ele ocupa contado da base da janela — já incluindo
 * o deslocamento dele (a navegação inferior e o safe-area-inset-bottom, que
 * entram no `bottom` da barra). Uma conta só cobre os três.
 */

/** Folga além da barra, para o campo não encostar nela. */
const RESPIRO = 24

export function useFolgaDaBarra(barra: RefObject<HTMLElement | null>) {
  const [folga, setFolga] = useState(0)

  useEffect(() => {
    const elemento = barra.current
    if (!elemento) return

    const medir = () => {
      const retangulo = elemento.getBoundingClientRect()
      // Barra escondida (desktop) não pede folga nenhuma.
      if (retangulo.height === 0) return setFolga(0)

      /*
        visualViewport, quando existe, é o que enxerga o teclado do iPhone
        aberto: window.innerHeight não muda quando ele sobe, e usar só ela
        deixaria o campo focado atrás do teclado.
      */
      const alturaVisivel = window.visualViewport?.height ?? window.innerHeight
      setFolga(Math.max(0, Math.round(alturaVisivel - retangulo.top) + RESPIRO))
    }

    medir()

    // A barra muda de altura sozinha: a frase de pendência aparece e some
    // conforme o orçamento fica pronto, e quebra de linha conforme a largura.
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)

    window.addEventListener('resize', medir)
    window.addEventListener('orientationchange', medir)
    window.visualViewport?.addEventListener('resize', medir)
    window.visualViewport?.addEventListener('scroll', medir)

    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
      window.removeEventListener('orientationchange', medir)
      window.visualViewport?.removeEventListener('resize', medir)
      window.visualViewport?.removeEventListener('scroll', medir)
    }
  }, [barra])

  return folga
}
