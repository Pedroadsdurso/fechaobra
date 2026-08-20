'use client'

import { useMemo, useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { Dialogo } from '@/componentes/ui/dialogo'
import type { Cliente } from '@/modules/clientes/tipos'
import type { EmpresaDocumento } from '@/modules/documento/tipos'
import { urlBase } from '@/lib/url-base'

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
}: {
  aberto: boolean
  aoFechar: () => void
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
  token: string
  reenvio: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  // NEXT_PUBLIC_URL_BASE é inlinada no bundle em tempo de build, então o valor
  // aqui é o do ambiente que gerou o deploy — não o do navegador. É o que
  // garante que o link mandado seja o de produção. O build quebra se ela
  // faltar em produção (ver next.config.ts).
  const url = useMemo(() => `${urlBase()}/p/${token}`, [token])

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

        <a
          href={linkWhatsApp(cliente?.telefone ?? '', mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Botao type="button" tamanho="grande" larguraTotal>
            Mandar no WhatsApp
          </Botao>
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
