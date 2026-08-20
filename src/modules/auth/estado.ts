/**
 * Estado compartilhado entre as server actions de auth e os formulários.
 *
 * Mora fora de acoes.ts de propósito: um arquivo com "use server" só pode
 * exportar funções async. Todo export dali vira um endpoint RPC, e uma
 * constante ou um tipo não têm como virar endpoint — o Next derruba o build
 * com "A 'use server' file can only export async functions".
 */

export type EstadoFormulario = {
  erro?: string
  aviso?: string
  errosPorCampo?: Record<string, string[]>
}

export const ESTADO_INICIAL: EstadoFormulario = {}
