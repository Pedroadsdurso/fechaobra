'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Alerta } from '@/componentes/ui/alerta'
import { Botao } from '@/componentes/ui/botao'
import { Campo } from '@/componentes/ui/campo'
import { formatarTelefone } from '@/lib/utils'
import { atualizarCliente, criarCliente } from '@/modules/clientes/acoes'
import { ESTADO_CLIENTE_INICIAL } from '@/modules/clientes/estado'
import type { Cliente } from '@/modules/clientes/tipos'

function BotaoSalvar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus()

  return (
    <Botao type="submit" tamanho="grande" larguraTotal disabled={pending}>
      {pending ? 'Salvando…' : rotulo}
    </Botao>
  )
}

/**
 * Formulário de cliente, usado em dois lugares: na página de clientes e dentro
 * do diálogo que abre a partir do orçamento. Por isso ele não sabe navegar —
 * só avisa quem chamou, por `aoConcluir`, com o cliente já salvo.
 */
export function FormularioCliente({
  cliente,
  aoConcluir,
  aoCancelar,
  nomeInicial,
}: {
  cliente?: Cliente
  aoConcluir: (cliente: Cliente) => void
  aoCancelar?: () => void
  /** Pré-preenche o nome. Usado quando o usuário digitou na busca e não achou. */
  nomeInicial?: string
}) {
  const editando = Boolean(cliente)
  const [estado, acao] = useActionState(
    editando ? atualizarCliente : criarCliente,
    ESTADO_CLIENTE_INICIAL,
  )

  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')

  useEffect(() => {
    if (estado.ok && estado.cliente) aoConcluir(estado.cliente)
    // aoConcluir muda de identidade a cada render de quem chama; incluí-lo nas
    // dependências redispararia o efeito à toa. O gatilho é o estado da action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  const erros = estado.errosPorCampo

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      {estado.erro && <Alerta tom="erro">{estado.erro}</Alerta>}

      <Campo
        rotulo="Nome"
        name="nome"
        defaultValue={cliente?.nome ?? nomeInicial ?? ''}
        autoComplete="name"
        placeholder="Nome do cliente"
        erros={erros?.nome}
        autoFocus
        required
      />

      <Campo
        rotulo="Telefone (opcional)"
        name="telefone"
        value={telefone}
        onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 98765-4321"
        erros={erros?.telefone}
      />

      <Campo
        rotulo="E-mail (opcional)"
        name="email"
        defaultValue={cliente?.email ?? ''}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="cliente@email.com"
        erros={erros?.email}
      />

      <Campo
        rotulo="Endereço (opcional)"
        name="endereco"
        defaultValue={cliente?.endereco ?? ''}
        autoComplete="street-address"
        placeholder="Rua, número — bairro, cidade/UF"
        dica="Só o nome é obrigatório. O cliente completa o resto ao aceitar o orçamento."
        erros={erros?.endereco}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {aoCancelar && (
          <Botao type="button" variante="secundario" tamanho="grande" onClick={aoCancelar}>
            Cancelar
          </Botao>
        )}
        <BotaoSalvar rotulo={editando ? 'Salvar alterações' : 'Cadastrar cliente'} />
      </div>
    </form>
  )
}
