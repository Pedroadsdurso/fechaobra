'use client'

import { PDFViewer } from '@react-pdf/renderer'
import { useEffect, useMemo, useState } from 'react'

import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import type { EmpresaDocumento } from '@/modules/documento/tipos'
import type { Cliente } from '@/modules/clientes/tipos'

import { paraDocumento } from '../adaptador-documento'
import type { RascunhoOrcamento } from '../tipos'

import { BotaoBaixarPdf } from './botao-baixar-pdf'

const ESPERA_REDESENHO = 800

/**
 * O PDF de verdade, montado a partir do estado vivo do editor.
 *
 * Não é uma simulação: passa pelo mesmo adaptador e pelos mesmos componentes
 * que geram o arquivo baixado. O que se vê aqui é o que o cliente recebe.
 *
 * Este módulo importa o react-pdf estaticamente e por isso PESA 449 KB gzip.
 * Ele é carregado por `dynamic()` no editor — nunca por import estático — e só
 * é montado onde está de fato visível. Ver a nota em editor-orcamento.tsx.
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

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-tinta-suave">Prévia do PDF</p>

        <BotaoBaixarPdf rascunho={rascunho} cliente={cliente} empresa={empresa} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-borda bg-fundo">
        <PDFViewer width="100%" height="100%" showToolbar style={{ border: 'none' }}>
          {documento}
        </PDFViewer>
      </div>
    </div>
  )
}
