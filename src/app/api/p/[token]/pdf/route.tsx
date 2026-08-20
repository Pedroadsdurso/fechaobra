import { renderToStream } from '@react-pdf/renderer'
import { NextResponse, type NextRequest } from 'next/server'

import { dentroDoLimite, ipDaRequisicao } from '@/lib/limite-taxa'
import { paraDocumento } from '@/modules/orcamentos/adaptador-documento'
import { DocumentoOrcamento } from '@/modules/documento/documento-orcamento'
import { carregarOrcamentoPublico } from '@/modules/publico/consultas'
import { urlPublica as urlPublicaDoToken } from '@/lib/url-base'

/**
 * O PDF do orçamento, gerado no servidor.
 *
 * Por que não no navegador, como no editor: o @react-pdf/renderer e as fontes
 * somam alguns megabytes de JavaScript. No editor isso é aceitável — o
 * prestador está trabalhando, numa sessão longa. Aqui quem abre é o cliente,
 * no celular, muitas vezes no 4G, e provavelmente só vai olhar a página. Fazer
 * ele baixar um motor de PDF para talvez não usar é custo que não se paga.
 *
 * Mesmo adaptador e mesmos componentes do resto do app: o arquivo daqui é
 * idêntico ao que o prestador baixa no editor.
 */
export async function GET(request: NextRequest, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params

  if (!dentroDoLimite(`pdf:${ipDaRequisicao(request.headers)}`, 10, 60_000)) {
    return NextResponse.json({ erro: 'Muitas requisições.' }, { status: 429 })
  }

  const publico = await carregarOrcamentoPublico(token)
  if (!publico) return NextResponse.json({ erro: 'Não encontrado.' }, { status: 404 })

  const documento = paraDocumento({
    rascunho: publico.rascunho,
    cliente: publico.cliente,
    empresa: publico.empresa,
    // O QR do rodapé aponta para esta mesma página: quem imprimir o PDF
    // consegue voltar ao link e aceitar pelo celular.
    urlPublica: urlPublicaDoToken(publico.token),
  })

  const fluxo = await renderToStream(<DocumentoOrcamento orcamento={documento} base="public" />)

  const nome = `orcamento-${String(publico.numero).padStart(3, '0')}.pdf`

  return new NextResponse(fluxo as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      // inline: abre no visualizador do celular em vez de baixar direto.
      'Content-Disposition': `inline; filename="${nome}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
