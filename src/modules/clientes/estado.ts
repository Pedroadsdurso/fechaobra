import type { Cliente } from './tipos'

/** Fora de acoes.ts: aquele arquivo tem "use server" e só exporta funções. */
export type EstadoCliente = {
  ok?: boolean
  erro?: string
  errosPorCampo?: Record<string, string[]>
  /** Devolvido na criação, para quem chamou já sair usando o cliente novo. */
  cliente?: Cliente
}

export const ESTADO_CLIENTE_INICIAL: EstadoCliente = {}
