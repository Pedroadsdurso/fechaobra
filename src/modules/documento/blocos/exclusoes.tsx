import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { emMarcadores } from '../formatadores'
import { Marcador, TituloSecao } from '../primitivos'
import { CORES, ENTRELINHA, ESP, FONTE, TAM } from '../tema'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },
  abertura: {
    fontSize: TAM.corpo,
    color: CORES.texto,
    fontWeight: FONTE.media,
    lineHeight: ENTRELINHA,
    marginBottom: 6,
  },
})

/**
 * O parágrafo do seed vira lista de marcadores. É transformação de forma, não
 * de conteúdo: a frase de abertura fica inteira e o resto quebra nos ponto e
 * vírgula que já existiam. Em lista o cliente lê de verdade — e é justamente
 * esta seção que evita a discussão depois.
 */
export function Exclusoes({ texto, cor }: { texto: string; cor: string }) {
  const { abertura, itens } = emMarcadores(texto)

  // A cabeça do bloco — título, frase de abertura e os dois primeiros
  // marcadores — viaja junta. Sem isso, o título sobrava sozinho no pé da
  // página e a lista começava só na seguinte.
  //
  // `minPresenceAhead` seria o caminho idiomático, mas não teve efeito aqui:
  // num View que pode quebrar, o react-pdf ignorou o valor. Agrupar num
  // `wrap={false}` é o que de fato segura os elementos juntos.
  const cabeca = itens.slice(0, 2)
  const resto = itens.slice(2)

  return (
    <View style={s.bloco}>
      <View wrap={false}>
        <TituloSecao cor={cor}>O que não está incluso</TituloSecao>
        {abertura && <Text style={s.abertura}>{abertura}</Text>}
        {cabeca.map((item, i) => (
          <Marcador key={i} cor={cor}>
            {item}
          </Marcador>
        ))}
      </View>

      {resto.map((item, i) => (
        <Marcador key={i} cor={cor}>
          {item}
        </Marcador>
      ))}
    </View>
  )
}
