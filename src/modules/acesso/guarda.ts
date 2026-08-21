import 'server-only'

import { temAcesso } from './consultas'

/**
 * A tranca das Server Actions.
 *
 * Chame no PRIMEIRO comando de toda ação que cria, altera ou envia. Não no
 * meio, não depois de validar formulário: antes de tocar em qualquer coisa.
 *
 * Lança em vez de devolver erro tratável, e isso é proposital. Ação sem
 * acesso não é entrada inválida que o usuário conserta digitando melhor — é
 * chamada que não deveria existir, porque a interface não oferece o caminho.
 * Quem chega aqui montou a requisição na mão. O certo é parar seco.
 */
export class SemAcesso extends Error {
  constructor() {
    super('Esta conta não tem uma compra ativa.')
    this.name = 'SemAcesso'
  }
}

export async function exigirAcesso() {
  if (!(await temAcesso())) throw new SemAcesso()
}
