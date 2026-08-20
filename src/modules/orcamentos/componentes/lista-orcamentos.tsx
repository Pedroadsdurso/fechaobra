'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'

import { IconeOrcamentos } from '@/componentes/layout/icones'
import { Botao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import { cn, formatarMoeda } from '@/lib/utils'

import { apagarOrcamento, duplicarOrcamento } from '../acoes'
import { STATUS_ORCAMENTO } from '../constantes'
import { estadoDeValidade, validadeImporta, type TomValidade } from '../estado-validade'
import type { OrcamentoNaLista } from '../consultas'

import { BotaoNovoOrcamento } from './botao-novo-orcamento'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

const TOM_VALIDADE: Record<TomValidade, string> = {
  vencido: 'text-perigo',
  urgente: 'text-perigo',
  atencao: 'text-atencao-forte',
  tranquilo: 'text-tinta-suave',
}

/**
 * Cores por status.
 *
 * Os três de resposta do cliente chegam na Fase 3, mas já estão mapeados: o
 * cartão não precisa ser redesenhado quando eles começarem a aparecer.
 */
const TOM_STATUS: Record<string, string> = {
  rascunho: 'bg-fundo text-tinta-suave',
  enviado: 'bg-marca/10 text-marca',
  visualizado: 'bg-marca/10 text-marca',
  aceito: 'bg-sucesso/10 text-sucesso',
  recusado: 'bg-perigo/10 text-perigo',
  expirado: 'bg-fundo text-tinta-suave',
}

function rotuloStatus(status: string) {
  return STATUS_ORCAMENTO.find((s) => s.valor === status)?.rotulo ?? status
}

function Cartao({
  orcamento,
  aoDuplicar,
  aoApagar,
  ocupado,
}: {
  orcamento: OrcamentoNaLista
  aoDuplicar: (id: string) => void
  aoApagar: (orcamento: OrcamentoNaLista) => void
  ocupado: boolean
}) {
  const validade = validadeImporta(orcamento.status)
    ? estadoDeValidade(orcamento.dataValidade)
    : null

  // Rascunho vazio não é orçamento: é lixo de uma tentativa. Fica apagado, com
  // borda tracejada, e só oferece duas saídas — continuar ou sumir.
  if (orcamento.vazio) {
    return (
      <li className="flex items-center gap-3 rounded-xl border border-dashed border-borda bg-superficie/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-tinta-suave">
            Rascunho nº {String(orcamento.numero).padStart(3, '0')} — vazio
          </p>
          <p className="mt-0.5 text-xs text-tinta-suave">
            Sem cliente e sem itens. Nunca chegou a virar orçamento.
          </p>
        </div>

        <Link href={`/painel/orcamentos/${orcamento.id}`}>
          <Botao variante="secundario">Continuar</Botao>
        </Link>

        <Botao variante="perigo" onClick={() => aoApagar(orcamento)} disabled={ocupado}>
          Apagar
        </Botao>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-borda bg-superficie">
      <Link
        href={`/painel/orcamentos/${orcamento.id}`}
        className="block px-4 pt-3 pb-2 transition-colors hover:bg-fundo/60"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              TOM_STATUS[orcamento.status] ?? TOM_STATUS.rascunho,
            )}
          >
            {rotuloStatus(orcamento.status)}
          </span>
          <span className="text-xs text-tinta-suave">
            nº {String(orcamento.numero).padStart(3, '0')}
          </span>

          {validade && (
            <span className={cn('ml-auto text-xs font-medium', TOM_VALIDADE[validade.tom])}>
              {validade.texto}
            </span>
          )}
        </div>

        <p className="mt-1.5 truncate text-sm font-medium text-tinta">
          {orcamento.clienteNome || 'Sem cliente'}
        </p>

        <p className="truncate text-xs text-tinta-suave">
          {[orcamento.titulo, orcamento.tipoServicoRotulo].filter(Boolean).join('  ·  ') ||
            'Sem título'}
        </p>

        <p className="mt-1.5 text-base font-semibold text-tinta">
          {formatarMoeda(orcamento.total)}
          <span className="ml-2 text-xs font-normal text-tinta-suave">
            {orcamento.quantidadeItens} {orcamento.quantidadeItens === 1 ? 'item' : 'itens'}
          </span>
        </p>
      </Link>

      {/* Duplicar fica à vista, não dentro de menu: é a ação mais usada da
          tela — mesmo serviço, cliente diferente. */}
      <div className="flex gap-1 border-t border-borda px-2 py-1.5">
        <button
          type="button"
          onClick={() => aoDuplicar(orcamento.id)}
          disabled={ocupado}
          className="min-h-10 flex-1 rounded-lg px-3 text-sm font-medium text-tinta transition-colors hover:bg-fundo disabled:opacity-40"
        >
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => aoApagar(orcamento)}
          disabled={ocupado}
          className="min-h-10 rounded-lg px-3 text-sm font-medium text-tinta-suave transition-colors hover:bg-perigo/5 hover:text-perigo disabled:opacity-40"
        >
          Apagar
        </button>
      </div>
    </li>
  )
}

