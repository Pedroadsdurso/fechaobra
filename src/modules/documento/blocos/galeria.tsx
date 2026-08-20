import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'

import { TituloSecao } from '../primitivos'
import { CORES, ESP, FONTE, TAM } from '../tema'
import type { FotoDocumento } from '../tipos'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },
  introducao: {
    fontSize: TAM.corpo,
    color: CORES.textoSuave,
    lineHeight: 1.45,
    marginBottom: 10,
  },
  grade: { flexDirection: 'row', gap: 8 },
  cartao: {
    borderWidth: 1,
    borderColor: CORES.linha,
    borderRadius: 5,
    overflow: 'hidden',
  },
  legenda: {
    fontSize: TAM.micro,
    color: CORES.textoSuave,
    lineHeight: 1.3,
    paddingHorizontal: 7,
    paddingBottom: 6,
  },
  numero: {
    fontSize: TAM.microTitulo,
    fontWeight: FONTE.negrito,
    textTransform: 'uppercase',
    paddingHorizontal: 7,
    paddingTop: 5,
    paddingBottom: 2,
  },
})

/**
 * Vitrine de trabalhos anteriores. Sem fotos, não renderiza nada — nem quebra
 * de página, para o documento não terminar com folha em branco.
 *
 * Uma faixa única, nunca 2x2.
 *
 * O grid de duas linhas era bonito, mas com `flexWrap` o react-pdf trata a
 * grade inteira como bloco indivisível de ~360pt: ou ela empurrava a
 * assinatura sozinha para a última página, ou descia junto e deixava meia
 * folha vazia atrás. Numa faixa só, a galeria ocupa ~190pt e o fecho do
 * documento (fotos + aceite + assinaturas) cabe inteiro na mesma página.
 */
export function Galeria({ fotos, cor }: { fotos: FotoDocumento[]; cor: string }) {
  if (fotos.length === 0) return null

  const visiveis = fotos.slice(0, 4)
  // Divide a largura útil em partes iguais, descontando os vãos entre cartões.
  const largura = `${(100 - (visiveis.length - 1) * 1.7) / visiveis.length}%`
  // Cartão estreito pede foto mais baixa para não virar retrato.
  const altura = visiveis.length >= 3 ? 78 : 120

  return (
    <View style={s.bloco} wrap={false}>
      <TituloSecao cor={cor}>Trabalhos que já entregamos</TituloSecao>

      <Text style={s.introducao}>
        Serviços do mesmo tipo concluídos recentemente. Se quiser falar com algum destes clientes
        antes de decidir, é só pedir o contato.
      </Text>

      <View style={s.grade}>
        {visiveis.map((foto, i) => (
          <View key={i} style={[s.cartao, { width: largura }]} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer desenha no PDF, não é <img> de HTML e não aceita alt */}
            <Image src={foto.url} style={{ width: '100%', height: altura, objectFit: 'cover' }} />
            <Text style={[s.numero, { color: cor }]}>Obra {String(i + 1).padStart(2, '0')}</Text>
            <Text style={s.legenda}>{foto.legenda}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
