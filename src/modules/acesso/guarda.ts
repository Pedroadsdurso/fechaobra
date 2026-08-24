import 'server-only'

import { redirect } from 'next/navigation'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import { temAcesso } from './consultas'

/**
 * A tranca das Server Actions.
 *
 * Chame no PRIMEIRO comando de toda ação que cria, altera ou envia. Não no
 * meio, não depois de validar formulário: antes de tocar em qualquer coisa.
 *
 * ===========================================================================
 * MANDA PARA A TELA DE COMPRA. NÃO LANÇA.
 * ===========================================================================
 * Isto já foi `throw new SemAcesso()`. A exceção não era capturada em lugar
 * nenhum — de propósito, para parar seco — e subia até a fronteira da Server
 * Action, onde virava HTTP 500.
 *
 * Mesmo argumento que tirou o 500 de `comRecurso`, e aqui ele pesa mais: 500 é
 * "o servidor quebrou", a linha que acorda alguém. Uma conta sem compra
 * tocando num botão não é defeito nosso. Enquanto os dois estavam misturados,
 * o painel de erros contava ruído — e é assim que o 500 de verdade passa
 * batido no meio dele.
 *
 * A DIFERENÇA PARA `comRecurso`, E É POR ISSO QUE NÃO SÃO A MESMA COISA:
 *
 *   - falta um MÓDULO: a pessoa está dentro do produto, no meio de um
 *     orçamento, e continua tendo o que fazer ali. Tirá-la da tela seria
 *     perder o trabalho dela. A ação devolve `sem_recurso` e a folha oferta o
 *     bump sem sair do lugar.
 *
 *   - falta a COMPRA: não há produto nenhum para ela usar. Não existe versão
 *     reduzida da tela que faça sentido — o editor inteiro é o que ela não
 *     comprou. O certo é o que a navegação normal já faria: levá-la a
 *     `/acesso`.
 *
 * `redirect()` continua interrompendo a execução — ele lança `NEXT_REDIRECT`,
 * que o Next intercepta na fronteira. Então a garantia de "para seco antes de
 * tocar em qualquer coisa" é a mesma de antes. NÃO envolva chamadas a
 * `exigirAcesso()` em try/catch: engolir o NEXT_REDIRECT transformaria a
 * guarda em nada, silenciosamente. Conferido — hoje nenhum chamador faz isso.
 * ===========================================================================
 */
/**
 * Quem foi recusado, para o log.
 *
 * Só roda no caminho da recusa: numa sessão liberada isto não é chamado, e
 * `exigirAcesso` continua custando a mesma consulta de sempre.
 *
 * O try/catch cobre a LEITURA DO E-MAIL e nada mais. Não pode envolver o
 * `redirect()` — engolir o NEXT_REDIRECT transformaria a guarda em nada. Log
 * que falha vira "(não consegui ler a sessão)"; guarda não falha nunca.
 */
async function quemFoi() {
  try {
    const supabase = await criarClienteServidor()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.email ?? '(sem sessão)'
  } catch {
    return '(não consegui ler a sessão)'
  }
}

/**
 * @param acao Nome da Server Action que chamou, para o log.
 *
 * É passado à mão, e não deduzido da pilha de chamadas, porque o servidor de
 * produção é minificado: `new Error().stack` traz nomes mangled quando traz
 * algum. Um log que às vezes diz `t` e às vezes diz `criarRascunho` é pior que
 * log nenhum — ele parece confiável até a hora em que alguém precisa dele.
 *
 * Sendo parâmetro obrigatório, ação nova não compila sem informar quem é.
 */
export async function exigirAcesso(acao: string) {
  if (await temAcesso()) return

  /*
    `warn`, não `error`: recusar quem não comprou é o produto funcionando, e
    foi para tirar isto do balde de erro que o 500 saiu daqui. Mas também não é
    `log` — volume aqui significa gente batendo numa porta fechada, e isso ou é
    liberação que não chegou (alguém pagou e não recebeu) ou é sondagem. Nos
    dois casos eu quero ver.
  */
  console.warn(`[acesso] ${await quemFoi()} chamou ${acao} sem compra ativa — mandado para /acesso`)

  redirect('/acesso')
}