export function ListaOrcamentos({ orcamentos }: { orcamentos: OrcamentoNaLista[] }) {
  const [busca, setBusca] = useState('')
  const [aConfirmar, setAConfirmar] = useState<OrcamentoNaLista | null>(null)
  const [pendente, iniciar] = useTransition()
  const router = useRouter()

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return orcamentos

    const digitos = busca.replace(/\D/g, '')
    return orcamentos.filter((o) => {
      const alvo = normalizar(`${o.clienteNome} ${o.titulo} ${o.tipoServicoRotulo}`)
      // Busca por número aceita "2", "02" e "002".
      const casaNumero = digitos.length > 0 && String(o.numero).padStart(3, '0').includes(digitos)
      return alvo.includes(termo) || casaNumero
    })
  }, [orcamentos, busca])

  function duplicar(id: string) {
    iniciar(async () => {
      const resposta = await duplicarOrcamento(id)
      // Abre a cópia direto: quem duplica quer editar agora, não voltar à lista.
      if (resposta.ok && resposta.id) router.push(`/painel/orcamentos/${resposta.id}`)
    })
  }

  function confirmarExclusao() {
    if (!aConfirmar) return
    const id = aConfirmar.id
    iniciar(async () => {
      await apagarOrcamento(id)
      setAConfirmar(null)
      router.refresh()
    })
  }

  if (orcamentos.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-borda bg-superficie px-6 py-14 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-fundo text-tinta-suave">
          <IconeOrcamentos className="size-6" />
        </div>
        <h2 className="text-base font-semibold text-tinta">Seu primeiro orçamento</h2>
        <p className="mt-1 max-w-sm text-sm text-tinta-suave">
          Escolha o tipo de serviço e o escopo, as exclusões, a garantia e as condições vêm
          prontos. Você ajusta os itens e manda o PDF pelo WhatsApp.
        </p>
        <div className="mt-5">
          <BotaoNovoOrcamento rotulo="Criar orçamento" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        type="search"
        inputMode="search"
        placeholder="Buscar por cliente ou número"
        aria-label="Buscar orçamento"
        className="min-h-11 w-full rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none transition-colors placeholder:text-tinta-suave/60 focus:border-marca focus:ring-2 focus:ring-marca/20"
      />

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda bg-superficie px-6 py-10 text-center text-sm text-tinta-suave">
          Nenhum orçamento para <span className="font-medium text-tinta">{busca}</span>.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((orcamento) => (
            <Cartao
              key={orcamento.id}
              orcamento={orcamento}
              aoDuplicar={duplicar}
              aoApagar={setAConfirmar}
              ocupado={pendente}
            />
          ))}
        </ul>
      )}

      <Dialogo
        aberto={Boolean(aConfirmar)}
        aoFechar={() => setAConfirmar(null)}
        titulo="Apagar orçamento"
      >
        {aConfirmar && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tinta-suave">
              Apagar o orçamento nº{' '}
              <span className="font-medium text-tinta">
                {String(aConfirmar.numero).padStart(3, '0')}
              </span>
              {aConfirmar.clienteNome && ` de ${aConfirmar.clienteNome}`}? Isso não pode ser
              desfeito.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="secundario" tamanho="grande" onClick={() => setAConfirmar(null)}>
                Cancelar
              </Botao>
              <Botao
                variante="perigo"
                tamanho="grande"
                onClick={confirmarExclusao}
                disabled={pendente}
              >
                {pendente ? 'Apagando…' : 'Apagar'}
              </Botao>
            </div>
          </div>
        )}
      </Dialogo>
    </div>
  )
}
