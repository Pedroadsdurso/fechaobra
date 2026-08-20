'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Alerta } from '@/componentes/ui/alerta'
import { Campo } from '@/componentes/ui/campo'
import { cadastrar } from '@/modules/auth/acoes'
import { ESTADO_INICIAL } from '@/modules/auth/estado'

import { BotaoEnviar } from './botao-enviar'

export function FormularioCadastro({ proximo }: { proximo?: string }) {
  const [estado, acao] = useActionState(cadastrar, ESTADO_INICIAL)

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {proximo && <input type="hidden" name="proximo" value={proximo} />}

      {estado.erro && <Alerta tom="erro">{estado.erro}</Alerta>}
      {estado.aviso && <Alerta tom="aviso">{estado.aviso}</Alerta>}

      <Campo
        rotulo="Nome da empresa"
        name="nomeEmpresa"
        type="text"
        autoComplete="organization"
        placeholder="Ex.: Silva Reformas"
        dica="É o nome que vai aparecer no topo dos seus orçamentos."
        erros={estado.errosPorCampo?.nomeEmpresa}
        required
      />

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
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        erros={estado.errosPorCampo?.senha}
        required
      />

      <BotaoEnviar rotulo="Criar conta" rotuloEnviando="Criando conta..." />

      <p className="text-center text-sm text-tinta-suave">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-tinta underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  )
}
