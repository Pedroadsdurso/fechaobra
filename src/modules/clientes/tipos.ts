/**
 * Formato de cliente usado pela interface.
 *
 * Não é `Tabela<'clientes'>` de propósito: a tela não precisa de user_id nem
 * dos carimbos de tempo, e assim o componente não muda se a coluna mudar.
 */
export type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string
  endereco: string
}

export type ClienteComUso = Cliente & {
  /** Quantos orçamentos apontam para este cliente. Guia o aviso de exclusão. */
  orcamentos: number
}
