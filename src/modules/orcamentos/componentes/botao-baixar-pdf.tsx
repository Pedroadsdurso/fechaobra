'use client'

import { useState } from 'react'

import { Botao } from '@/componentes/ui/botao'
import type { Cliente } from '@/modules/clientes/tipos'
import type { EmpresaDocumento } from '@/modules/documento/tipos'

import type { RascunhoOrcamento } from '../tipos'

/**
 * Baixar o PDF a partir do estado atual do orçamento.
 *
 * Antes isto montava um `PDFDownloadLink` do react-pdf, e aí estava o
 * problema: esse componente gera o arquivo AO MONTAR, não ao clicar. Como a
 * `key` dependia do rascunho, cada mudança no editor remontava o link e
 * regerava o documento inteiro no navegador — medido disparando 285 ms depois
 * da última tecla, antes até do debounce do preview. Trabalho pesado, invisível
 * e jogado fora, num aparelho que já estava com dificuldade.
 *
 * Agora é um botão comum. O react-pdf só é baixado e executado quando alguém
 * de fato pede o arquivo.
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
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(false)

  async function baixar() {
    setGerando(true)
    setErro(false)

    try {
      // O peso entra aqui, e só aqui.
      const { gerarBlobPdf, nomeArquivoPdf } = await import('../gerar-pdf')
      const blob = await gerarBlobPdf({ rascunho, cliente, empresa })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nomeArquivoPdf(rascunho.numero, empresa.nome)
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Revogar na hora cancela o download em alguns navegadores: o arquivo
      // ainda está sendo lido quando o clique retorna.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setErro(true)
    } finally {
      setGerando(false)
    }
  }

  return (
    <Botao
      type="button"
      variante={variante}
      onClick={baixar}
      disabled={gerando}
      larguraTotal={larguraTotal}
    >
      {gerando ? 'Gerando PDF…' : erro ? 'Erro — tentar de novo' : 'Baixar PDF'}
    </Botao>
  )
}
