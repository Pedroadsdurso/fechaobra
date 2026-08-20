/**
 * Validação de CPF e CNPJ pelo dígito verificador.
 *
 * Documento errado impresso no orçamento é pior que documento ausente: passa
 * despercebido até alguém tentar emitir nota, e aí a conversa já azedou. Por
 * isso o app avisa — mas nunca bloqueia o salvamento. Tem prestador com
 * situação cadastral atípica, e travar o fluxo por causa de um dígito seria
 * pior do que deixar passar.
 */

export type SituacaoDocumento = 'vazio' | 'incompleto' | 'valido' | 'invalido'

/** Calcula um dígito verificador pelo módulo 11 com os pesos informados. */
function digitoModulo11(digitos: number[], pesos: number[]) {
  const soma = digitos.reduce((total, digito, i) => total + digito * pesos[i], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function validarCpf(valor: string) {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11) return false

  // 111.111.111-11 e afins passam na conta do módulo 11, mas não existem.
  if (/^(\d)\1{10}$/.test(d)) return false

  const n = d.split('').map(Number)
  const primeiro = digitoModulo11(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const segundo = digitoModulo11(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])

  return primeiro === n[9] && segundo === n[10]
}

export function validarCnpj(valor: string) {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const n = d.split('').map(Number)
  const primeiro = digitoModulo11(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const segundo = digitoModulo11(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return primeiro === n[12] && segundo === n[13]
}

/**
 * Classifica o que o usuário digitou até agora.
 *
 * "incompleto" existe para o aviso não piscar a cada tecla enquanto a pessoa
 * ainda está digitando: só vira "invalido" quando o documento tem comprimento
 * de CPF ou CNPJ e mesmo assim não fecha.
 */
export function situacaoDocumento(valor: string): SituacaoDocumento {
  const d = valor.replace(/\D/g, '')

  if (d.length === 0) return 'vazio'
  if (d.length === 11) return validarCpf(d) ? 'valido' : 'invalido'
  if (d.length === 14) return validarCnpj(d) ? 'valido' : 'invalido'
  return 'incompleto'
}

export function rotuloDocumento(valor: string) {
  const d = valor.replace(/\D/g, '')
  return d.length > 11 ? 'CNPJ' : 'CPF'
}
