'use client'

import { useEffect, useRef, useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'

/**
 * Os textos longos do orçamento, dobrados em linhas de resumo.
 *
 * Antes eram cinco textareas de seis linhas, empilhadas. Somavam mais altura
 * de tela do que cliente e itens juntos — o que o prestador PRECISA preencher
 * ficava soterrado pelo que já vinha pronto e que ele quase nunca ajusta.
 *
 * Cada linha mostra o rótulo e o começo do texto, o suficiente para conferir
 * sem abrir. Quem quiser ajustar toca e edita em tela cheia, com espaço de
 * verdade — melhor do que uma caixinha de seis linhas no meio da rolagem.
 *
 * O valor continua indo direto para o mesmo estado do editor: nada aqui muda
 * o que é salvo nem quando. O autosave segue exatamente como estava.
 */

export type TextoDobrado = {
  chave: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  /** Texto que veio do modelo, quando conhecido. Serve só para marcar "Editado". */
  padrao?: string
  linhas?: number
}

function resumir(texto: string) {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo || 'Vazio — toque para escrever'
}

export function TextosDobrados({ textos }: { textos: TextoDobrado[] }) {
  const [aberto, setAberto] = useState<string | null>(null)
  const emEdicao = textos.find((t) => t.chave === aberto) ?? null

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
        {textos.map((texto, i) => {
          const editado = texto.padrao !== undefined && texto.valor.trim() !== texto.padrao.trim()

          return (
            <button
              key={texto.chave}
              type="button"
              onClick={() => setAberto(texto.chave)}
              className={cnLinha(i < textos.length - 1)}
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold text-tinta">{texto.rotulo}</span>
                <span className="mt-0.5 block truncate text-xs text-tinta-meta">
                  {resumir(texto.valor)}
                </span>
              </span>

              {editado && (
                <span className="shrink-0 rounded-[4px] bg-sucesso/10 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-sucesso uppercase">
                  Editado
                </span>
              )}

              <span aria-hidden className="shrink-0 text-base text-tinta-suave/70">
                ›
              </span>
            </button>
          )
        })}
      </div>

      {emEdicao && (
        <EditorDeTexto
          key={emEdicao.chave}
          texto={emEdicao}
          aoFechar={() => setAberto(null)}
        />
      )}
    </>
  )
}

function cnLinha(temBorda: boolean) {
  return [
    'fo-toque flex w-full items-center gap-2.5 px-3.5 py-3 text-left',
    'min-h-14 hover:bg-fundo/60',
    temBorda ? 'border-b border-linha' : '',
  ].join(' ')
}

/**
 * A edição em tela cheia.
 *
 * Guarda o valor num estado próprio e só devolve ao editor no "Pronto": sem
 * isso, cada tecla dentro do diálogo dispararia o autosave do orçamento
 * inteiro. Cancelar simplesmente descarta.
 */
function EditorDeTexto({ texto, aoFechar }: { texto: TextoDobrado; aoFechar: () => void }) {
  const [rascunho, setRascunho] = useState(texto.valor)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // O <dialog> foca o primeiro campo, mas o cursor cai no começo. Quem abre
    // isto quase sempre quer acrescentar no fim.
    const area = campo.current
    if (!area) return
    area.focus()
    area.setSelectionRange(area.value.length, area.value.length)
  }, [])

  function salvar() {
    texto.aoMudar(rascunho)
    aoFechar()
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={texto.rotulo}
      descricao="É o texto que sai no documento e na página do cliente."
    >
      <div className="flex flex-col gap-3">
        <textarea
          ref={campo}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          rows={texto.linhas ?? 12}
          className="w-full rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
        />

        <div className="flex gap-2">
          <Botao type="button" variante="secundario" onClick={aoFechar} className="flex-1">
            Cancelar
          </Botao>
          <Botao type="button" onClick={salvar} className="flex-1">
            Pronto
          </Botao>
        </div>
      </div>
    </Dialogo>
  )
}
