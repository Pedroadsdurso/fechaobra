import type { StatusOrcamento } from './tipos'

/**
 * Validade como estado, não como data.
 *
 * "vence amanhã" dispara ação; "18/09/2026" exige que a pessoa faça a conta na
 * cabeça, no meio da obra, para descobrir se precisa ligar hoje. A lista de
 * orçamentos existe para responder "o que precisa de mim agora" — e é a
 * validade que responde isso na maior parte das vezes.
 */

export type TomValidade = 'vencido' | 'urgente' | 'atencao' | 'tranquilo'

export type EstadoValidade = {
  texto: string
  tom: TomValidade
  dias: number
}

/** Diferença em dias inteiros, ignorando hora. */
function diasAte(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const alvo = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  alvo.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

export function estadoDeValidade(dataValidade: string | null): EstadoValidade | null {
  if (!dataValidade) return null

  const dias = diasAte(dataValidade)

  if (dias < 0) {
    const passados = Math.abs(dias)
    return {
      dias,
      tom: 'vencido',
      texto:
        passados === 1 ? 'venceu ontem' : `venceu há ${passados} dias`,
    }
  }

  if (dias === 0) return { dias, tom: 'urgente', texto: 'vence hoje' }
  if (dias === 1) return { dias, tom: 'urgente', texto: 'vence amanhã' }
  if (dias <= 5) return { dias, tom: 'atencao', texto: `vence em ${dias} dias` }

  return { dias, tom: 'tranquilo', texto: `válido por ${dias} dias` }
}

/**
 * A validade só importa antes da resposta do cliente.
 *
 * Depois de aceito ou recusado, contar dias é ruído — e num orçamento aceito
 * chega a ser enganoso, porque sugere que ainda há prazo correndo. Os status
 * de resposta chegam na Fase 3; a regra já está aqui para o cartão não
 * precisar ser redesenhado quando eles existirem.
 */
export function validadeImporta(status: StatusOrcamento) {
  return status === 'rascunho' || status === 'enviado' || status === 'visualizado'
}
