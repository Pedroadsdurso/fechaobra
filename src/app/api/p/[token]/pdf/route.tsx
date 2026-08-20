import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse, type NextRequest } from 'next/server'
import path from 'node:path'

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
 *
 * ---------------------------------------------------------------------------
 * POR QUE O CAMINHO DAS FONTES É ABSOLUTO
 * ---------------------------------------------------------------------------
 * Antes daqui saía base="public", que virava o caminho RELATIVO
 * "public/fonts/Inter-Regular.ttf". Rodando `next start` na máquina, o
 * diretório de trabalho é a raiz do projeto e o arquivo resolve — 200, PDF de
 * 62 KB. Na Vercel, o diretório é /var/task e a pasta public/ NÃO entra na
 * função serverless: ela é servida pela CDN. O arquivo não existe, o
 * react-pdf lança, e a resposta sai 500 com corpo vazio.
 *
 * Duas coisas consertam isso, e as duas são necessárias:
 *   1. process.cwd() aqui, para não depender do diretório de trabalho;
 *   2. outputFileTracingIncludes no next.config.ts, para as .ttf serem
 *      empacotadas junto com esta função.
 *
 * renderToBuffer no lugar de renderToStream: o PDF tem ~60 KB, não há ganho
 * em transmitir em pedaços, e some a conversão entre stream do Node e stream
 * da Web — mais uma diferença entre a máquina e o serverless.
 * ---------------------------------------------------------------------------
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

  const raiz = path.join(process.cwd(), 'public')
  const arquivo = await renderToBuffer(
    <DocumentoOrcamento orcamento={documento} base={raiz} />,
  )

  const nome = `orcamento-${String(publico.numero).padStart(3, '0')}.pdf`

  return new NextResponse(arquivo as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      // inline: abre no visualizador do celular em vez de baixar direto.
      'Content-Disposition': `inline; filename="${nome}"`,
      'Content-Length': String(arquivo.length),
      'Cache-Control': 'private, no-store',
    },
  })
}
