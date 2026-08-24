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
 * Liga a liberação E os módulos à conta recém-criada.
 *
 * Roda depois do cadastro. A compra normalmente chega ANTES da conta existir:
 * a pessoa paga na Cakto e só então vem criar o login. Nesse intervalo as
 * linhas existem com user_id nulo, e é aqui que elas encontram o dono.
 *
 * ===========================================================================
 * SÃO DUAS TABELAS, E ESQUECER A SEGUNDA CUSTA CARO
 * ===========================================================================
 * `liberacoes` era a única quando esta função nasceu. Desde os order bumps,
 * quem compra no checkout com os três marcados gera CINCO linhas pendentes: a
 * do vitalício e as de `recursos_liberados` (recuperacao, ia_textos,
 * ia_orcamento, contratos).
 *
 * Vincular só a primeira produziria o pior sintoma possível para quem acabou
 * de gastar R$ 108: entra no app, o núcleo funciona, e os módulos que ela
 * pagou aparecem com cadeado. Nada de erro, nada de log — a pessoa concluiria
 * que foi enganada.
 *
 * E não é que os módulos ficariam invisíveis para sempre: a policy de RLS de
 * `recursos_liberados` também casa pelo e-mail do JWT, então a leitura
 * funcionaria mesmo sem vínculo. O que quebraria é a REVOGAÇÃO por conta e
 * qualquer consulta administrativa por user_id. Vincular as duas mantém as
 * duas tabelas contando a mesma história.
 * ===========================================================================
 *
 * Service role de propósito: a policy de RLS é só de leitura, e escrever daqui
 * com a sessão do usuário seria permitir que ele mexesse na própria liberação
 * — o caminho mais curto para acesso vitalício de graça.
 *
 * O `.is('user_id', null)` nas duas: linha já vinculada a OUTRA conta não é
 * sobrescrita. Dois cadastros com o mesmo e-mail não deveriam existir, mas se
 * existissem, roubar o vínculo silenciosamente seria a pior saída.
 *
 * Não lança: falhar a vinculação não pode derrubar um cadastro que deu certo.
 * O pior caso é a pessoa ver a tela de bloqueio e eu vincular à mão.
 */
export async function vincularLiberacao(userId: string, email: string) {
  const normalizado = email.trim().toLowerCase()
  if (!normalizado) return

  const admin = criarClienteAdministrador()

  /*
    Independentes de propósito: se a segunda falhar, a primeira continua feita.
    Encadear com `await` uma depois da outra faria uma falha em `liberacoes`
    levar os módulos junto — e o vitalício é o que a pessoa mais precisa que
    funcione.
  */
  for (const tabela of ['liberacoes', 'recursos_liberados'] as const) {
    try {
      await admin
        .from(tabela)
        .update({ user_id: userId })
        .eq('email', normalizado)
        .is('user_id', null)
    } catch (e) {
      console.error(`não consegui vincular ${tabela} de`, normalizado, e)
    }
  }
}
