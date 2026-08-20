'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

import { Botao } from '@/componentes/ui/botao'
import type { Cliente } from '@/modules/clientes/tipos'
import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import type { EmpresaDocumento } from '@/modules/documento/tipos'

import { paraDocumento } from '../adaptador-documento'
import type { RascunhoOrcamento } from '../tipos'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false },
)

export function nomeArquivoPdf(numero: number, empresa: string) {
  const limpo = empresa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `orcamento-${String(numero).padStart(3, '0')}-${limpo || 'fechaobra'}.pdf`
}

/**
 * Baixar o PDF a partir do estado atual do orçamento.
 *
 * Vive em componente próprio porque aparece em dois lugares — ao lado do
 * preview e no diálogo de envio — e em ambos precisa montar o documento pelo
 * mesmo adaptador, para o arquivo ser idêntico ao que está na tela.
 */
export function BotaoBaixarPdf({
  rascunho,
  cliente,
  empresa,
  variante = 'primario',
  larguraTotal = false,
}: {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
  variante?: 'primario' | 'secundario'
  larguraTotal?: boolean
}) {
  const assinatura = JSON.stringify({ rascunho, cliente, empresa })

  const documento = useMemo(
    () => <DocumentoOrcamento orcamento={paraDocumento(JSON.parse(assinatura))} />,
    [assinatura],
  )

  return (
    <PDFDownloadLink
      key={assinatura}
      document={documento}
      fileName={nomeArquivoPdf(rascunho.numero, empresa.nome)}
      className={larguraTotal ? 'block' : undefined}
    >
      {({ loading }) => (
        <Botao type="button" variante={variante} disabled={loading} larguraTotal={larguraTotal}>
          {loading ? 'Gerando PDF…' : 'Baixar PDF'}
        </Botao>
      )}
    </PDFDownloadLink>
  )
}
