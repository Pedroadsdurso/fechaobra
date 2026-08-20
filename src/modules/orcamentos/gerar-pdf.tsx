/**
 * A geração do arquivo, isolada num módulo próprio.
 *
 * Este arquivo importa o @react-pdf/renderer estaticamente — 449 KB gzip, o
 * maior peso do projeto. Ele existe separado justamente para que ninguém o
 * alcance por import estático: quem precisa dele usa `await import()`, e aí o
 * chunk só desce quando o prestador realmente pede o PDF.
 *
 * NÃO importe este módulo no topo de nenhum componente. Fazer isso desfaz o
 * ganho inteiro sem quebrar nada visível — que é como o peso entrou aqui da
 * primeira vez: um `dynamic()` no PDFViewer que parecia adiar a biblioteca,
 * enquanto o import estático de DocumentoOrcamento a trazia junto.
 */
import { pdf } from '@react-pdf/renderer'

import type { Cliente } from '@/modules/clientes/tipos'
import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import type { EmpresaDocumento } from '@/modules/documento/tipos'

import { paraDocumento } from './adaptador-documento'
import type { RascunhoOrcamento } from './tipos'

export type DadosDoDocumento = {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
}

export function nomeArquivoPdf(numero: number, empresa: string) {
  const limpo = empresa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `orcamento-${String(numero).padStart(3, '0')}-${limpo || 'fechaobra'}.pdf`
}

/** Monta o documento e devolve o arquivo pronto. Passa pelo mesmo adaptador do preview. */
export async function gerarBlobPdf(dados: DadosDoDocumento): Promise<Blob> {
  return pdf(<DocumentoOrcamento orcamento={paraDocumento(dados)} />).toBlob()
}
