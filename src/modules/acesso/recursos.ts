import 'server-only'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import { exigirAcesso } from './guarda'

/**
 * Os recursos extras.
 *
 * ===========================================================================
 * POR QUE UMA SEGUNDA TABELA, E NÃO UMA COLUNA EM liberacoes
 * ===========================================================================
 * `liberacoes` responde uma pergunta só: esta pessoa pagou os R$ 47? É binária
 * e vitalícia, e não muda mais. Recurso é outra coisa — é o que está ligado
 * para quem, hoje, e isso muda toda semana enquanto a IA está em avaliação.
 *
 * Uma coluna por recurso obrigaria uma migration a cada recurso novo. Uma
 * linha por par (email, recurso) não obriga nada: ligar um recurso para uma
 * conta é um INSERT.
 * ===========================================================================
 *
 * RECURSO NÃO SUBSTITUI A COMPRA, SOMA A ELA. `exigirRecurso` cobra as duas
 * coisas: a liberação base e o recurso. É de propósito — sem isso, uma linha
 * solta em recursos_liberados daria acesso a um pedaço do produto para quem
 * nunca pagou, e seria o tipo de furo que ninguém percebe até aparecer.
 */

/**
 * Os recursos que existem hoje.
 *
 * A COLUNA NO BANCO É TEXTO SOLTO, e este union NÃO é uma restrição sobre ela
 * — é conveniência para o TypeScript apontar erro de digitação aqui dentro. Um
 * recurso desconhecido no banco não quebra nada: ninguém pergunta por ele, e
 * a linha fica lá inerte. Foi a escolha certa quando o conjunto ainda vai
 * mudar bastante.
 */
export type Recurso =
  // Do order bump: um produto, quatro recursos.
  | 'ia_textos'
  | 'ia_orcamento'
  | 'contratos'
  | 'recuperacao'
  // Upsells, um produto cada.
  | 'ia_audio'
  | 'ia_medicao'
  | 'calculadora'
  // Previstos, ainda sem produto na Cakto.
  | 'perfil_publico'
  | 'relatorio_mensal'

export class SemRecurso extends Error {
  constructor(public recurso: Recurso) {
    super(`Esta conta não tem o recurso "${recurso}" liberado.`)
    this.name = 'SemRecurso'
  }
}

/**
 * Tudo que a conta tem ligado, numa consulta só.
 *
 * Cliente do servidor com a sessão da pessoa, não o service role: a policy de
 * RLS já limita a leitura às linhas dela (por user_id ou pelo e-mail do JWT),
 * então passar pelo RLS aqui é uma tranca a mais de graça — o mesmo raciocínio
 * de `acessoDoUsuario`.
 *
 * O filtro de status é explícito e não confia no RLS para isso: a policy
 * escolhe QUAIS LINHAS a pessoa enxerga, não quais valem. Revogada continua
 * visível para ela — e tem que continuar, senão o dia em que eu precisar
 * mostrar "seu acesso à IA foi retirado" não haverá o que mostrar.
 */
export async function recursosDoUsuario(): Promise<Set<Recurso>> {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Set()

  const { data } = await supabase.from('recursos_liberados').select('recurso').eq('status', 'ativa')

  return new Set((data ?? []).map((linha) => linha.recurso as Recurso))
}

export async function temRecurso(recurso: Recurso) {
  return (await recursosDoUsuario()).has(recurso)
}

/**
 * A tranca das Server Actions de recurso extra.
 *
 * Mesma postura de `exigirAcesso`: lança, no primeiro comando, antes de tocar
 * em qualquer coisa. Quem chega aqui sem o recurso montou a requisição na mão,
 * porque a interface não oferece o botão.
 *
 * A ORDEM IMPORTA. `exigirAcesso()` vem primeiro para que quem não comprou
 * receba `SemAcesso` — a tela de compra — e não `SemRecurso`, que mandaria a
 * pessoa procurar um botão de ativar recurso que não existe para ela.
 */
export async function exigirRecurso(recurso: Recurso) {
  await exigirAcesso()
  if (!(await temRecurso(recurso))) throw new SemRecurso(recurso)
}
