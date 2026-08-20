'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'

import { IconeOrcamentos } from '@/componentes/layout/icones'
import { Botao, classesBotao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import { cn, formatarMoeda } from '@/lib/utils'

import { apagarOrcamento, duplicarOrcamento, marcarComoTratado } from '../acoes'
import { STATUS_ORCAMENTO } from '../constantes'
import { estadoDeValidade, validadeImporta, type TomValidade } from '../estado-validade'
import {
  chamadaDeAcao,
  ordenarPorUrgencia,
  pedeContato,
  tempoDecorrido,
  urgenciaDe,
  type Urgencia,
} from '../fila-de-trabalho'
import { linkWhatsApp, mensagemDeAcompanhamento, nomeDeTratamento } from '../mensagem-whatsapp'
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

const TOM_URGENCIA: Record<Urgencia, string> = {
  aceito: 'bg-sucesso/10 text-sucesso',
  'visualizado-parado': 'bg-atencao/15 text-atencao-forte',
  'enviado-nao-aberto': 'bg-atencao/15 text-atencao-forte',
  vencendo: 'bg-perigo/10 text-perigo',
  normal: '',
}

function rotuloStatus(status: string) {
  return STATUS_ORCAMENTO.find((s) => s.valor === status)?.rotulo ?? status
}

function Cartao({
  orcamento,
  atraso,
  aoDuplicar,
  aoApagar,
  aoTratar,
  saiuDaFila,
  ocupado,
}: {
  atraso: number
  orcamento: OrcamentoNaLista
  aoDuplicar: (id: string) => void
  aoApagar: (orcamento: OrcamentoNaLista) => void
  aoTratar: (id: string, tratado: boolean) => void
  /** true durante a janela de confirmação, antes de a lista reordenar. */
  saiuDaFila: boolean
  ocupado: boolean
}) {
  const validade = validadeImporta(orcamento.status)
    ? estadoDeValidade(orcamento.dataValidade)
    : null

  const urgencia = urgenciaDe(orcamento)
  const chamada = chamadaDeAcao(orcamento)

  // Tempo NO ESTADO, não a data. "visualizado há 4 dias" é uma tarefa;
  // "visualizado" é só um rótulo.
  const desdeQuando =
    orcamento.status === 'aceito'
      ? tempoDecorrido(orcamento.respondidoEm)
      : orcamento.status === 'visualizado'
        ? tempoDecorrido(orcamento.visualizadoEm ?? orcamento.atualizadoEm)
        : orcamento.status === 'enviado'
          ? tempoDecorrido(orcamento.enviadoEm)
          : ''

  const contato = pedeContato(orcamento)
    ? linkWhatsApp(
        orcamento.clienteTelefone,
        mensagemDeAcompanhamento(
          urgencia === 'normal' ? 'visualizado-parado' : urgencia,
          nomeDeTratamento(orcamento.clienteNome).split(' ')[0] ?? '',
          orcamento.numero,
        ),
      )
    : null

  // Rascunho vazio não é orçamento: é lixo de uma tentativa. Fica apagado, com
  // borda tracejada, e só oferece duas saídas — continuar ou sumir.
  if (orcamento.vazio) {
    return (
      <li
        className="fo-cartao flex items-center gap-3 rounded-xl border border-dashed border-borda bg-superficie/60 px-4 py-3"
        style={{ animationDelay: `${atraso}ms` }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-tinta-suave">
            Rascunho nº {String(orcamento.numero).padStart(3, '0')} — vazio
          </p>
          <p className="mt-0.5 text-xs text-tinta-suave">
            Sem cliente e sem itens. Nunca chegou a virar orçamento.
          </p>
        </div>

        {/*
          Um <a> só, sem <button> dentro — mesmo defeito do botão do WhatsApp:
          conteúdo interativo dentro de <a> é proibido pela especificação, e o
          Safari deixa o <button> engolir o toque. Aqui custaria a abertura do
          rascunho no iPhone. Ver a nota em dialogo-envio.tsx.
        */}
        <Link
          href={`/painel/orcamentos/${orcamento.id}`}
          className={classesBotao({ variante: 'secundario' })}
        >
          Continuar
        </Link>

        <Botao variante="perigo" onClick={() => aoApagar(orcamento)} disabled={ocupado}>
          Apagar
        </Botao>
      </li>
    )
  }

  return (
    <li
      className="fo-cartao rounded-xl border border-borda bg-superficie"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <Link
        href={`/painel/orcamentos/${orcamento.id}`}
        className="fo-toque block px-4 pt-3 pb-2 hover:bg-fundo/60"
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
          {desdeQuando && <span className="text-xs text-tinta-suave">{desdeQuando}</span>}

          {validade && urgencia === 'normal' && (
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

        {saiuDaFila && (
          <p className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-fundo px-2.5 py-1.5 text-xs font-medium text-tinta-suave">
            <span>Saiu da fila</span>
            <button
              type="button"
              onClick={(e) => {
                // O cartão inteiro é um link para o editor.
                e.preventDefault()
                e.stopPropagation()
                aoTratar(orcamento.id, false)
              }}
              className="underline underline-offset-4 hover:text-tinta"
            >
              Desfazer
            </button>
          </p>
        )}

        {!saiuDaFila && chamada && (
          <p
            className={cn(
              'mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
              TOM_URGENCIA[urgencia],
            )}
          >
            {chamada}
          </p>
        )}

        {/* O prestador não pode descobrir isso na hora de emitir a nota. */}
        {orcamento.enderecoDivergente && (
          <p className="mt-2 rounded-lg bg-atencao/10 px-2.5 py-1.5 text-xs text-atencao-forte">
            {nomeDeTratamento(orcamento.clienteNome).split(' ')[0] || 'O cliente'} confirmou um
            endereço diferente do cadastrado: {orcamento.enderecoDivergente}
          </p>
        )}
      </Link>

      {/* Duplicar fica à vista, não dentro de menu: é a ação mais usada da
          tela — mesmo serviço, cliente diferente. */}
      <div className="flex gap-1 border-t border-borda px-2 py-1.5">
        {/* O gesto seguinte a "visto há 4 dias" é cobrar retorno — e tem que
            caber sem abrir o orçamento. */}
        {contato && (
          <a
            href={contato}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 flex-1 items-center justify-center rounded-lg bg-marca px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            WhatsApp
          </a>
        )}

        {/*
          Reversível a qualquer momento, não só na janela de segundos.
          O desfazer imediato acima resolve o clique errado, mas some num
          refresh — então o cartão de um aceito já tratado continua oferecendo
          o caminho de volta, para sempre.
        */}
        {orcamento.status === 'aceito' && (
          <button
            type="button"
            onClick={() => aoTratar(orcamento.id, !orcamento.tratadoEm)}
            disabled={ocupado}
            className="min-h-10 rounded-lg px-3 text-sm font-medium text-tinta transition-colors hover:bg-fundo disabled:opacity-40"
          >
            {orcamento.tratadoEm ? 'Voltar para a fila' : 'Já combinei'}
          </button>
        )}

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
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const router = useRouter()

  const filtrados = useMemo(() => {
    const porUrgencia = ordenarPorUrgencia(orcamentos)
    const termo = normalizar(busca.trim())
    if (!termo) return porUrgencia

    const digitos = busca.replace(/\D/g, '')
    return porUrgencia.filter((o) => {
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

  /**
   * Marcar como tratado não reordena a lista na hora.
   *
   * O item sumindo no instante do toque não dá tempo de a pessoa registrar o
   * que aconteceu — e se foi engano, ela nem sabe de onde desfazer. O cartão
   * fica alguns segundos mostrando "Saiu da fila · Desfazer" e só então a
   * lista se reorganiza.
   */
  function tratar(id: string, tratado: boolean) {
    iniciar(async () => {
      const resposta = await marcarComoTratado(id, tratado)
      if (!resposta.ok) return

      if (tratado) {
        setConfirmando(id)
        setTimeout(() => {
          setConfirmando((atual) => (atual === id ? null : atual))
          router.refresh()
        }, 4000)
      } else {
        setConfirmando(null)
        router.refresh()
      }
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
          {filtrados.map((orcamento, posicao) => (
            <Cartao
              key={orcamento.id}
              // Escalonamento limitado aos 8 primeiros: numa lista longa,
              // 30ms por item faria o último cartão entrar meio segundo
              // depois — o oposto de parecer rápido. Do 9º em diante todos
              // entram juntos, e ninguém percebe porque já estão fora da tela.
              atraso={Math.min(posicao, 8) * 30}
              orcamento={orcamento}
              aoDuplicar={duplicar}
              aoApagar={setAConfirmar}
              aoTratar={tratar}
              saiuDaFila={confirmando === orcamento.id}
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
