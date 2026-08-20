import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes do Tailwind resolvendo conflitos (a última vence). */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas))
}

/** 1234.5 -> "R$ 1.234,50" */
export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

/** "11987654321" -> "(11) 98765-4321" */
export function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digitos
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

/** Data ISO -> "19/08/2026" */
export function formatarData(valor: string | Date) {
  const data = typeof valor === 'string' ? new Date(valor) : valor
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data)
}

/**
 * "18472905000164" -> "18.472.905/0001-64" (CNPJ)
 * "48291033870"    -> "482.910.338-70"     (CPF)
 *
 * Decide pelo comprimento: até 11 dígitos é CPF, acima é CNPJ.
 */
export function formatarCnpjCpf(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)

  if (digitos.length <= 11) {
    return digitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/**
 * Data no formato aaaa-mm-dd a partir do calendário LOCAL.
 *
 * Não use `toISOString().slice(0, 10)` para isso. Ele converte para UTC antes
 * de cortar, e no Brasil (UTC−3) qualquer momento depois das 21h já caiu no
 * dia seguinte lá. Resultado: um orçamento emitido às 22h ganhava validade um
 * dia à frente do que a tela mostrava — a tela calculava local, o banco
 * gravava UTC, e ninguém percebia porque a diferença é de um dia só e some
 * durante o horário comercial.
 */
export function dataLocalISO(data: Date = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Hoje mais N dias, no calendário local, em aaaa-mm-dd. */
export function dataLocalEmDias(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() + dias)
  return dataLocalISO(data)
}
