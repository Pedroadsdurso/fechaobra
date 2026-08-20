import type { OrcamentoNaLista } from './consultas'
import { estadoDeValidade } from './estado-validade'

/**
 * A ordem da lista.
 *
 * A pergunta que esta tela responde é "o que eu faço agora", não "o que eu já
 * fiz". Por isso a ordenação é por urgência de ação, e não por data — data é
 * critério de arquivo, e arquivo não cobra retorno de ninguém.
 */

export type Urgencia =
  | 'aceito'
  | 'visualizado-parado'
  | 'enviado-nao-aberto'
  | 'vencendo'
  | 'normal'

/** Quanto tempo o cliente pode ficar quieto antes de valer uma cutucada. */
const DIAS_PARA_COBRAR_VISUALIZADO = 2
const DIAS_PARA_COBRAR_ENVIADO = 3
const DIAS_PARA_VENCER = 5

export function diasDesde(iso: string | null): number | null {
  if (!iso) return null
  const decorrido = Date.now() - new Date(iso).getTime()
  return Math.floor(decorrido / 86400000)
}

/**
 * Tempo decorrido em linguagem de conversa.
 *
 * "há 4 dias" e "hoje" comunicam urgência; "12/08/2026 às 14:32" obriga a
 * pessoa a fazer a conta na cabeça, no meio da obra.
 */
export function tempoDecorrido(iso: string | null): string {
  if (!iso) return ''

  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)

  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return horas === 1 ? 'há 1 hora' : `há ${horas} horas`

  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`

  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}

export function urgenciaDe(orcamento: OrcamentoNaLista): Urgencia {
  if (orcamento.vazio) return 'normal'

  // 1. Aceito é dinheiro esperando para virar obra — até o prestador dizer
  //    que já combinou. Aí sai da fila e cai na ordem normal, sem deixar de
  //    ser aceito.
  if (orcamento.status === 'aceito') return orcamento.tratadoEm ? 'normal' : 'aceito'

  // 2. Abriu, leu e não respondeu. É aqui que o follow-up fecha venda.
  if (orcamento.status === 'visualizado') {
    const dias = diasDesde(orcamento.visualizadoEm ?? orcamento.atualizadoEm)
    if (dias !== null && dias >= DIAS_PARA_COBRAR_VISUALIZADO) return 'visualizado-parado'
  }

  // 3. Mandou e o cliente nem abriu. Muitas vezes a mensagem se perdeu.
  if (orcamento.status === 'enviado') {
    const dias = diasDesde(orcamento.enviadoEm)
    if (dias !== null && dias >= DIAS_PARA_COBRAR_ENVIADO) return 'enviado-nao-aberto'
  }

  // 4. Prazo acabando, em qualquer estado que ainda espere resposta.
  const validade = estadoDeValidade(orcamento.dataValidade)
  if (
    validade &&
    validade.dias >= 0 &&
    validade.dias <= DIAS_PARA_VENCER &&
    (orcamento.status === 'enviado' || orcamento.status === 'visualizado')
  ) {
    return 'vencendo'
  }

  return 'normal'
}

const PESO: Record<Urgencia, number> = {
  aceito: 0,
  'visualizado-parado': 1,
  'enviado-nao-aberto': 2,
  vencendo: 3,
  normal: 4,
}

export function ordenarPorUrgencia(orcamentos: OrcamentoNaLista[]): OrcamentoNaLista[] {
  return [...orcamentos].sort((a, b) => {
    const diferenca = PESO[urgenciaDe(a)] - PESO[urgenciaDe(b)]
    if (diferenca !== 0) return diferenca

    // Dentro da mesma urgência, o mais recente primeiro.
    return new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
  })
}

/**
 * A frase que explica por que aquele orçamento está ali em cima, e o que o
 * prestador ganha agindo agora.
 */
export function chamadaDeAcao(orcamento: OrcamentoNaLista): string | null {
  switch (urgenciaDe(orcamento)) {
    case 'aceito':
      return `Aceito ${tempoDecorrido(orcamento.respondidoEm)} — combine o início com o cliente`
    case 'visualizado-parado':
      return `Visto ${tempoDecorrido(orcamento.visualizadoEm ?? orcamento.atualizadoEm)} e sem resposta`
    case 'enviado-nao-aberto':
      return `Enviado ${tempoDecorrido(orcamento.enviadoEm)} e ainda não foi aberto`
    case 'vencendo': {
      const validade = estadoDeValidade(orcamento.dataValidade)
      return validade ? `Prazo acabando: ${validade.texto}` : null
    }
    default:
      return null
  }
}

/** Nestes estados, o próximo gesto é falar com o cliente. */
export function pedeContato(orcamento: OrcamentoNaLista) {
  const urgencia = urgenciaDe(orcamento)
  return (
    urgencia === 'aceito' ||
    urgencia === 'visualizado-parado' ||
    urgencia === 'enviado-nao-aberto' ||
    urgencia === 'vencendo'
  )
}
