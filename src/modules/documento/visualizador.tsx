'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import { cn } from '@/lib/utils'

import { DocumentoOrcamento } from './documento-orcamento'
import { MOCKS, type ChaveMock } from './mock'

/**
 * O react-pdf só existe no navegador: usa APIs de DOM e Blob que não têm
 * equivalente no servidor. Por isso os dois componentes entram por import
 * dinâmico com ssr: false — senão o build quebra na renderização do servidor.
 */
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <Espera />,
})

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false },
)

function Espera() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-borda bg-superficie">
      <p className="text-sm text-tinta-suave">Montando o documento…</p>
    </div>
  )
}

function nomeArquivo(chave: ChaveMock) {
  const dados = MOCKS[chave].dados
  const empresa = dados.empresa.nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `orcamento-${String(dados.numero).padStart(3, '0')}-${empresa}.pdf`
}

export function VisualizadorDocumento() {
  const [chave, setChave] = useState<ChaveMock>('completo')
  const orcamento = MOCKS[chave].dados

  // key no PDFViewer força a remontagem ao trocar de mock. Sem isso o visor
  // mantém o documento anterior em cache e a troca não aparece.
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="radiogroup"
          aria-label="Escolher o mock"
          className="flex gap-1 rounded-lg border border-borda bg-superficie p-1"
        >
          {(Object.keys(MOCKS) as ChaveMock[]).map((opcao) => (
            <button
              key={opcao}
              role="radio"
              aria-checked={chave === opcao}
              onClick={() => setChave(opcao)}
              className={cn(
                'min-h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors',
                chave === opcao
                  ? 'bg-marca text-white'
                  : 'text-tinta-suave hover:bg-fundo hover:text-tinta',
              )}
            >
              {opcao === 'completo' ? 'Completo' : 'Fallback'}
            </button>
          ))}
        </div>

        <PDFDownloadLink
          key={chave}
          document={<DocumentoOrcamento orcamento={orcamento} />}
          fileName={nomeArquivo(chave)}
        >
          {({ loading }) => (
            <Botao tamanho="medio" disabled={loading} larguraTotal>
              {loading ? 'Gerando PDF…' : 'Baixar PDF'}
            </Botao>
          )}
        </PDFDownloadLink>
      </div>

      <p className="text-xs text-tinta-suave">{MOCKS[chave].rotulo}</p>

      <div className="h-[70vh] overflow-hidden rounded-lg border border-borda md:h-[calc(100vh-15rem)]">
        <PDFViewer
          key={chave}
          width="100%"
          height="100%"
          showToolbar
          style={{ border: 'none' }}
        >
          <DocumentoOrcamento orcamento={orcamento} />
        </PDFViewer>
      </div>
    </div>
  )
}
