/**
 * Ponto de entrada do scripts/render-do-banco.mjs.
 *
 * Existe para o script conseguir montar o documento a partir de dados crus do
 * banco usando exatamente o mesmo adaptador e os mesmos componentes que o
 * navegador usa — é isso que torna a verificação válida.
 */
import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import type { Cliente } from '@/modules/clientes/tipos'
import type { EmpresaDocumento } from '@/modules/documento/tipos'

import { paraDocumento } from './adaptador-documento'
import type { RascunhoOrcamento } from './tipos'

export function criarDocumento(dados: {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
}) {
  return <DocumentoOrcamento orcamento={paraDocumento(dados)} base="public" />
}
