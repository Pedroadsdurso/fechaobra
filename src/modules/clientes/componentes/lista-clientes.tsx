'use client'

import { useMemo, useState, useTransition } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import { IconeClientes } from '@/componentes/layout/icones'
import { cn } from '@/lib/utils'
import { apagarCliente } from '@/modules/clientes/acoes'
import type { Cliente, ClienteComUso } from '@/modules/clientes/tipos'

import { FormularioCliente } from './formulario-cliente'

/** Ignora acento e caixa: "jose" acha "José". */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function ListaClientes({ clientes }: { clientes: ClienteComUso[] }) {
  const [busca, setBusca] = useState('')
  const [emEdicao, setEmEdicao] = useState<Cliente | null>(null)
  const [criando, setCriando] = useState(false)
  const [aConfirmar, setAConfirmar] = useState<ClienteComUso | null>(null)
  const [pendente, iniciar] = useTransition()

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return clientes

    // Compara também só os dígitos: quem busca "98765" acha "(11) 98765-4321".
    const digitos = busca.replace(/\D/g, '')

    return clientes.filter((c) => {
      const alvo = normalizar(`${c.nome} ${c.email} ${c.endereco}`)
      const telefone = c.telefone.replace(/\D/g, '')
      return alvo.includes(termo) || (digitos.length >= 3 && telefone.includes(digitos))
    })
  }, [clientes, busca])

  function confirmarExclusao() {
    if (!aConfirmar) return
    const id = aConfirmar.id
    iniciar(async () => {
      await apagarCliente(id)
      setAConfirmar(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="search"
          inputMode="search"
          placeholder="Buscar por nome, telefone ou e-mail"
          aria-label="Buscar cliente"
          className="min-h-11 flex-1 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none transition-colors placeholder:text-tinta-suave/60 focus:border-marca focus:ring-2 focus:ring-marca/20"
        />

        <Botao tamanho="grande" onClick={() => setCriando(true)} className="sm:w-auto">
          Novo cliente
        </Botao>
      </div>

      {clientes.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-borda bg-superficie px-6 py-12 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-fundo text-tinta-suave">
            <IconeClientes className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-tinta">Nenhum cliente ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-tinta-suave">
            Você também pode cadastrar um cliente direto na tela do orçamento, sem passar por aqui.
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-borda bg-superficie px-6 py-10 text-center">
          <p className="text-sm text-tinta-suave">
            Nenhum cliente encontrado para <span className="font-medium text-tinta">{busca}</span>.
          </p>
          <div className="mt-4">
            <Botao variante="secundario" onClick={() => setCriando(true)}>
              Cadastrar “{busca.trim()}”
            </Botao>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((cliente) => (
            <li
              key={cliente.id}
              className="flex items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-tinta">{cliente.nome}</p>
                <p className="mt-0.5 truncate text-xs text-tinta-suave">
                  {[cliente.telefone, cliente.email].filter(Boolean).join('  ·  ') || 'Sem contato'}
                </p>
                {cliente.endereco && (
                  <p className="mt-0.5 truncate text-xs text-tinta-suave">{cliente.endereco}</p>
                )}
              </div>

              {cliente.orcamentos > 0 && (
                <span className="shrink-0 rounded-full bg-fundo px-2 py-0.5 text-[11px] font-medium text-tinta-suave">
                  {cliente.orcamentos} {cliente.orcamentos === 1 ? 'orçamento' : 'orçamentos'}
                </span>
              )}

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEmEdicao(cliente)}
                  aria-label={`Editar ${cliente.nome}`}
                  className="flex size-11 items-center justify-center rounded-lg text-tinta-suave transition-colors hover:bg-fundo hover:text-tinta"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setAConfirmar(cliente)}
                  aria-label={`Apagar ${cliente.nome}`}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-lg text-tinta-suave transition-colors',
                    'hover:bg-perigo/5 hover:text-perigo',
                  )}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialogo
        aberto={criando}
        aoFechar={() => setCriando(false)}
        titulo="Novo cliente"
        descricao="Só o nome é obrigatório. O resto dá para completar depois."
      >
        <FormularioCliente
          nomeInicial={busca.trim() || undefined}
          aoConcluir={() => {
            setCriando(false)
            setBusca('')
          }}
          aoCancelar={() => setCriando(false)}
        />
      </Dialogo>

      <Dialogo
        aberto={Boolean(emEdicao)}
        aoFechar={() => setEmEdicao(null)}
        titulo="Editar cliente"
      >
        {emEdicao && (
          <FormularioCliente
            cliente={emEdicao}
            aoConcluir={() => setEmEdicao(null)}
            aoCancelar={() => setEmEdicao(null)}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={Boolean(aConfirmar)}
        aoFechar={() => setAConfirmar(null)}
        titulo="Apagar cliente"
      >
        {aConfirmar && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tinta-suave">
              Apagar <span className="font-medium text-tinta">{aConfirmar.nome}</span>? Isso não
              pode ser desfeito.
            </p>

            {aConfirmar.orcamentos > 0 && (
              <p className="rounded-lg border border-atencao/30 bg-atencao/10 px-3 py-2.5 text-sm text-atencao-forte">
                Este cliente tem {aConfirmar.orcamentos}{' '}
                {aConfirmar.orcamentos === 1 ? 'orçamento' : 'orçamentos'}. Os orçamentos continuam
                existindo, mas ficam sem cliente vinculado.
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="secundario" tamanho="grande" onClick={() => setAConfirmar(null)}>
                Cancelar
              </Botao>
              <Botao variante="perigo" tamanho="grande" onClick={confirmarExclusao} disabled={pendente}>
                {pendente ? 'Apagando…' : 'Apagar'}
              </Botao>
            </div>
          </div>
        )}
      </Dialogo>
    </div>
  )
}
