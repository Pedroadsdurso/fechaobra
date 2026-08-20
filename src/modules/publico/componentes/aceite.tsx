'use client'

import { useState } from 'react'

import { rotuloDocumento, situacaoDocumento } from '@/lib/documento-br'
import { formatarCnpjCpf, formatarMoeda } from '@/lib/utils'

type Etapa = 'convite' | 'dados' | 'pronto'

/**
 * O aceite.
 *
 * ===========================================================================
 * NADA VEM ANTES DO BOTÃO. Nem aviso, nem "ao aceitar você concorda", nem
 * checkbox, nem formulário.
 * ===========================================================================
 *
 * Este é o momento mais delicado do produto: o cliente acabou de decidir
 * gastar alguns milhares de reais e vai ser convidado a dar o CPF. Qualquer
 * coisa entre a decisão e o botão devolve a pessoa ao estado de dúvida — e
 * dúvida no celular, distraído, vira "depois eu vejo", que vira nunca.
 *
 * Os dados vêm DEPOIS do clique, quando a decisão já está tomada e o
 * enquadramento mudou: não é cadastro para usar um sistema, é a confirmação de
 * um acordo que a pessoa acabou de fechar.
 */
export function Aceite({
  token,
  total,
  nomeCliente,
  enderecoCliente,
  linkDuvida,
  nomePrestador,
  expirado,
  jaAceito,
  aceitoEm,
}: {
  token: string
  total: number
  nomeCliente: string
  enderecoCliente: string
  linkDuvida: string
  nomePrestador: string
  expirado: boolean
  jaAceito: boolean
  aceitoEm: string | null
}) {
  const [etapa, setEtapa] = useState<Etapa>(jaAceito ? 'pronto' : 'convite')
  const [nome, setNome] = useState(nomeCliente)
  const [cpf, setCpf] = useState('')
  const [endereco, setEndereco] = useState(enderecoCliente)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmadoEm, setConfirmadoEm] = useState(aceitoEm)

  const situacaoCpf = situacaoDocumento(cpf)

  async function confirmar() {
    if (nome.trim().length < 2) {
      setErro('Informe seu nome completo.')
      return
    }

    setErro('')
    setEnviando(true)

    try {
      const resposta = await fetch(`/api/p/${token}/aceitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, endereco }),
      })
      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro ?? 'Não consegui registrar. Tente de novo.')
        return
      }

      setConfirmadoEm(dados.aceitoEm ?? new Date().toISOString())
      setEtapa('pronto')
    } catch {
      setErro('Sem conexão. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  // ---- depois do aceite ----------------------------------------------------
  if (etapa === 'pronto') {
    const data = confirmadoEm
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(new Date(confirmadoEm))
      : ''

    // Tom de recibo, não de comemoração. A pessoa acabou de se comprometer com
    // alguns milhares de reais — festejar seria desrespeitoso com o peso disso.
    return (
      <section className="mt-4 rounded-2xl border border-borda bg-superficie px-5 py-6">
        <h2 className="text-lg font-semibold text-tinta">Orçamento aceito</h2>
        {data && <p className="mt-1 text-sm text-tinta-suave">Confirmado em {data}</p>}

        <dl className="mt-4 border-t border-borda pt-4">
          <div className="flex items-baseline justify-between">
            <dt className="text-sm text-tinta-suave">Valor acordado</dt>
            <dd className="text-xl font-bold text-tinta">{formatarMoeda(total)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-tinta-suave">
          {nomePrestador || 'O prestador'} recebeu a confirmação e vai entrar em contato para
          combinar o início.
        </p>

        <a
          href={linkDuvida}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-12 items-center justify-center rounded-lg border border-borda bg-superficie text-sm font-medium text-tinta"
        >
          Falar com {nomePrestador || 'o prestador'}
        </a>
      </section>
    )
  }

  // ---- os dados, DEPOIS do clique -----------------------------------------
  if (etapa === 'dados') {
    return (
      <section className="mt-4 rounded-2xl border border-borda bg-superficie px-5 py-6">
        <h2 className="text-lg font-semibold text-tinta">Confirmar o aceite</h2>

        {/* Uma linha. Não um parágrafo jurídico. */}
        <p className="mt-1 text-sm text-tinta-suave">
          {nomePrestador || 'O prestador'} precisa destes dados para emitir o contrato e o recibo.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">Nome completo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              className="min-h-12 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">CPF</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatarCnpjCpf(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="min-h-12 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
            />
            {situacaoCpf === 'invalido' && (
              <span className="text-xs text-atencao-forte">
                Esse {rotuloDocumento(cpf)} parece ter algum número trocado. Dá para confirmar
                assim mesmo.
              </span>
            )}
          </label>

          {/* Campo único e livre: o cliente está no celular. Formulário de
              CEP, número e complemento seria pedir cinco toques a mais no pior
              momento possível. */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">Endereço</span>
            <textarea
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              rows={2}
              placeholder="Rua, número, bairro, cidade"
              className="rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
            />
          </label>

          {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="flex min-h-14 items-center justify-center rounded-xl bg-marca text-base font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Confirmando…' : 'Confirmar aceite'}
          </button>

          <button
            type="button"
            onClick={() => setEtapa('convite')}
            className="min-h-11 text-sm text-tinta-suave underline underline-offset-4"
          >
            Voltar
          </button>
        </div>
      </section>
    )
  }

  // ---- o convite: só o botão ----------------------------------------------
  return (
    <section className="mt-4 flex flex-col gap-2">
      {!expirado && (
        <button
          type="button"
          onClick={() => setEtapa('dados')}
          className="flex min-h-14 items-center justify-center rounded-xl bg-marca text-base font-semibold text-white"
        >
          Aceitar orçamento
        </button>
      )}

      {/*
        "Tenho uma dúvida", nunca "Recusar".
        Recusa explícita encerra a conversa e não deixa nada para o prestador
        fazer. Dúvida mantém o canal aberto — e a maior parte das recusas em
        obra é dúvida não respondida, não desinteresse.
      */}
      <a
        href={linkDuvida}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center rounded-xl border border-borda bg-superficie text-sm font-medium text-tinta"
      >
        Tenho uma dúvida
      </a>
    </section>
  )
}
