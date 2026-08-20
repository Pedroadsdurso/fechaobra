import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { Paragrafo, TituloSecao } from '../primitivos'
import { clarear, CORES, ESP, FONTE, TAM } from '../tema'
import type { OrcamentoDocumento } from '../tipos'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },
  sub: { marginBottom: 11 },
  subTitulo: {
    fontSize: TAM.pequeno,
    fontWeight: FONTE.negrito,
    color: CORES.texto,
    marginBottom: 3,
  },
  prazo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 11,
  },
  prazoRotulo: {
    fontSize: TAM.microTitulo,
    textTransform: 'uppercase',
    marginRight: 8,
  },
  prazoValor: { fontSize: TAM.pequeno, fontWeight: FONTE.media, color: CORES.texto, flex: 1 },
  observacoes: {
    fontSize: TAM.mini,
    color: CORES.textoFraco,
    lineHeight: 1.45,
    marginTop: 4,
  },
})

export function Condicoes({ orcamento, cor }: { orcamento: OrcamentoDocumento; cor: string }) {
  return (
    <View style={s.bloco}>
      <TituloSecao cor={cor}>Prazo, pagamento e garantia</TituloSecao>

      {orcamento.prazoExecucao && (
        <View style={[s.prazo, { backgroundColor: clarear(cor) }]} wrap={false}>
          <Text style={[s.prazoRotulo, { color: cor }]}>Prazo de execução</Text>
          <Text style={s.prazoValor}>{orcamento.prazoExecucao}</Text>
        </View>
      )}

      <View style={s.sub} minPresenceAhead={48}>
        <Text style={s.subTitulo}>Condições de pagamento</Text>
        <Paragrafo>{orcamento.textoCondicoesPagamento}</Paragrafo>
      </View>

      <View style={s.sub} minPresenceAhead={48}>
        <Text style={s.subTitulo}>Garantia</Text>
        <Paragrafo>{orcamento.textoGarantia}</Paragrafo>
      </View>

      {orcamento.observacoes && <Text style={s.observacoes}>{orcamento.observacoes}</Text>}
    </View>
  )
}
