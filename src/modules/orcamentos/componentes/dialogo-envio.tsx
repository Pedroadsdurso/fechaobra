'use client'

import { useMemo, useState } from 'react'

import { Botao, classesBotao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import type { Cliente } from '@/modules/clientes/tipos'
import type { EmpresaDocumento } from '@/modules/documento/tipos'

import { linkWhatsApp, montarMensagem, nomeDeTratamento } from '../mensagem-whatsapp'
import type { RascunhoOrcamento } from '../tipos'

import { BotaoBaixarPdf } from './botao-baixar-pdf'

/**
 * O que aparece depois de enviar.
 *
 * Não é uma tela de "sucesso": é a tela onde o envio de fato acontece. O app
 * marcou o orçamento como enviado, mas quem manda a mensagem é o prestador,
 * pelo WhatsApp dele — e é isso que faz o cliente responder, porque chega de
 * um número conhecido, não de um remetente automático.
 */
export function DialogoEnvio({
  aberto,
  aoFechar,
  rascunho,
  cliente,
  empresa,
  token,
  reenvio,
  urlBase,
}: {
  aberto: boolean
  aoFechar: () => void
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
  token: string
  reenvio: boolean
  /**
   * Calculada no SERVIDOR e passada para cá.
   *
   * Chamar urlBase() daqui pareceria funcionar em desenvolvimento e quebraria
   * em produção: as variáveis da Vercel não existem no navegador, e um deploy
   * que dependa do fallback delas deixaria este componente sem resposta
   * justamente na hora de enviar. Ver a nota em lib/url-base.ts.
   */
  urlBase: string
}) {
  const [copiado, setCopiado] = useState(false)

  const url = useMemo(() => `${urlBase}/p/${token}`, [urlBase, token])

  const mensagem = useMemo(
    () =>
      montarMensagem({
        primeiroNomeCliente: cliente ? nomeDeTratamento(cliente.nome).split(' ')[0] : '',
        assinante: nomeDeTratamento(empresa.responsavel ?? '') || empresa.nome,
        nomeEmpresa: empresa.nome,
        titulo: rascunho.titulo,
        url,
      }),
    [cliente, empresa, rascunho.titulo, url],
  )

  const semTelefone = !cliente?.telefone?.trim()

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Área de transferência bloqueada (http sem localhost, permissão negada).
      // O link continua selecionável no campo — não vale travar a tela por isso.
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={reenvio ? 'Orçamento pronto para reenviar' : 'Orçamento enviado'}
      descricao="Agora é só mandar o link para o cliente. Ele abre no celular, sem instalar nada."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-tinta">Link do orçamento</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link público do orçamento"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-borda bg-fundo px-3 font-mono text-sm text-tinta outline-none"
            />
            <Botao type="button" variante="secundario" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </Botao>
          </div>
        </div>

        <div className="rounded-lg border border-borda bg-fundo px-3 py-2.5">
          <p className="mb-1 text-xs font-medium text-tinta-suave">Mensagem que vai junto</p>
          <p className="text-sm whitespace-pre-line text-tinta">{mensagem}</p>
        </div>

        {semTelefone && (
          <p className="text-xs text-atencao-forte">
            {cliente?.nome ?? 'Este cliente'} está sem telefone cadastrado. O WhatsApp vai abrir
            para você escolher o contato.
          </p>
        )}

        {/*
          Um <a> de verdade, e SÓ um <a>.

          Duas coisas estavam erradas aqui, e as duas só aparecem no iPhone:

          1. Havia um <button> dentro do <a>. A especificação do HTML proíbe
             conteúdo interativo dentro de <a>, e o que acontece então é
             decisão de cada navegador. O Safari deixa o <button> consumir o
             toque — e como ele é type="button", não faz nada. Silenciosamente.

          2. target="_blank" atrapalha a entrega para o aplicativo. O wa.me é
             universal link: o iOS o intercepta e passa para o WhatsApp. Numa
             aba nova essa passagem falha com frequência e sobra uma aba em
             branco. Na mesma aba, o sistema assume e o app abre.

          O que NÃO era o problema, verificado antes de mexer: não há
          window.open nem await entre o toque e a abertura — o href já estava
          montado no render; e o número sai correto (só dígitos, 55 na frente),
          com URL de ~446 caracteres, longe de qualquer limite.
        */}
        <a
          href={linkWhatsApp(cliente?.telefone ?? '', mensagem)}
          rel="noopener"
          className={classesBotao({ tamanho: 'grande', larguraTotal: true })}
        >
          Mandar no WhatsApp
        </a>

        <BotaoBaixarPdf
          rascunho={rascunho}
          cliente={cliente}
          empresa={empresa}
          variante="secundario"
          larguraTotal
        />

        <p className="text-xs text-tinta-suave">
          O PDF serve para imprimir ou arquivar. Para o cliente ler no celular, mande o link — ele
          foi feito para tela pequena.
        </p>
      </div>
    </Dialogo>
  )
}
