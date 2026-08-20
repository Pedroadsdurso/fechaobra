import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { CORES, ENTRELINHA, ESP, FONTE, TAM } from './tema'

/**
 * Nenhum estilo daqui usa letterSpacing, de propósito.
 *
 * O react-pdf implementa espaçamento entre letras posicionando cada glifo
 * individualmente, e o extrator de texto do leitor de PDF lê isso como espaços
 * de verdade: "O QUE ESTÁ INCLUSO" saía do Ctrl+C como "O Q U E E S TÁ I N C
 * L U S O". Como o prestador copia trecho do orçamento para colar no WhatsApp,
 * isso destruía a credibilidade do documento no exato momento de vender.
 *
 * A hierarquia foi remontada com peso, tamanho e cor.
 */
const s = StyleSheet.create({
  tituloSecao: {
    fontSize: TAM.medio,
    fontWeight: FONTE.negrito,
    marginBottom: ESP.linha,
  },
  regua: { height: 1.5, marginBottom: ESP.bloco },
  paragrafo: {
    fontSize: TAM.corpo,
    color: CORES.textoSuave,
    lineHeight: ENTRELINHA,
    textAlign: 'justify',
  },
  rotulo: {
    fontSize: TAM.microTitulo,
    fontWeight: FONTE.negrito,
    color: CORES.textoFraco,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  valor: { fontSize: TAM.pequeno, color: CORES.texto, lineHeight: 1.35 },
  marcadorLinha: { flexDirection: 'row', marginBottom: 3 },
  marcadorPonto: { width: 11, fontSize: TAM.corpo, lineHeight: ENTRELINHA },
  marcadorTexto: {
    flex: 1,
    fontSize: TAM.corpo,
    color: CORES.textoSuave,
    lineHeight: ENTRELINHA,
    textAlign: 'justify',
  },
})

/**
 * Título de seção: caixa alta e corpo 8 viraram caixa normal e corpo 12 em
 * negrito na cor da marca. Ganha presença sem espaçamento, e o Ctrl+C devolve
 * exatamente "O que está incluso".
 */
export function TituloSecao({ children, cor }: { children: string; cor: string }) {
  return (
    <View>
      <Text style={[s.tituloSecao, { color: cor }]}>{children}</Text>
      <View style={[s.regua, { backgroundColor: cor }]} />
    </View>
  )
}

export function Paragrafo({ children }: { children: string }) {
  return <Text style={s.paragrafo}>{children}</Text>
}

/** Par rótulo/valor usado nos cartões de dados. */
export function Campo({ rotulo, valor }: { rotulo: string; valor?: string }) {
  if (!valor) return null
  return (
    <View>
      <Text style={s.rotulo}>{rotulo}</Text>
      <Text style={s.valor}>{valor}</Text>
    </View>
  )
}

export function Marcador({ children, cor }: { children: string; cor: string }) {
  return (
    <View style={s.marcadorLinha} wrap={false}>
      <Text style={[s.marcadorPonto, { color: cor }]}>•</Text>
      <Text style={s.marcadorTexto}>{children}</Text>
    </View>
  )
}
