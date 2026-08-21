'use server'

import { vincularLiberacao } from '@/modules/acesso/consultas'

import { redirect } from 'next/navigation'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import { esquemaCadastro, esquemaLogin } from './esquemas'
import type { EstadoFormulario } from './estado'

/** O Supabase responde em inglês. Aqui vira português de gente. */
function traduzirErro(mensagem: string) {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Já existe uma conta com este e-mail. Tente entrar.'
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 8 caracteres.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
  if (m.includes('signups not allowed')) return 'Os cadastros estão desativados no momento.'
  return 'Não foi possível concluir. Tente novamente em instantes.'
}

/** Evita open redirect: só aceita caminho interno. */
function destinoSeguro(proximo: unknown) {
  return typeof proximo === 'string' && proximo.startsWith('/') && !proximo.startsWith('//')
    ? proximo
    : '/painel'
}

export async function cadastrar(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaCadastro.safeParse({
    nomeEmpresa: dados.get('nomeEmpresa'),
    email: dados.get('email'),
    senha: dados.get('senha'),
  })

  if (!resultado.success) {
    return { errosPorCampo: resultado.error.flatten().fieldErrors }
  }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.auth.signUp({
    email: resultado.data.email,
    password: resultado.data.senha,
    options: {
      // Vai para raw_user_meta_data e o trigger em auth.users usa isso para
      // já criar o perfil com o nome preenchido.
      data: { nome_empresa: resultado.data.nomeEmpresa },
    },
  })

  if (error) return { erro: traduzirErro(error.message) }

  // Com a confirmação de e-mail desligada, o signUp já devolve sessão.
  // Se algum dia ela for religada no painel do Supabase, cai neste aviso.
  if (!data.session) {
    return {
      aviso: 'Enviamos um link de confirmação para o seu e-mail. Abra para ativar a conta.',
    }
  }

  /*
    A compra quase sempre chega ANTES da conta existir: a pessoa paga na Cakto
    e só então vem criar o login. Nesse intervalo a liberação está no banco com
    user_id nulo, esperando o dono — e é aqui que ela o encontra.

    Sem isto, quem pagou criaria a conta e cairia na tela de bloqueio, mesmo
    tendo pago minutos antes. Seria o pior primeiro minuto possível.
  */
  await vincularLiberacao(data.session.user.id, resultado.data.email)

  // Onboarding: quem acabou de criar a conta vai direto montar a marca. É a
  // tela que faz o orçamento parecer de empresa, e o melhor momento de pedir
  // esses dados é agora, não quando ele estiver com pressa no meio de uma obra.
  redirect(dados.get('proximo') ? destinoSeguro(dados.get('proximo')) : '/painel/marca')
}

export async function entrar(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaLogin.safeParse({
    email: dados.get('email'),
    senha: dados.get('senha'),
  })

  if (!resultado.success) {
    return { errosPorCampo: resultado.error.flatten().fieldErrors }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  })

  if (error) return { erro: traduzirErro(error.message) }

  redirect(destinoSeguro(dados.get('proximo')))
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/entrar')
}
