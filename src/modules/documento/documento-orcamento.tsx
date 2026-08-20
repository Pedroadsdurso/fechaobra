import { Document, Page, StyleSheet } from '@react-pdf/renderer'

import { Assinatura } from './blocos/assinatura'
import { Cabecalho } from './blocos/cabecalho'
import { Condicoes } from './blocos/condicoes'
import { DadosCliente } from './blocos/dados-cliente'
import { Escopo } from './blocos/escopo'
import { Exclusoes } from './blocos/exclusoes'
import { Galeria } from './blocos/galeria'
import { Pacotes } from './blocos/pacotes'
import { Rodape } from './blocos/rodape'
import { TabelaItens } from './blocos/tabela-itens'
import { registrarFontes } from './fontes'
import { CORES, ESP, FONTE, TAM } from './tema'
import type { OrcamentoDocumento } from './tipos'

const s = StyleSheet.create({
  pagina: {
    fontFamily: FONTE.familia,
    fontSize: TAM.corpo,
    color: CORES.texto,
    backgroundColor: CORES.branco,
    paddingTop: ESP.paginaTopo,
    paddingBottom: ESP.paginaBase,
    paddingHorizontal: ESP.paginaX,
  },
})

/**
 * Prefixa os caminhos de logo e fotos.
 *
 * No navegador as URLs públicas ("/mock/logo.png") já resolvem sozinhas. Em
 * Node não existe raiz de servidor, então o mesmo caminho precisa virar
 * "public/mock/logo.png" para ser lido do disco.
 */
function comBase(orcamento: OrcamentoDocumento, base: string): OrcamentoDocumento {
  if (!base) return orcamento

  return {
    ...orcamento,
    empresa: {
      ...orcamento.empresa,
      logoUrl: orcamento.empresa.logoUrl ? `${base}${orcamento.empresa.logoUrl}` : undefined,
    },
    fotos: orcamento.fotos.map((foto) => ({ ...foto, url: `${base}${foto.url}` })),
  }
}

/**
 * O documento inteiro.
 *
 * Uma única <Page> com wrap: o react-pdf pagina sozinho conforme o conteúdo
 * cresce. Isso é o que faz a tabela de 26 itens atravessar a quebra levando o
 * cabeçalho de colunas junto — em vez de eu ter que decidir na mão onde corta.
 *
 * @param base prefixo dos arquivos de fonte. Vazio no navegador; "public" em
 *   script Node. Ver fontes.ts.
 */
export function DocumentoOrcamento({
  orcamento: entrada,
  base = '',
}: {
  orcamento: OrcamentoDocumento
  base?: string
}) {
  registrarFontes(base)

  const orcamento = comBase(entrada, base)
  const cor = orcamento.empresa.corPrimaria ?? CORES.primaria

  return (
    <Document
      title={`Orçamento ${String(orcamento.numero).padStart(3, '0')} — ${orcamento.empresa.nome}`}
      author={orcamento.empresa.nome}
      subject={orcamento.titulo}
      creator="FechaObra"
      producer="FechaObra"
    >
      <Page size="A4" style={s.pagina} wrap>
        <Cabecalho orcamento={orcamento} cor={cor} />

        <DadosCliente orcamento={orcamento} cor={cor} />
        <Escopo texto={orcamento.textoEscopo} cor={cor} />
        <TabelaItens itens={orcamento.itens} cor={cor} />
        <Pacotes pacotes={orcamento.pacotes} cor={cor} />
        <Exclusoes texto={orcamento.textoExclusoes} cor={cor} />
        <Condicoes orcamento={orcamento} cor={cor} />
        <Galeria fotos={orcamento.fotos} cor={cor} />
        <Assinatura orcamento={orcamento} cor={cor} />

        <Rodape
          nomeEmpresa={orcamento.empresa.nome}
          cor={cor}
          urlPublica={orcamento.urlPublica}
        />
      </Page>
    </Document>
  )
}
