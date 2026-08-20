import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatarMoeda } from '../formatadores'
import { TituloSecao } from '../primitivos'
import { CORES, ESP, FONTE, TAM } from '../tema'
import type { PacoteDocumento } from '../tipos'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },
  linha: { flexDirection: 'row', gap: 8 },

  cartao: {
    flex: 1,
    borderWidth: 1,
    borderColor: CORES.linha,
    borderRadius: 5,
    paddingTop: 8,
    paddingBottom: 9,
    paddingHorizontal: 9,
  },
  cartaoDestaque: { borderWidth: 1.5 },

  selo: {
    position: 'absolute',
    top: -6,
    left: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  seloTexto: {
    fontSize: 6,
    fontWeight: FONTE.negrito,
    color: CORES.branco,
    textTransform: 'uppercase',
  },

  rotulo: {
    fontSize: TAM.pequeno,
    fontWeight: FONTE.negrito,
    color: CORES.texto,
    marginBottom: 2,
  },
  resumo: {
    fontSize: TAM.micro,
    color: CORES.textoFraco,
    lineHeight: 1.4,
    marginBottom: 7,
  },
  valor: { fontSize: TAM.titulo, fontWeight: FONTE.negrito, marginBottom: 7 },

  item: { flexDirection: 'row', marginBottom: 2 },
  itemMarca: { width: 8, fontSize: TAM.micro, lineHeight: 1.4 },
  itemTexto: { flex: 1, fontSize: TAM.micro, color: CORES.textoSuave, lineHeight: 1.4 },

  nota: {
    fontSize: TAM.micro,
    color: CORES.textoFraco,
    marginTop: 6,
    lineHeight: 1.4,
  },
})

/**
 * Três opções lado a lado, com a do meio destacada.
 *
 * A escolha deixa de ser "aceito ou não aceito" e vira "qual dos três" — e o
 * Recomendado, ancorado entre um mais barato e um mais caro, é o que o cliente
 * tende a escolher. Por isso ele leva a borda na cor da marca e o selo.
 */
export function Pacotes({ pacotes, cor }: { pacotes: PacoteDocumento[]; cor: string }) {
  if (pacotes.length === 0) return null

  return (
    <View style={s.bloco} wrap={false}>
      <TituloSecao cor={cor}>Opções de contratação</TituloSecao>

      <View style={s.linha}>
        {pacotes.map((pacote) => {
          const destacado = pacote.destaque ?? pacote.nome === 'recomendado'

          return (
            <View
              key={pacote.nome}
              style={[s.cartao, destacado ? s.cartaoDestaque : undefined, destacado ? { borderColor: cor } : undefined]}
            >
              {destacado && (
                <View style={[s.selo, { backgroundColor: cor }]}>
                  <Text style={s.seloTexto}>Minha indicação</Text>
                </View>
              )}

              <Text style={s.rotulo}>{pacote.rotulo}</Text>
              <Text style={s.resumo}>{pacote.resumo}</Text>
              <Text style={[s.valor, { color: destacado ? cor : CORES.texto }]}>
                {formatarMoeda(pacote.valor)}
              </Text>

              {pacote.inclui.map((item, i) => (
                <View key={i} style={s.item}>
                  <Text style={[s.itemMarca, { color: cor }]}>✓</Text>
                  <Text style={s.itemTexto}>{item}</Text>
                </View>
              ))}
            </View>
          )
        })}
      </View>

      <Text style={s.nota}>
        Os valores acima substituem o total da tabela conforme a opção escolhida. A tabela de itens
        detalha o pacote Recomendado.
      </Text>
    </View>
  )
}
