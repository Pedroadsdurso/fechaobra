import type { Database } from './tipos-banco'

/**
 * Atalho para o tipo de uma linha de tabela.
 *
 *   type Cliente = Tabela<'clientes'>
 *
 * Enquanto tipos-banco.ts for o stub, isso resolve para `any`. Depois do
 * `npm run tipos`, passa a resolver para a tipagem real gerada pelo Supabase,
 * e todo o app ganha checagem de colunas sem precisar mudar uma linha aqui.
 */
export type Tabela<Nome extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Nome]['Row']

export type Insercao<Nome extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Nome]['Insert']

export type Atualizacao<Nome extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Nome]['Update']
