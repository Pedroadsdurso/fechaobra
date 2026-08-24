'use client'

import { useState } from 'react'

import { rotuloDocumento, situacaoDocumento } from '@/lib/documento-br'
import { LIMITE_MOTIVO_TEXTO, MOTIVOS_DUVIDA, type MotivoDuvida } from '@/modules/publico/motivos'
import { formatarCnpjCpf, formatarMoeda } from '@/lib/utils'

type Etapa = 'convite' | 'dados' | 'pronto' | 'duvida'

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
  const [motivoTexto, setMotivoTexto] = useState('')
  const [escrevendo, setEscrevendo] = useState(false)
  const [duvidaEnviada, setDuvidaEnviada] = useState(false)

  /**
   * Registra o motivo e NÃO espera.
   *
   * ===========================================================================
   * A AUSÊNCIA DE await E DE TRATAMENTO DE ERRO AQUI É DELIBERADA
   * ===========================================================================
   * Quem ler isto vai querer "consertar" com await e uma mensagem de falha. Não
   * é esquecimento — é o que faz o fluxo funcionar no iPhone.
   *
   * O botão que chama esta função é uma ÂNCORA de verdade, e a navegação para o
   * WhatsApp acontece no próprio toque. Um await antes disso tiraria a abertura
   * de dentro do gesto do usuário, e o Safari do iPhone bloqueia. O cliente
   * responderia a pergunta e não sairia do lugar — perdendo exatamente a
   * conversa que este fluxo existe para preservar.
   *
   * `keepalive` é o que mantém o POST vivo quando a página é suspensa ao trocar
   * de app. E se ele falhar mesmo assim, tudo bem: o prestador perde um dado, o
   * que é infinitamente melhor que perder a conversa.
   * ===========================================================================
   */
  function registrarDuvida(motivo: MotivoDuvida, texto = '') {
    fetch(`/api/p/${token}/duvida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo, texto }),
      keepalive: true,
    }).catch(() => {
      /* ver o bloco acima: não há erro aqui que valha segurar a pessoa */
    })
    setDuvidaEnviada(true)
  }

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
          rel="noopener"
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
              className="min-h-12 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-tinta focus:ring-2 focus:ring-tinta/15"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">CPF</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatarCnpjCpf(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="min-h-12 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-tinta focus:ring-2 focus:ring-tinta/15"
            />
            {situacaoCpf === 'invalido' && (
              <span className="text-xs text-atencao-forte">
                Esse {rotuloDocumento(cpf)} parece ter algum número trocado. Dá para confirmar assim
                mesmo.
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
              className="rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none focus:border-tinta focus:ring-2 focus:ring-tinta/15"
            />
          </label>

          {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="flex min-h-14 items-center justify-center rounded-xl bg-tinta text-base font-semibold text-white disabled:opacity-60"
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

  // ---- a dúvida: uma pergunta de um toque antes do WhatsApp ---------------
  if (etapa === 'duvida') {
    const restantes = LIMITE_MOTIVO_TEXTO - motivoTexto.length

    /*
      Cada opção é uma ÂNCORA, não um botão com handler que navega depois. É a
      diferença entre funcionar e não funcionar no iPhone: âncora navega dentro
      do gesto; `window.open` depois de um await é bloqueado. O onClick só
      dispara o registro de lado, sem segurar nada.

      SEM target="_blank", e isso é achado medido, não estilo — está em
      dialogo-envio.tsx: o wa.me é universal link, o iOS o intercepta e passa
      para o WhatsApp, e numa aba nova essa passagem falha com frequência e
      sobra uma aba em branco. Na mesma aba, o sistema assume e o app abre.

      É também o que torna `keepalive` no POST obrigatório em vez de
      precaução: a página SAI de verdade quando o link é tocado.
    */
    const opcao =
      'flex min-h-13 items-center justify-center rounded-xl border border-borda-controle bg-superficie px-4 text-base font-medium text-tinta'

    return (
      <section className="mt-4 rounded-2xl border border-borda bg-superficie px-5 py-6">
        <h2 className="text-lg font-semibold text-tinta">O que te deixou em dúvida?</h2>
        <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
          Responder ajuda {nomePrestador || 'o prestador'} a já chegar com a resposta. Se preferir,
          é só ir direto.
        </p>

        {!escrevendo && (
          <div className="mt-5 flex flex-col gap-2">
            {MOTIVOS_DUVIDA.filter((m) => m.valor !== 'outro').map((m) => (
              <a
                key={m.valor}
                href={linkDuvida}
                rel="noopener"
                onClick={() => registrarDuvida(m.valor)}
                className={opcao}
              >
                {m.rotulo}
              </a>
            ))}

            {/* "Outro" é o único que não abre o WhatsApp no mesmo toque: precisa
                do campo antes. Os três de cima cobrem a maioria em um toque. */}
            <button type="button" onClick={() => setEscrevendo(true)} className={opcao}>
              Outro
            </button>
          </div>
        )}

        {escrevendo && (
          <div className="mt-5 flex flex-col gap-2">
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value.slice(0, LIMITE_MOTIVO_TEXTO))}
              rows={3}
              autoFocus
              placeholder="Em poucas palavras, o que ficou faltando?"
              className="rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none focus:border-tinta focus:ring-2 focus:ring-tinta/15"
            />
            <span className="self-end text-xs text-tinta-suave">
              {restantes} caractere{restantes === 1 ? '' : 's'}
            </span>

            <a
              href={linkDuvida}
              rel="noopener"
              onClick={() => registrarDuvida('outro', motivoTexto)}
              className="flex min-h-14 items-center justify-center rounded-xl bg-tinta text-base font-semibold text-white"
            >
              Continuar
            </a>
          </div>
        )}

        {/* Responder é opcional, e a saída fica visível o tempo todo — não
            escondida atrás de um "pular" pequeno no rodapé. */}
        <a
          href={linkDuvida}
          rel="noopener"
          className="mt-4 flex min-h-12 items-center justify-center text-sm font-medium text-tinta-suave underline underline-offset-4"
        >
          Só quero falar
        </a>

        {duvidaEnviada && (
          <p className="mt-3 text-center text-sm text-tinta-suave">
            Anotado. {nomePrestador || 'O prestador'} vai ver isso.
          </p>
        )}

        <button
          type="button"
          onClick={() => setEtapa('convite')}
          className="mt-1 min-h-11 w-full text-sm text-tinta-suave underline underline-offset-4"
        >
          Voltar
        </button>
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
          className="flex min-h-14 items-center justify-center rounded-xl bg-tinta text-base font-semibold text-white"
        >
          Aceitar orçamento
        </button>
      )}

      {/*
        "Tenho uma dúvida", nunca "Recusar".
        Recusa explícita encerra a conversa e não deixa nada para o prestador
        fazer. Dúvida mantém o canal aberto — e a maior parte das recusas em
        obra é dúvida não respondida, não desinteresse.

        O que mudou: agora ela passa por uma pergunta de um toque antes do
        WhatsApp. O destino continua o mesmo, e pular continua sendo um toque.
      */}
      <button
        type="button"
        onClick={() => setEtapa('duvida')}
        className="flex min-h-12 items-center justify-center rounded-xl border border-borda-controle bg-superficie text-sm font-semibold text-tinta"
      >
        Tenho uma dúvida
      </button>
    </section>
  )
}
