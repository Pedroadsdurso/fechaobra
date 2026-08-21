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

      {/*
        O aviso fica COLADO no campo de e-mail, não no rodapé da página.

        O acesso é liberado por e-mail: quem compra com um e outro se cadastra
        com outro fica sem acesso e não tem como saber por quê. É a principal
        fonte de suporte deste modelo, e o lugar de evitá-la é aqui, no
        momento exato em que a pessoa digita — não numa letra miúda que
        ninguém lê depois de já ter errado.
      */}
      <p className="-mt-1 rounded-lg border border-atencao/30 bg-atencao/5 px-3 py-2 text-xs leading-relaxed text-atencao-forte">
        <strong className="font-bold">Use o mesmo e-mail da compra.</strong> É por ele que o acesso
        é liberado — com um e-mail diferente, a compra não encontra esta conta.
      </p>

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
