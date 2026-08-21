'use server'

import { exigirAcesso } from '@/modules/acesso/guarda'

import { revalidatePath } from 'next/cache'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import { esquemaCliente } from './esquemas'
import type { EstadoCliente } from './estado'
import type { Cliente } from './tipos'

async function exigirUsuario() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sessão expirada. Entre de novo.')
  return { supabase, user }
}

function paraCliente(linha: {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
}): Cliente {
  return {
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone ?? '',
    email: linha.email ?? '',
    endereco: linha.endereco ?? '',
  }
}

function extrair(dados: FormData) {
  return esquemaCliente.safeParse({
    nome: dados.get('nome'),
    telefone: dados.get('telefone'),
    email: dados.get('email'),
    endereco: dados.get('endereco'),
  })
}

export async function criarCliente(
  _anterior: EstadoCliente,
  dados: FormData,
): Promise<EstadoCliente> {
  await exigirAcesso()
  const resultado = extrair(dados)
  if (!resultado.success) return { errosPorCampo: resultado.error.flatten().fieldErrors }

  const { supabase, user } = await exigirUsuario()
  const c = resultado.data

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      user_id: user.id,
      nome: c.nome,
      telefone: c.telefone ?? null,
      email: c.email ?? null,
      endereco: c.endereco ?? null,
    })
    .select('id, nome, telefone, email, endereco')
    .single()

  if (error || !data) return { erro: 'Não foi possível salvar o cliente. Tente de novo.' }

  revalidatePath('/painel/clientes')
  // O cliente volta junto para a criação inline: quem chamou de dentro do
  // orçamento já seleciona o registro novo sem precisar recarregar a lista.
  return { ok: true, cliente: paraCliente(data) }
}

export async function atualizarCliente(
  _anterior: EstadoCliente,
  dados: FormData,
): Promise<EstadoCliente> {
  await exigirAcesso()
  const id = dados.get('id')
  if (typeof id !== 'string' || !id) return { erro: 'Cliente não identificado.' }

  const resultado = extrair(dados)
  if (!resultado.success) return { errosPorCampo: resultado.error.flatten().fieldErrors }

  const { supabase, user } = await exigirUsuario()
  const c = resultado.data

  // O .eq('user_id') é redundante com o RLS, mas deixa a intenção explícita
  // para quem ler o código sem abrir as policies.
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nome: c.nome,
      telefone: c.telefone ?? null,
      email: c.email ?? null,
      endereco: c.endereco ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, nome, telefone, email, endereco')
    .single()

  if (error || !data) return { erro: 'Não foi possível salvar as alterações.' }

  revalidatePath('/painel/clientes')
  return { ok: true, cliente: paraCliente(data) }
}

export async function apagarCliente(id: string): Promise<{ ok: boolean; erro?: string }> {
  await exigirAcesso()
  const { supabase, user } = await exigirUsuario()

  const { error } = await supabase.from('clientes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { ok: false, erro: 'Não foi possível apagar o cliente.' }

  revalidatePath('/painel/clientes')
  return { ok: true }
}
