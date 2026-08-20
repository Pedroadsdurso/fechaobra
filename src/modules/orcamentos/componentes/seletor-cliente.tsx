'use client'

import { useMemo, useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import { FormularioCliente } from '@/modules/clientes/componentes/formulario-cliente'
import type { Cliente } from '@/modules/clientes/tipos'
import { cn } from '@/lib/utils'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Escolha do cliente com cadastro no mesmo lugar.
 *
 * O prestador está no meio do orçamento; mandá-lo para a tela de clientes e
 * depois voltar é onde ele desiste. Se o nome buscado não existe, o próprio
 * campo vira o cadastro, já com o que foi digitado.
 */
export function SeletorCliente({
  clientes,
  clienteId,
  aoSelecionar,
}: {
  clientes: Cliente[]
  clienteId: string | null
  aoSelecionar: (cliente: Cliente | null) => void
}) {
  const [lista, setLista] = useState(clientes)
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [criando, setCriando] = useState(false)

  const selecionado = lista.find((c) => c.id === clienteId) ?? null

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return lista.slice(0, 8)

    const digitos = busca.replace(/\D/g, '')
    return lista
      .filter((c) => {
        const alvo = normalizar(`${c.nome} ${c.email}`)
        const telefone = c.telefone.replace(/\D/g, '')
        return alvo.includes(termo) || (digitos.length >= 3 && telefone.includes(digitos))
      })
      .slice(0, 8)
  }, [lista, busca])

  function escolher(cliente: Cliente) {
    aoSelecionar(cliente)
    setAberto(false)
    setBusca('')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-tinta">Cliente</span>

      {selecionado ? (
        <div className="flex items-center gap-3 rounded-lg border border-borda bg-superficie px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-tinta">{selecionado.nome}</p>
            {(selecionado.telefone || selecionado.endereco) && (
              <p className="truncate text-xs text-tinta-suave">
                {[selecionado.telefone, selecionado.endereco].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
          <Botao type="button" variante="secundario" onClick={() => setAberto(true)}>
            Trocar
          </Botao>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex min-h-12 items-center justify-between rounded-lg border border-dashed border-borda bg-superficie px-3 text-left text-sm text-tinta-suave transition-colors hover:border-marca hover:text-tinta"
        >
          Escolher o cliente
          <span aria-hidden className="text-lg">
            &rsaquo;
          </span>
        </button>
      )}

      <Dialogo
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Escolher cliente"
        descricao="Busque pelo nome ou telefone. Se não achar, cadastre aqui mesmo."
      >
        <div className="flex flex-col gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="search"
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
            className="min-h-11 w-full rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
          />

          {filtrados.length > 0 && (
            <ul className="flex flex-col gap-1">
              {filtrados.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    onClick={() => escolher(cliente)}
                    className={cn(
                      'flex min-h-12 w-full flex-col justify-center rounded-lg px-3 py-2 text-left transition-colors',
                      cliente.id === clienteId ? 'bg-fundo' : 'hover:bg-fundo',
                    )}
                  >
                    <span className="truncate text-sm font-medium text-tinta">{cliente.nome}</span>
                    {cliente.telefone && (
                      <span className="truncate text-xs text-tinta-suave">{cliente.telefone}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtrados.length === 0 && (
            <p className="px-1 py-2 text-sm text-tinta-suave">
              {busca.trim()
                ? `Nenhum cliente com "${busca.trim()}".`
                : 'Sua agenda ainda está vazia.'}
            </p>
          )}

          <Botao type="button" variante="secundario" tamanho="grande" larguraTotal onClick={() => setCriando(true)}>
            {busca.trim() ? `Cadastrar “${busca.trim()}”` : 'Cadastrar novo cliente'}
          </Botao>
        </div>
      </Dialogo>

      <Dialogo
        aberto={criando}
        aoFechar={() => setCriando(false)}
        titulo="Novo cliente"
        descricao="Só o nome é obrigatório. O resto o cliente completa ao aceitar."
      >
        <FormularioCliente
          nomeInicial={busca.trim() || undefined}
          aoCancelar={() => setCriando(false)}
          aoConcluir={(novo) => {
            // Entra na lista local na hora: sem isso o cliente recém-criado só
            // apareceria depois de recarregar a página, e o fluxo travaria.
            setLista((atual) => [novo, ...atual])
            setCriando(false)
            escolher(novo)
          }}
        />
      </Dialogo>
    </div>
  )
}
