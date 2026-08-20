import type { Metadata } from 'next'

import { VisualizadorDocumento } from '@/modules/documento/visualizador'

export const metadata: Metadata = { title: 'Documento de teste' }

/**
 * Rota de bancada da Fase 1: existe só para olhar o PDF com dados mockados.
 * Não lê nem grava nada no banco. Sai do ar quando o editor de orçamento
 * entrar, na Fase 2.
 */
export default function PaginaDocumentoTeste() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tinta">Motor do documento</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Pré-visualização com dados de teste. Baixe o PDF e tente selecionar o texto no leitor: ele
          é vetorial, não imagem.
        </p>
      </div>

      <VisualizadorDocumento />
    </div>
  )
}
