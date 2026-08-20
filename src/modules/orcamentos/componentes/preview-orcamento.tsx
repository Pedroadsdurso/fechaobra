'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import type { EmpresaDocumento } from '@/modules/documento/tipos'
import type { Cliente } from '@/modules/clientes/tipos'

import { paraDocumento } from '../adaptador-documento'
import type { RascunhoOrcamento } from '../tipos'

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <Esqueleto />,
})

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false },
)

const ESPERA_REDESENHO = 800

function Esqueleto() {
  return (
    <div className="flex h-full items-center justify-center bg-fundo">
      <p className="text-sm text-tinta-suave">Montando o documento…</p>
    </div>
  )
}

function nomeArquivo(numero: number, empresa: string) {
  const limpo = empresa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `orcamento-${String(numero).padStart(3, '0')}-${limpo || 'fechaobra'}.pdf`
}

/**
 * O PDF de verdade, montado a partir do estado vivo do editor.
 *
 * Não é uma simulação: passa pelo mesmo adaptador e pelos mesmos componentes
 * que geram o arquivo baixado. O que se vê aqui é o que o cliente recebe.
 */
export function PreviewOrcamento({
  rascunho,
  cliente,
  empresa,
}: {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
}) {
  // Mesma trava do preview da marca: comparar a assinatura dos valores, e não
  // a identidade do objeto, evita o laço de atualização do PDFViewer.
  const assinatura = JSON.stringify({ rascunho, cliente, empresa })
  const [estavel, setEstavel] = useState(assinatura)

  useEffect(() => {
    const relogio = setTimeout(() => setEstavel(assinatura), ESPERA_REDESENHO)
    return () => clearTimeout(relogio)
  }, [assinatura])

  const documento = useMemo(() => {
    const dados = JSON.parse(estavel) as {
      rascunho: RascunhoOrcamento
      cliente: Cliente | null
      empresa: EmpresaDocumento
    }
    return <DocumentoOrcamento orcamento={paraDocumento(dados)} />
  }, [estavel])

  const arquivo = nomeArquivo(rascunho.numero, empresa.nome)

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-tinta-suave">Prévia do PDF</p>

        <PDFDownloadLink key={estavel} document={documento} fileName={arquivo}>
          {({ loading }) => (
            <Botao type="button" disabled={loading}>
              {loading ? 'Gerando…' : 'Baixar PDF'}
            </Botao>
          )}
        </PDFDownloadLink>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-borda bg-fundo">
        <PDFViewer width="100%" height="100%" showToolbar style={{ border: 'none' }}>
          {documento}
        </PDFViewer>
      </div>
    </div>
  )
}
