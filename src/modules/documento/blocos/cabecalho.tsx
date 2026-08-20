/* eslint-disable jsx-a11y/alt-text -- O <Image> aqui é o do @react-pdf/renderer,
   que desenha no PDF e não aceita a prop alt. A regra assume <img> de HTML. */
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatarData } from '../formatadores'
import { CORES, ESP, FONTE, TAM } from '../tema'
import type { OrcamentoDocumento } from '../tipos'

const s = StyleSheet.create({
  // Margem negativa faz a faixa sangrar até a borda do papel, por cima do
  // padding da página. Sem isso ela ficaria "flutuando" com folga dos lados.
  faixa: {
    height: 4,
    marginTop: -ESP.paginaTopo,
    marginHorizontal: -ESP.paginaX,
    marginBottom: 18,
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between' },

  esquerda: { flexDirection: 'row', flex: 1, paddingRight: 18 },
  logo: { width: 46, height: 46, marginRight: 11, objectFit: 'contain' },
  monograma: {
    width: 46,
    height: 46,
    marginRight: 11,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramaTexto: { color: CORES.branco, fontSize: 17, fontWeight: FONTE.negrito },

  nomeEmpresa: {
    fontSize: TAM.medio,
    fontWeight: FONTE.negrito,
    color: CORES.texto,
    lineHeight: 1.25,
    marginBottom: 3,
  },
  detalhe: { fontSize: TAM.micro, color: CORES.textoSuave, lineHeight: 1.45 },

  direita: { width: 175, alignItems: 'flex-end' },
  etiqueta: { fontSize: TAM.microTitulo, fontWeight: FONTE.negrito, textTransform: 'uppercase' },
  numero: { fontSize: TAM.destaque, fontWeight: FONTE.negrito, color: CORES.texto },
  emissao: { fontSize: TAM.micro, color: CORES.textoSuave, marginTop: 2 },

  // Formato bloco: usado quando a empresa tem ficha completa e a coluna da
  // esquerda é alta o bastante para equilibrar.
  validadeBloco: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    alignItems: 'flex-end',
  },
  // Formato faixa: usado quando a empresa tem poucos dados. Ocupa a largura
  // toda em vez de deixar um vão ao lado da coluna curta.
  validadeFaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 14,
  },

  validadeRotulo: { fontSize: TAM.microTitulo, textTransform: 'uppercase', marginBottom: 1 },
  validadeData: { fontSize: TAM.medio, fontWeight: FONTE.negrito },
  validadeDias: { fontSize: TAM.micro, marginTop: 1 },
  faixaEsquerda: { flexDirection: 'row', alignItems: 'baseline' },
  faixaRotulo: { fontSize: TAM.pequeno, marginRight: 8 },
  faixaData: { fontSize: TAM.medio, fontWeight: FONTE.negrito },
  faixaDias: { fontSize: TAM.micro },

  titulo: {
    fontSize: TAM.titulo,
    fontWeight: FONTE.media,
    color: CORES.texto,
    marginTop: 16,
    lineHeight: 1.3,
  },
  subtitulo: { fontSize: TAM.pequeno, color: CORES.textoSuave, marginTop: 3 },
})

/** Iniciais para o monograma de quem ainda não subiu logo. */
function iniciais(nome: string) {
  const ignorar = new Set(['e', 'de', 'da', 'do', 'dos', 'das', '&', 'ltda', 'me', 'epp', 'eireli'])
  return nome
    .split(/\s+/)
    .filter((p) => p && !ignorar.has(p.toLowerCase().replace(/[.,]/g, '')))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * O cabeçalho se adapta à ficha que o prestador preencheu.
 *
 * Assumir empresa completa deixava um vão feio em quem cadastrou só nome e
 * telefone: a coluna da esquerda terminava em três linhas e a pílula de
 * validade ficava sozinha à direita, boiando. Agora a validade muda de forma
 * conforme a densidade de informação — bloco vertical quando há o que
 * equilibrar, faixa de largura total quando não há.
 */
export function Cabecalho({ orcamento, cor }: { orcamento: OrcamentoDocumento; cor: string }) {
  const { empresa } = orcamento
  const contato = [empresa.telefone, empresa.email].filter(Boolean).join('  ·  ')

  const detalhes = [
    empresa.responsavel,
    contato || undefined,
    empresa.cnpjCpf ? `CNPJ/CPF ${empresa.cnpjCpf}` : undefined,
    empresa.endereco,
  ].filter(Boolean) as string[]

  // 4 linhas de detalhe (responsável, contato, documento e endereço) é o ponto
  // em que a coluna esquerda ganha altura comparável à do número mais a pílula.
  // Com 3 ou menos ainda sobrava um vão visível ao lado da pílula — foi medido
  // no mock de fallback, não estimado.
  const fichaCompleta = detalhes.length >= 4

  return (
    <View>
      <View style={[s.faixa, { backgroundColor: cor }]} />

      <View style={s.linha}>
        <View style={s.esquerda}>
          {empresa.logoUrl ? (
            <Image src={empresa.logoUrl} style={s.logo} />
          ) : (
            <View style={[s.monograma, { backgroundColor: cor }]}>
              <Text style={s.monogramaTexto}>{iniciais(empresa.nome)}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={s.nomeEmpresa}>{empresa.nome}</Text>
            {detalhes.map((linha, i) => (
              <Text key={i} style={s.detalhe}>
                {linha}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.direita}>
          <Text style={[s.etiqueta, { color: cor }]}>Orçamento</Text>
          <Text style={s.numero}>Nº {String(orcamento.numero).padStart(3, '0')}</Text>
          <Text style={s.emissao}>Emitido em {formatarData(orcamento.dataEmissao)}</Text>

          {fichaCompleta && (
            <View style={[s.validadeBloco, { backgroundColor: cor }]}>
              <Text style={[s.validadeRotulo, { color: CORES.branco, opacity: 0.75 }]}>
                Proposta válida até
              </Text>
              <Text style={[s.validadeData, { color: CORES.branco }]}>
                {formatarData(orcamento.dataValidade)}
              </Text>
              <Text style={[s.validadeDias, { color: CORES.branco, opacity: 0.75 }]}>
                {orcamento.validadeDias} dias a partir da emissão
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={s.titulo}>{orcamento.titulo}</Text>
      <Text style={s.subtitulo}>{orcamento.tipoServicoRotulo}</Text>

      {!fichaCompleta && (
        <View style={[s.validadeFaixa, { backgroundColor: cor }]}>
          <View style={s.faixaEsquerda}>
            <Text style={[s.faixaRotulo, { color: CORES.branco, opacity: 0.8 }]}>
              Proposta válida até
            </Text>
            <Text style={[s.faixaData, { color: CORES.branco }]}>
              {formatarData(orcamento.dataValidade)}
            </Text>
          </View>
          <Text style={[s.faixaDias, { color: CORES.branco, opacity: 0.8 }]}>
            {orcamento.validadeDias} dias a partir da emissão
          </Text>
        </View>
      )}
    </View>
  )
}
