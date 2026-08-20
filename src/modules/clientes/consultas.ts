import 'server-only'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import type { ClienteComUso } from './tipos'

/**
 * Lista os clientes do usuário, do mais recente para o mais antigo, já com a
 * contagem de orçamentos de cada um.
 *
 * A contagem vem no mesmo round-trip, por join agregado do PostgREST, em vez
 * de uma consulta por linha: com 200 clientes na agenda isso é a diferença
 * entre uma requisição e duzentas.
 *
 * Sem paginação nem busca no servidor de propósito. A agenda de um prestador
 * é de dezenas a poucas centenas de nomes, cabe inteira numa resposta, e
 * filtrar no aparelho responde na hora — inclusive no 4G ruim de canteiro de
 * obra, onde cada ida ao servidor é meio segundo de espera. Se um dia a lista
 * crescer a ponto de pesar, aí entra busca no servidor.
 */
export async function listarClientes(): Promise<ClienteComUso[]> {
  const supabase = await criarClienteServidor()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, email, endereco, orcamentos(count)')
    .order('criado_em', { ascending: false })

  if (error || !data) return []

  return data.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone ?? '',
    email: linha.email ?? '',
    endereco: linha.endereco ?? '',
    orcamentos: linha.orcamentos?.[0]?.count ?? 0,
  }))
}
