'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Alerta } from '@/componentes/ui/alerta'
import { Campo } from '@/componentes/ui/campo'
import { entrar } from '@/modules/auth/acoes'
import { ESTADO_INICIAL } from '@/modules/auth/estado'

import { BotaoEnviar } from './botao-enviar'

export function FormularioLogin({ proximo }: { proximo?: string }) {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL)

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {proximo && <input type="hidden" name="proximo" value={proximo} />}

      {estado.erro && <Alerta tom="erro">{estado.erro}</Alerta>}

      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="voce@email.com"
        erros={estado.errosPorCampo?.email}
        required
      />

      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        erros={estado.errosPorCampo?.senha}
        required
      />

      <BotaoEnviar rotulo="Entrar" rotuloEnviando="Entrando..." />

      <p className="text-center text-sm text-tinta-suave">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-tinta underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
