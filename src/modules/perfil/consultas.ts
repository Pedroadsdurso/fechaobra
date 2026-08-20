import 'server-only'

import {
  BUCKET_LOGOS,
  criarClienteAdministrador,
  SEGUNDOS_URL_ASSINADA,
} from '@/lib/supabase/administrador'
import { criarClienteServidor } from '@/lib/supabase/servidor'

import { COR_PADRAO } from './cores'

export type MarcaCarregada = {
  nomeEmpresa: string
  responsavel: string
  telefone: string
  email: string
  /** E-mail de acesso à conta. Oferecido como sugestão, nunca aplicado sozinho. */
  emailAcesso: string
  cnpjCpf: string
  endereco: string
  corPrimaria: string
  /** Caminho no bucket. Vazio quando não há logo. */
  logoCaminho: string
  /** URL assinada para exibir. Vazia quando não há logo. */
  logoUrl: string
  /** true quando o usuário ainda não salvou a marca — vira modo onboarding. */
  primeiraVez: boolean
}

/**
 * Carrega a marca do usuário logado, já com URL assinada do logo.
 *
 * O bucket é privado: o caminho gravado em perfis.logo_url não abre no
 * navegador sozinho. A assinatura é feita aqui, no servidor, e expira.
 */
export async function carregarMarca(): Promise<MarcaCarregada | null> {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome_empresa, responsavel, telefone, email, cnpj_cpf, endereco, cor_primaria, logo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const logoCaminho = perfil?.logo_url ?? ''
  let logoUrl = ''

  if (logoCaminho) {
    const admin = criarClienteAdministrador()
    const { data } = await admin.storage
      .from(BUCKET_LOGOS)
      .createSignedUrl(logoCaminho, SEGUNDOS_URL_ASSINADA)
    logoUrl = data?.signedUrl ?? ''
  }

  const nomeEmpresa = perfil?.nome_empresa?.trim() ?? ''

  // O e-mail da empresa não é o e-mail de acesso.
  //
  // O trigger em auth.users copia o e-mail de login para perfis.email na
  // criação da conta, então todo usuário novo chega aqui com o endereço de
  // acesso já no campo. Só que a pessoa pode entrar com o gmail pessoal e
  // querer contato@empresa.com.br impresso no orçamento — e um e-mail
  // estranho no documento é exatamente o que faz o cliente desconfiar.
  //
  // Enquanto a marca nunca foi salva, esse valor herdado é tratado como
  // ausente. O formulário oferece o e-mail de acesso como sugestão, para a
  // pessoa aceitar se quiser. Depois do primeiro salvamento, o que estiver
  // gravado é escolha dela e vale.
  const emailHerdadoDoLogin = !!perfil?.email && perfil.email === user.email
  const primeiraVez = !perfil?.responsavel && !perfil?.cnpj_cpf && !perfil?.telefone
  const email = emailHerdadoDoLogin && primeiraVez ? '' : (perfil?.email ?? '')

  return {
    nomeEmpresa,
    responsavel: perfil?.responsavel ?? '',
    telefone: perfil?.telefone ?? '',
    email,
    emailAcesso: user.email ?? '',
    cnpjCpf: perfil?.cnpj_cpf ?? '',
    endereco: perfil?.endereco ?? '',
    corPrimaria: perfil?.cor_primaria || COR_PADRAO,
    logoCaminho,
    logoUrl,
    // Sem responsável, documento nem telefone, ninguém passou por aqui ainda. O
    // nome da empresa sozinho não serve de sinal: vem preenchido do cadastro.
    primeiraVez,
  }
}
