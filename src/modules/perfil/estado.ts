/**
 * Estado dos formulários de perfil.
 *
 * Fora de acoes.ts porque aquele arquivo tem "use server" e só pode exportar
 * funções async — ver a nota em modules/auth/estado.ts.
 */

export type EstadoMarca = {
  ok?: boolean
  erro?: string
  errosPorCampo?: Record<string, string[]>
}

export const ESTADO_MARCA_INICIAL: EstadoMarca = {}

export type ResultadoLogo = {
  ok: boolean
  erro?: string
  /** Caminho no bucket, como fica gravado em perfis.logo_url. */
  caminho?: string
  /** URL assinada temporária, para exibir na hora. */
  url?: string
}
