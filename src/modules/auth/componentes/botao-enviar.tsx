'use client'

import { useFormStatus } from 'react-dom'

import { Botao } from '@/componentes/ui/botao'

export function BotaoEnviar({ rotulo, rotuloEnviando }: { rotulo: string; rotuloEnviando: string }) {
  const { pending } = useFormStatus()

  return (
    <Botao type="submit" tamanho="grande" larguraTotal disabled={pending}>
      {pending ? rotuloEnviando : rotulo}
    </Botao>
  )
}
