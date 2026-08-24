'use client'

import { useState } from 'react'

import { IconeCadeado, IconeIa } from '@/componentes/layout/icones'
import { Botao } from '@/componentes/ui/botao'
import { DialogoBloqueado } from '@/componentes/ui/dialogo-bloqueado'

/**
 * Um botão de recurso de IA que sabe estar trancado.
 *
 * Liberado: chama a ação, e nada denuncia que existe cadeado no mundo.
 * Bloqueado: mesmo botão, mesmo lugar, com o cadeado à direita — e o toque
 * abre a explicação em vez da ferramenta.
 *
 * O cadeado fica À DIREITA, separado do ícone de IA que fica à esquerda: os
 * dois juntos viravam um amontoado de símbolo, e o que a pessoa lê primeiro
 * tem que ser o que o botão FAZ, não que ela não pode.
 */
export function BotaoRecurso({
  liberado,
  rotulo,
  titulo,
  oQueFaz,
  checkout,
  aoUsar,
}: {
  liberado: boolean
  rotulo: string
  titulo: string
  oQueFaz: string
  checkout: string
  aoUsar: () => void
}) {
  const [explicando, setExplicando] = useState(false)

  return (
    <>
      <Botao
        type="button"
        variante="ia"
        tamanho="grande"
        larguraTotal
        onClick={() => (liberado ? aoUsar() : setExplicando(true))}
        className={liberado ? undefined : 'text-tinta-leitura'}
      >
        <IconeIa className="size-5" />
        {rotulo}
        {!liberado && <IconeCadeado className="ml-1 size-4 text-tinta-meta" />}
      </Botao>

      {/* Só quem não tem o recurso monta esta folha. */}
      {!liberado && (
        <DialogoBloqueado
          aberto={explicando}
          aoFechar={() => setExplicando(false)}
          titulo={titulo}
          oQueFaz={oQueFaz}
          checkout={checkout}
        />
      )}
    </>
  )
}
