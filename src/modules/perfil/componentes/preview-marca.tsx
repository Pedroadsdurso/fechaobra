'use client'

import { Document, Page, StyleSheet } from '@react-pdf/renderer'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

import { Cabecalho } from '@/modules/documento/blocos/cabecalho'
import { registrarFontes } from '@/modules/documento/fontes'
import { CORES, ESP, FONTE, TAM } from '@/modules/documento/tema'
import { dataLocalISO } from '@/lib/utils'
import type { OrcamentoDocumento } from '@/modules/documento/tipos'

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <Esqueleto />,
})

/**
 * Recorte do topo do documento, não uma A4 inteira.
 *
 * Numa folha completa o cabeçalho ocuparia um quinto da altura e ficaria
 * ilegível no celular. Recortando na altura do bloco, o preview mostra grande
 * exatamente o que a pessoa está editando. A largura continua sendo a real
 * (595pt), então as quebras de linha são as do documento de verdade.
 */
const ALTURA_RECORTE = 320

const s = StyleSheet.create({
  pagina: {
    fontFamily: FONTE.familia,
    fontSize: TAM.corpo,
    color: CORES.texto,
    backgroundColor: CORES.branco,
    paddingTop: ESP.paginaTopo,
    paddingBottom: 12,
    paddingHorizontal: ESP.paginaX,
  },
})

export type DadosPreview = {
  nomeEmpresa: string
  responsavel: string
  telefone: string
  email: string
  cnpjCpf: string
  endereco: string
  corPrimaria: string
  logoUrl: string
}

function Esqueleto() {
  return (
    <div className="flex h-full items-center justify-center bg-fundo">
      <p className="text-sm text-tinta-suave">Montando a prévia…</p>
    </div>
  )
}

/** Orçamento de mentira só para alimentar o cabeçalho real. */
function montarOrcamento(dados: DadosPreview): OrcamentoDocumento {
  const hoje = new Date()
  const validade = new Date(hoje)
  validade.setDate(validade.getDate() + 15)

  return {
    numero: 1,
    titulo: 'Reforma de banheiro social',
    tipoServicoRotulo: 'Reforma completa',
    dataEmissao: dataLocalISO(hoje),
    dataValidade: dataLocalISO(validade),
    validadeDias: 15,
    empresa: {
      nome: dados.nomeEmpresa.trim() || 'Sua empresa',
      responsavel: dados.responsavel.trim() || undefined,
      telefone: dados.telefone.trim() || undefined,
      email: dados.email.trim() || undefined,
      cnpjCpf: dados.cnpjCpf.trim() || undefined,
      endereco: dados.endereco.trim() || undefined,
      logoUrl: dados.logoUrl || undefined,
      corPrimaria: dados.corPrimaria,
    },
    cliente: { nome: 'Cliente exemplo' },
    itens: [],
    pacotes: [],
    fotos: [],
    textoEscopo: '',
    textoExclusoes: '',
    textoGarantia: '',
    textoCondicoesPagamento: '',
  }
}

export function PreviewMarca({ dados }: { dados: DadosPreview }) {
  // Depender do OBJETO `dados` fazia o efeito reagir à identidade, que muda a
  // cada tecla por construção (setCampos devolve objeto novo). Junto com o
  // elemento <Document> recriado a cada render, isso jogava o PDFViewer num
  // laço de atualização — "Maximum update depth exceeded". Comparar uma string
  // dos valores corta o laço: o efeito só dispara quando o conteúdo muda mesmo.
  const assinatura = JSON.stringify(dados)
  const [estavel, setEstavel] = useState(dados)

  useEffect(() => {
    // Redesenhar o PDF a cada tecla trava a digitação: cada render remonta o
    // documento inteiro. Meio segundo de silêncio é o gatilho.
    const relogio = setTimeout(() => setEstavel(JSON.parse(assinatura) as DadosPreview), 500)
    return () => clearTimeout(relogio)
  }, [assinatura])

  registrarFontes()

  // O elemento precisa de identidade estável: o PDFViewer observa os próprios
  // filhos, e um elemento novo a cada render seria lido como documento novo.
  const documento = useMemo(
    () => (
      <Document>
        <Page size={[595, ALTURA_RECORTE]} style={s.pagina}>
          <Cabecalho orcamento={montarOrcamento(estavel)} cor={estavel.corPrimaria} />
        </Page>
      </Document>
    ),
    [estavel],
  )

  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
      {documento}
    </PDFViewer>
  )
}
