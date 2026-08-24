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
  /*
    Dos três produtos que são order bump no checkout do FechaObra e também
    oferta avulsa com página própria. Quem não marcou a caixinha na compra
    pode comprar depois pelo cadeado, dentro do editor.
  */
  | 'ia_textos'
  | 'ia_orcamento'
  | 'contratos'
  | 'recuperacao'
  /*
    Dos três upsells, um produto cada.

    Os nomes descrevem O QUE A PESSOA RECEBE, não a tecnologia por trás. Foram
    'ia_audio', 'ia_medicao' e 'calculadora' até a 0011, e mudaram porque
    "é IA" não é o que ela compra — ela compra falar o orçamento em vez de
    digitar. E 'calculadora' sozinho não dizia calculadora de quê.

    A renomeação foi segura porque nenhum dos três tinha sido concedido a
    ninguém ainda; ver o bloco no fim de 0011_bumps_e_upsells.sql.
  */
  | 'audio_orcamento'
  | 'medicao_foto'
  | 'calculadora_material'
  // Previstos, ainda sem produto na Cakto.
  | 'perfil_publico'
  | 'relatorio_mensal'

/**
 * A resposta de "esta conta não tem o módulo".
 *
 * ===========================================================================
 * RECUSA NÃO É ERRO DE SERVIDOR
 * ===========================================================================
 * Isto já foi uma exceção (`class SemRecurso extends Error`) que subia até a
 * fronteira da Server Action e virava HTTP 500. Funcionava como tranca, e era
 * errado em duas frentes:
 *
 * 1. NO LOG. 500 é "o servidor quebrou" — a linha que acorda alguém. Uma conta
 *    sem o bump de IA tocando num botão não é defeito nosso; é o produto
 *    funcionando. Misturar as duas coisas faz o painel de erros encher de
 *    ruído até ninguém mais olhar, e é aí que o 500 de verdade passa batido.
 *
 * 2. NA TELA. Exceção chega ao cliente como falha genérica, sem dizer o que
 *    houve. O front mostrava "Não consegui gerar agora", que soa como
 *    instabilidade — a pessoa tenta de novo, dá o mesmo, e ela conclui que o
 *    app está quebrado. A resposta certa é a oferta: falta o módulo, olha aqui
 *    onde compra.
 *
 * O que NÃO mudou: a decisão continua no servidor e continua fechada por
 * padrão. Isto é uma recusa explícita, não um afrouxamento.
 * ===========================================================================
 */
export type RespostaSemRecurso = {
  ok: false
  erro: 'sem_recurso'
  recurso: Recurso
  /**
   * Existe para o front que ainda só sabe mostrar `mensagem` não ficar com
   * `undefined` na tela. Quem trata `erro === 'sem_recurso'` mostra a oferta e
   * ignora este campo.
   */
  mensagem: string
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
 * A tranca das Server Actions de módulo extra.
 *
 * ===========================================================================
 * ENVOLVE O CORPO EM VEZ DE SÓ CHECAR ANTES DELE
 * ===========================================================================
 * A forma natural depois de parar de lançar seria:
 *
 *     const bloqueio = await checarRecurso('ia_textos')
 *     if (bloqueio) return bloqueio
 *     ...corpo...
 *
 * E ela tem um buraco que a versão que lançava não tinha: dá para escrever a
 * primeira linha e esquecer a segunda. O corpo roda, a IA responde, e nada
 * acusa — o teste de quem tem o módulo passa, porque para ele o resultado é
 * idêntico. Só falha para quem não pagou, que é justamente quem não vai abrir
 * um chamado dizendo "recebi de graça".
 *
 * Envolvendo, não há como o corpo rodar sem a checagem: ele É o argumento.
 * Esquecer o `comRecurso` não compila contra o tipo de retorno da ação, que
 * inclui `RespostaSemRecurso`.
 *
 * A ORDEM IMPORTA, e as duas guardas terminam diferente de propósito:
 * `exigirAcesso()` vem primeiro e REDIRECIONA para /acesso, porque quem não
 * comprou o FechaObra não tem tela nenhuma para ficar. Quem comprou e só não
 * tem o módulo recebe a recusa aqui e continua no orçamento dela. Ver o bloco
 * em guarda.ts.
 * ===========================================================================
 */
export async function comRecurso<T>(
  recurso: Recurso,
  corpo: () => Promise<T>,
): Promise<T | RespostaSemRecurso> {
  // O recurso identifica a ação: ia_textos é gerarTextosDoOrcamento,
  // ia_orcamento é extrairItensDoTexto.
  await exigirAcesso(`IA (${recurso})`)

  /*
    `temRecurso` é fechado por padrão em todos os caminhos: sem sessão, erro de
    consulta e lista vazia produzem todos um Set vazio, e `.has()` num Set
    vazio é false. Não há default liberado para nenhum recurso, conhecido ou
    não — nunca inverta esta condição para "se não sei, deixa passar".
  */
  if (!(await temRecurso(recurso))) {
    return {
      ok: false,
      erro: 'sem_recurso',
      recurso,
      mensagem: 'Esta conta não tem este recurso liberado.',
    }
  }

  return corpo()
}
