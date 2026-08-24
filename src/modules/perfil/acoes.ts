'use server'

import { exigirAcesso } from '@/modules/acesso/guarda'

import { revalidatePath } from 'next/cache'

import {
  BUCKET_LOGOS,
  criarClienteAdministrador,
  SEGUNDOS_URL_ASSINADA,
} from '@/lib/supabase/administrador'
import { criarClienteServidor } from '@/lib/supabase/servidor'

import { esquemaMarca } from './esquemas'
import type { EstadoMarca, ResultadoLogo } from './estado'

const TAMANHO_MAXIMO = 500 * 1024
const TIPOS_ACEITOS = ['image/png', 'image/jpeg']

async function exigirUsuario() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sessão expirada. Entre de novo.')
  return { supabase, user }
}

export async function salvarMarca(_anterior: EstadoMarca, dados: FormData): Promise<EstadoMarca> {
  await exigirAcesso('salvarMarca')
  const resultado = esquemaMarca.safeParse({
    nomeEmpresa: dados.get('nomeEmpresa'),
    responsavel: dados.get('responsavel'),
    telefone: dados.get('telefone'),
    email: dados.get('email'),
    cnpjCpf: dados.get('cnpjCpf'),
    endereco: dados.get('endereco'),
    corPrimaria: dados.get('corPrimaria'),
  })

  if (!resultado.success) {
    return { errosPorCampo: resultado.error.flatten().fieldErrors }
  }

  const { supabase, user } = await exigirUsuario()
  const m = resultado.data

  // Escrita com a sessão do usuário, não com service role: o RLS de perfis já
  // garante que ninguém alcança a linha de outro.
  const { error } = await supabase
    .from('perfis')
    .update({
      nome_empresa: m.nomeEmpresa,
      responsavel: m.responsavel ?? null,
      telefone: m.telefone ?? null,
      email: m.email ?? null,
      cnpj_cpf: m.cnpjCpf ?? null,
      endereco: m.endereco ?? null,
      cor_primaria: m.corPrimaria,
    })
    .eq('user_id', user.id)

  if (error) return { erro: 'Não foi possível salvar. Tente de novo em instantes.' }

  revalidatePath('/painel/marca')
  revalidatePath('/painel')
  return { ok: true }
}

/**
 * Recebe o logo já comprimido pelo navegador e grava no bucket privado.
 *
 * O caminho é sempre `{user_id}/logo.{ext}`, montado aqui a partir da sessão —
 * nunca do que o cliente mandou. Como o upload usa service role (o bucket não
 * tem policies próprias), essa checagem é a única coisa entre um usuário e o
 * arquivo de outro.
 */
export async function enviarLogo(dados: FormData): Promise<ResultadoLogo> {
  await exigirAcesso('enviarLogo')
  const arquivo = dados.get('logo')

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: 'Nenhum arquivo recebido.' }
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return { ok: false, erro: 'Envie uma imagem PNG ou JPEG.' }
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return {
      ok: false,
      erro: 'Imagem grande demais mesmo depois da compressão.',
    }
  }

  const { supabase, user } = await exigirUsuario()

  const extensao = arquivo.type === 'image/png' ? 'png' : 'jpg'
  const caminho = `${user.id}/logo.${extensao}`
  const admin = criarClienteAdministrador()

  // Trocar de PNG para JPEG (ou o contrário) deixaria o arquivo antigo órfão.
  const { data: anteriores } = await admin.storage.from(BUCKET_LOGOS).list(user.id)
  const orfaos = (anteriores ?? [])
    .filter((f) => f.name.startsWith('logo.') && f.name !== `logo.${extensao}`)
    .map((f) => `${user.id}/${f.name}`)
  if (orfaos.length > 0) await admin.storage.from(BUCKET_LOGOS).remove(orfaos)

  const { error: erroUpload } = await admin.storage
    .from(BUCKET_LOGOS)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })

  if (erroUpload) return { ok: false, erro: 'Falha ao enviar a imagem. Tente de novo.' }

  const { error: erroPerfil } = await supabase
    .from('perfis')
    .update({ logo_url: caminho })
    .eq('user_id', user.id)

  if (erroPerfil)
    return {
      ok: false,
      erro: 'Imagem enviada, mas não foi possível salvar no perfil.',
    }

  const { data: assinada } = await admin.storage
    .from(BUCKET_LOGOS)
    .createSignedUrl(caminho, SEGUNDOS_URL_ASSINADA)

  revalidatePath('/painel/marca')
  return { ok: true, caminho, url: assinada?.signedUrl }
}

export async function removerLogo(): Promise<ResultadoLogo> {
  await exigirAcesso('removerLogo')
  const { supabase, user } = await exigirUsuario()
  const admin = criarClienteAdministrador()

  const { data: arquivos } = await admin.storage.from(BUCKET_LOGOS).list(user.id)
  const caminhos = (arquivos ?? []).map((f) => `${user.id}/${f.name}`)
  if (caminhos.length > 0) await admin.storage.from(BUCKET_LOGOS).remove(caminhos)

  const { error } = await supabase.from('perfis').update({ logo_url: null }).eq('user_id', user.id)
  if (error) return { ok: false, erro: 'Não foi possível remover o logo.' }

  revalidatePath('/painel/marca')
  return { ok: true }
}
