/**
 * As categorias de dúvida do cliente.
 *
 * SEM 'server-only' DE PROPÓSITO: este arquivo é lido pelo componente de
 * cliente que desenha os botões E pela rota que valida o corpo do POST. É dado
 * puro — nenhuma leitura de ambiente, nenhum segredo — então atravessar a
 * fronteira aqui é seguro, e é o que garante que a lista da tela e a lista que
 * o servidor aceita não possam divergir.
 *
 * A lista também existe como constraint no banco (migration 0010). Três cópias
 * parece demais até lembrar que cada uma responde uma pergunta diferente: esta
 * decide o que é desenhado, a do servidor decide o que é aceito, e a do banco
 * é a última defesa contra o que for montado à mão numa rota pública.
 */

export const MOTIVOS_DUVIDA = [
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'prazo', rotulo: 'Prazo' },
  { valor: 'escopo', rotulo: 'O que está incluso' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

export type MotivoDuvida = (typeof MOTIVOS_DUVIDA)[number]['valor']

/** O limite do campo livre. Cobrado aqui, no servidor e no banco. */
export const LIMITE_MOTIVO_TEXTO = 200

export function motivoValido(valor: unknown): valor is MotivoDuvida {
  return MOTIVOS_DUVIDA.some((m) => m.valor === valor)
}
