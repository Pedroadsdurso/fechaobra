import { StyleSheet, View } from '@react-pdf/renderer'

import { Paragrafo, TituloSecao } from '../primitivos'
import { ESP } from '../tema'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },
})

export function Escopo({ texto, cor }: { texto: string; cor: string }) {
  return (
    <View style={s.bloco}>
      <TituloSecao cor={cor}>O que está incluso</TituloSecao>
      <Paragrafo>{texto}</Paragrafo>
    </View>
  )
}
