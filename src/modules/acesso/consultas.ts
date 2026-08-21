import 'server-only'

import { criarClienteAdministrador } from '@/lib/supabase/administrador'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * O acesso.
 *
 * Pagamento único, vitalício: ou existe uma liberação ativa para o e-mail da
 * conta, ou não existe. Não há prazo, plano nem renovação para checar.
 *
 * ===========================================================================
 * ONDE ISTO É CHAMADO — E ONDE NÃO É
 * ===========================================================================
 * A checagem mora nas Server Actions e na leitura de dados. NÃO mora no
 * proxy.ts: o proxy é roteamento, não fronteira de segurança. Ele decide para
 * onde a navegação vai, e uma Server Action chamada direto não passa por ele.
 * Confiar no proxy como gate deixaria o endpoint aberto para quem soubesse
 * montar a requisição.
 *
 * A página do painel também chama, mas para MOSTRAR a tela certa — isso é
 * conveniência de interface. A tranca é a da Server Action.
 *
 * NÃO É CHAMADO em /p/[token] nem em /api/p/[token]/pdf. Orçamento já enviado
 * continua abrindo mesmo que o prestador seja reembolsado depois: o cliente
 * final não pode ser punido por uma disputa entre nós e o prestador. Ele
 * recebeu um link, e o link tem que funcionar.
 * ===========================================================================
 */

export type Acesso =
  | { liberado: true }
  | { liberado: false; motivo: 'sem-compra' | 'revogada' }

/**
 * Lê a liberação do usuário logado.
 *
 * Usa o cliente do servidor com a sessão da pessoa, não o service role: a
 * policy de RLS já garante que ela só enxerga a própria linha, e passar pelo
 * RLS aqui é uma tranca a mais de graça.
 */
export async function acessoDoUsuario(): Promise<Acesso> {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { liberado: false, motivo: 'sem-compra' }

  const { data } = await supabase
    .from('liberacoes')
    .select('status')
    .limit(1)
    .maybeSingle()

  if (!data) return { liberado: false, motivo: 'sem-compra' }
  if (data.status === 'revogada') return { liberado: false, motivo: 'revogada' }
  return { liberado: true }
}

export async function temAcesso() {
  return (await acessoDoUsuario()).liberado
}

/**
 * Liga a liberação à conta recém-criada.
 *
 * Roda depois do cadastro. A compra normalmente chega ANTES da conta existir:
 * a pessoa paga na Cakto e só então vem criar o login. Nesse intervalo a
 * liberação existe com user_id nulo, e é aqui que ela encontra o dono.
 *
 * Service role de propósito: a policy de RLS é só de leitura, e escrever
 * daqui com a sessão do usuário seria permitir que ele mexesse na própria
 * liberação — o caminho mais curto para acesso vitalício de graça.
 *
 * Não lança: falhar a vinculação não pode derrubar um cadastro que deu certo.
 * O pior caso é a pessoa ver a tela de bloqueio e eu vincular à mão.
 */
export async function vincularLiberacao(userId: string, email: string) {
  const normalizado = email.trim().toLowerCase()
  if (!normalizado) return

  try {
    const admin = criarClienteAdministrador()
    await admin
      .from('liberacoes')
      .update({ user_id: userId })
      .eq('email', normalizado)
      .is('user_id', null)
  } catch (e) {
    console.error('não consegui vincular a liberação de', normalizado, e)
  }
}
