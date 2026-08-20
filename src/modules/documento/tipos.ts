/**
 * Formato de dados que o documento consome.
 *
 * De propósito NÃO é o tipo do banco: o PDF recebe um objeto já pronto para
 * desenhar. Na Fase 2 entra um adaptador que converte as linhas de orcamentos
 * + orcamento_itens + perfis neste formato. Assim o documento nunca precisa
 * saber que existe Supabase.
 */

export type TipoItem = 'material' | 'mao_de_obra'
export type NomePacote = 'essencial' | 'recomendado' | 'completo'

export type EmpresaDocumento = {
  nome: string
  responsavel?: string
  telefone?: string
  email?: string
  cnpjCpf?: string
  endereco?: string
  /** URL ou caminho público. Sem logo, cai no monograma vetorial. */
  logoUrl?: string
  /** Hex. Sobrepõe CORES.primaria do tema quando presente. */
  corPrimaria?: string
}

export type ClienteDocumento = {
  nome: string
  telefone?: string
  email?: string
  endereco?: string
}

export type ItemDocumento = {
  descricao: string
  quantidade: number
  unidade: string
  valorUnitario: number
  tipo: TipoItem
}

export type PacoteDocumento = {
  nome: NomePacote
  rotulo: string
  resumo: string
  inclui: string[]
  valor: number
}

export type FotoDocumento = {
  url: string
  legenda: string
}

export type OrcamentoDocumento = {
  numero: number
  titulo: string
  tipoServicoRotulo: string
  localServico?: string
  /** ISO (aaaa-mm-dd). Formatado para dd/mm/aaaa na renderização. */
  dataEmissao: string
  dataValidade: string
  validadeDias: number
  prazoExecucao?: string
  empresa: EmpresaDocumento
  cliente: ClienteDocumento
  itens: ItemDocumento[]
  pacotes: PacoteDocumento[]
  fotos: FotoDocumento[]
  textoEscopo: string
  textoExclusoes: string
  textoGarantia: string
  textoCondicoesPagamento: string
  observacoes?: string
}
