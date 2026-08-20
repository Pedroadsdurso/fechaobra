import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { CORES, ESP, FONTE, TAM } from '../tema'
import type { OrcamentoDocumento } from '../tipos'

const s = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    backgroundColor: CORES.fundoSuave,
    borderRadius: 5,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: ESP.secao,
  },
  coluna: { flex: 1, paddingRight: 14 },
  colunaFinal: { flex: 1, paddingRight: 0 },

  rotulo: {
    fontSize: TAM.microTitulo,
    color: CORES.textoFraco,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  nome: { fontSize: TAM.pequeno, fontWeight: FONTE.media, color: CORES.texto, lineHeight: 1.35 },
  contato: { fontSize: TAM.mini, color: CORES.textoSuave, lineHeight: 1.45, marginTop: 2 },
  local: { fontSize: TAM.pequeno, color: CORES.texto, lineHeight: 1.4 },
})

/**
 * Duas colunas, não três.
 *
 * Com três, a coluna do meio ficava com ~143pt e um e-mail comum
 * ("mariana.albuquerque@email.com.br") não cabia. Como não há espaço no meio
 * de um e-mail, o react-pdf não tem onde quebrar e o texto invadia a coluna
 * vizinha. Telefone e e-mail agora ficam empilhados sob o nome, com o dobro
 * da largura disponível.
 */
export function DadosCliente({ orcamento, cor }: { orcamento: OrcamentoDocumento; cor: string }) {
  const { cliente } = orcamento
  const local = orcamento.localServico ?? cliente.endereco

  return (
    <View style={[s.cartao, { borderLeftColor: cor }]} wrap={false}>
      <View style={s.coluna}>
        <Text style={s.rotulo}>Cliente</Text>
        <Text style={s.nome}>{cliente.nome}</Text>
        {cliente.telefone && <Text style={s.contato}>{cliente.telefone}</Text>}
        {cliente.email && <Text style={s.contato}>{cliente.email}</Text>}
      </View>

      <View style={s.colunaFinal}>
        <Text style={s.rotulo}>Local do serviço</Text>
        <Text style={s.local}>{local ?? '—'}</Text>
      </View>
    </View>
  )
}
