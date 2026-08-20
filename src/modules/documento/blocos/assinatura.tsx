import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { TituloSecao } from '../primitivos'
import { CORES, ENTRELINHA, ESP, FONTE, TAM } from '../tema'
import type { OrcamentoDocumento } from '../tipos'

const s = StyleSheet.create({
  bloco: { marginTop: ESP.secao },

  aceite: {
    fontSize: TAM.corpo,
    color: CORES.texto,
    lineHeight: ENTRELINHA,
    marginBottom: 14,
  },

  localData: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  localDataRotulo: { fontSize: TAM.pequeno, color: CORES.textoSuave, marginRight: 6 },
  // Linhas desenhadas com borda em View vazia: mais confiável que caractere de
  // sublinhado, que muda de largura conforme a fonte.
  linhaLocal: { width: 150, borderBottomWidth: 0.75, borderBottomColor: CORES.linhaForte },
  barra: { fontSize: TAM.pequeno, color: CORES.textoFraco, marginHorizontal: 5 },
  linhaDia: { width: 26, borderBottomWidth: 0.75, borderBottomColor: CORES.linhaForte },
  linhaAno: { width: 40, borderBottomWidth: 0.75, borderBottomColor: CORES.linhaForte },

  colunas: { flexDirection: 'row', gap: 34 },
  coluna: { flex: 1 },
  linhaAssinatura: { borderBottomWidth: 0.75, borderBottomColor: CORES.texto, marginBottom: 6 },
  papel: {
    fontSize: TAM.microTitulo,
    fontWeight: FONTE.negrito,
    color: CORES.textoFraco,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  nome: { fontSize: TAM.pequeno, fontWeight: FONTE.media, color: CORES.texto, lineHeight: 1.3 },
  documento: { fontSize: TAM.micro, color: CORES.textoSuave, marginTop: 2 },
})

function Assinante({
  papel,
  nome,
  documento,
}: {
  papel: string
  nome: string
  documento?: string
}) {
  return (
    <View style={s.coluna}>
      {/* A linha precisa de altura própria para existir: sem o espaço acima,
          não sobra onde assinar. */}
      <View style={[s.linhaAssinatura, { height: 26 }]} />
      <Text style={s.papel}>{papel}</Text>
      <Text style={s.nome}>{nome}</Text>
      <Text style={s.documento}>{documento ? `CPF/CNPJ ${documento}` : 'CPF/CNPJ'}</Text>
    </View>
  )
}

/**
 * Fecho do documento.
 *
 * `wrap={false}`: assinatura órfã numa folha sozinha, longe do valor e das
 * condições, é o que faz o cliente parar para reler em vez de assinar. O bloco
 * inteiro pula de página junto se não couber.
 */
export function Assinatura({ orcamento, cor }: { orcamento: OrcamentoDocumento; cor: string }) {
  const { empresa, cliente } = orcamento

  return (
    <View style={s.bloco} wrap={false}>
      <TituloSecao cor={cor}>Aceite</TituloSecao>

      <Text style={s.aceite}>
        Declaro estar de acordo com o escopo, valores e condições descritos neste orçamento.
      </Text>

      <View style={s.localData}>
        <Text style={s.localDataRotulo}>Local e data:</Text>
        <View style={s.linhaLocal} />
        <Text style={s.barra}>,</Text>
        <View style={s.linhaDia} />
        <Text style={s.barra}>/</Text>
        <View style={s.linhaDia} />
        <Text style={s.barra}>/</Text>
        <View style={s.linhaAno} />
      </View>

      <View style={s.colunas}>
        <Assinante papel="Prestador" nome={empresa.responsavel ?? empresa.nome} documento={empresa.cnpjCpf} />
        <Assinante papel="Contratante" nome={cliente.nome} />
      </View>
    </View>
  )
}
