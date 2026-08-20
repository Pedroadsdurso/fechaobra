import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatarMoeda, formatarNumero, formatarQuantidade } from '../formatadores'
import { TituloSecao } from '../primitivos'
import { COLUNAS, CORES, ESP, FONTE, TAM } from '../tema'
import type { ItemDocumento, TipoItem } from '../tipos'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },

  cabecalho: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: ESP.celulaX,
  },
  cabecalhoTexto: {
    fontSize: TAM.microTitulo,
    fontWeight: FONTE.negrito,
    color: CORES.branco,
    textTransform: 'uppercase',
  },

  grupo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: CORES.fundoSuave,
    paddingVertical: 4,
    paddingHorizontal: ESP.celulaX,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linha,
  },
  grupoTexto: {
    fontSize: TAM.microTitulo,
    fontWeight: FONTE.negrito,
    textTransform: 'uppercase',
  },

  linha: {
    flexDirection: 'row',
    paddingVertical: ESP.celulaY,
    paddingHorizontal: ESP.celulaX,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linha,
  },
  linhaZebra: { backgroundColor: '#F8FAFB' },

  celula: { fontSize: TAM.mini, color: CORES.textoSuave, lineHeight: 1.3 },
  celulaDescricao: { fontSize: TAM.mini, color: CORES.texto, lineHeight: 1.3 },
  direita: { textAlign: 'right' },
  centro: { textAlign: 'center' },

  subtotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: ESP.celulaX,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linhaForte,
  },
  subtotalRotulo: { fontSize: TAM.mini, color: CORES.textoSuave, marginRight: 12 },
  subtotalValor: {
    fontSize: TAM.mini,
    fontWeight: FONTE.media,
    color: CORES.texto,
    width: '22%',
    textAlign: 'right',
  },

  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 9,
    paddingHorizontal: ESP.celulaX,
    marginTop: 2,
  },
  totalRotulo: {
    fontSize: TAM.pequeno,
    fontWeight: FONTE.negrito,
    color: CORES.branco,
    textTransform: 'uppercase',
    marginRight: 14,
  },
  totalValor: {
    fontSize: TAM.medio,
    fontWeight: FONTE.negrito,
    color: CORES.branco,
    width: '30%',
    textAlign: 'right',
  },

  continuacao: {
    fontSize: TAM.microTitulo,
    color: CORES.textoFraco,
    fontStyle: 'italic',
    paddingHorizontal: ESP.celulaX,
    paddingTop: 3,
    paddingBottom: 2,
  },
})

const ROTULO_GRUPO: Record<TipoItem, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de obra',
}

const larguras = {
  indice: `${COLUNAS.indice * 100}%`,
  descricao: `${COLUNAS.descricao * 100}%`,
  quantidade: `${COLUNAS.quantidade * 100}%`,
  unidade: `${COLUNAS.unidade * 100}%`,
  unitario: `${COLUNAS.unitario * 100}%`,
  total: `${COLUNAS.total * 100}%`,
} as const

/**
 * Cabeçalho de coluna.
 *
 * O `fixed` faz o react-pdf redesenhar este bloco no topo de cada página que a
 * tabela ocupa — é o que garante que, depois da quebra, o cliente continue
 * sabendo qual coluna é quantidade e qual é valor unitário.
 */
function CabecalhoColunas({ cor }: { cor: string }) {
  return (
    <View style={[s.cabecalho, { backgroundColor: cor }]} fixed>
      <Text style={[s.cabecalhoTexto, { width: larguras.indice }]}>#</Text>
      <Text style={[s.cabecalhoTexto, { width: larguras.descricao }]}>Descrição</Text>
      <Text style={[s.cabecalhoTexto, s.centro, { width: larguras.quantidade }]}>Qtd</Text>
      <Text style={[s.cabecalhoTexto, s.centro, { width: larguras.unidade }]}>Un</Text>
      <Text style={[s.cabecalhoTexto, s.direita, { width: larguras.unitario }]}>Unitário</Text>
      <Text style={[s.cabecalhoTexto, s.direita, { width: larguras.total }]}>Total</Text>
    </View>
  )
}

function Linha({ item, indice, zebra }: { item: ItemDocumento; indice: number; zebra: boolean }) {
  const total = item.quantidade * item.valorUnitario

  return (
    <View style={[s.linha, zebra ? s.linhaZebra : undefined]} wrap={false}>
      <Text style={[s.celula, { width: larguras.indice }]}>{indice}</Text>
      <Text style={[s.celulaDescricao, { width: larguras.descricao, paddingRight: 8 }]}>
        {item.descricao}
      </Text>
      <Text style={[s.celula, s.centro, { width: larguras.quantidade }]}>
        {formatarQuantidade(item.quantidade)}
      </Text>
      <Text style={[s.celula, s.centro, { width: larguras.unidade }]}>{item.unidade}</Text>
      <Text style={[s.celula, s.direita, { width: larguras.unitario }]}>
        {formatarNumero(item.valorUnitario)}
      </Text>
      <Text style={[s.celula, s.direita, { width: larguras.total, fontWeight: FONTE.media, color: CORES.texto }]}>
        {formatarNumero(total)}
      </Text>
    </View>
  )
}

export function TabelaItens({ itens, cor }: { itens: ItemDocumento[]; cor: string }) {
  const grupos: TipoItem[] = ['material', 'mao_de_obra']
  const somar = (lista: ItemDocumento[]) =>
    lista.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0)

  const totalGeral = somar(itens)
  let contador = 0

  return (
    <View style={s.bloco}>
      <TituloSecao cor={cor}>Itens do orçamento</TituloSecao>

      <View>
        <CabecalhoColunas cor={cor} />

        {grupos.map((grupo) => {
          const doGrupo = itens.filter((i) => i.tipo === grupo)
          if (doGrupo.length === 0) return null
          const subtotal = somar(doGrupo)

          return (
            <View key={grupo}>
              <View style={s.grupo} wrap={false}>
                <Text style={[s.grupoTexto, { color: cor }]}>{ROTULO_GRUPO[grupo]}</Text>
                <Text style={[s.grupoTexto, { color: CORES.textoFraco }]}>
                  {doGrupo.length} {doGrupo.length === 1 ? 'item' : 'itens'}
                </Text>
              </View>

              {doGrupo.map((item, i) => {
                contador += 1
                return <Linha key={i} item={item} indice={contador} zebra={i % 2 === 1} />
              })}

              <View style={s.subtotal} wrap={false}>
                <Text style={s.subtotalRotulo}>Subtotal de {ROTULO_GRUPO[grupo].toLowerCase()}</Text>
                <Text style={s.subtotalValor}>{formatarMoeda(subtotal)}</Text>
              </View>
            </View>
          )
        })}

        <View style={[s.total, { backgroundColor: cor }]} wrap={false}>
          <Text style={s.totalRotulo}>Total do orçamento</Text>
          <Text style={s.totalValor}>{formatarMoeda(totalGeral)}</Text>
        </View>
      </View>
    </View>
  )
}
