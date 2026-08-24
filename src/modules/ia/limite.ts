import 'server-only'

import { criarClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * A cota da IA.
 *
 * ===========================================================================
 * POR QUE NÃO DÁ PARA USAR O lib/limite-taxa.ts QUE JÁ EXISTE
 * ===========================================================================
 * Aquele guarda a rota pública contra rajada e conta EM MEMÓRIA — o próprio
 * arquivo diz que o limite real é por instância serverless e que reinício zera
 * a contagem. Para conter varredura boba num token uuid, serve.
 *
 * Aqui não serve, e a razão é de outra natureza: o que está sendo protegido
 * NÃO É NOSSO. É um teto diário compartilhado com o Google, do projeto
 * inteiro. Contagem por instância significa que quatro instâncias contam até o
 * limite cada uma e estouram o teto de verdade em quatro vezes — e o sintoma
 * chega como 429 opaco da API, não como erro nosso.
 *
 * Então a contagem sai de `uso_ia`, no Postgres, que é o único lugar onde
 * todas as instâncias veem o mesmo número. O índice (user_id, criado_em desc)
 * foi criado para exatamente estas consultas.
 * ===========================================================================
 *
 * O service role é obrigatório aqui: `uso_ia` tem RLS ligado e ZERO policies,
 * de propósito. Contabilidade de cota é assunto do servidor — o usuário não lê
 * a tabela, e o total do projeto inclui linhas de outras contas.
 */

/* ===========================================================================
   OS NÚMEROS, DIMENSIONADOS SOBRE O LIMITE REAL DA CONTA
   ===========================================================================
   Camada gratuita, medida no AI Studio (projeto "Default Gemini Project"),
   linha Flash Lite: RPD 500 · RPM 15 · TPM 250K.

   Estes tetos são NOSSOS e ficam abaixo dos do Google de propósito. Quero
   bater no meu limite antes de bater no dele, porque o meu tem mensagem em
   português e sabe dizer quantas sobraram; o dele é um 429 sem contexto no
   meio de uma tela de orçamento.
   =========================================================================== */

/** 500 do Google menos 100 de reserva. A reserva é o que garante que a falha
 *  seja minha e não dele — inclusive se eu contar errado. */
export const TETO_PROJETO_DIA = 400

/** Com o recurso ligado só nas minhas duas contas, o pior caso são 100 de 400
 *  — folga de sobra para um dia inteiro de teste sem chegar perto do teto. */
export const TETO_USUARIO_DIA = 50

/** Contra clique repetido. 15 RPM no projeto dá uma chamada a cada 4s se tudo
 *  fosse serializado; 6s por usuário fica abaixo disso e é invisível no uso
 *  real, porque ninguém relê um texto gerado em menos de seis segundos. */
export const INTERVALO_MINIMO_MS = 6_000

/**
 * O começo do dia de cota do Google, em Pacific Time.
 *
 * ===========================================================================
 * O DIA DA COTA NÃO É O DIA DO BRASIL
 * ===========================================================================
 * O RPD zera à meia-noite no fuso do Pacífico, não no nosso. Em horário de
 * verão americano isso cai às 4h de Brasília; fora dele, às 5h.
 *
 * Contar "hoje" em America/Sao_Paulo daria um número que não é o que o Google
 * está contando — e o erro aparece justamente na pior hora: testando de
 * madrugada, entre 0h e 4h, o meu contador zeraria e o dele não, e eu levaria
 * 429 achando que tinha 50 sobrando.
 * ===========================================================================
 *
 * Derivado do relógio de parede em Los Angeles, e não de um deslocamento fixo,
 * para atravessar a virada do horário de verão sem ajuste.
 */
export function inicioDoDiaDeCota(agora = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(agora)

  const ler = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0)
  // hour12:false devolve "24" para meia-noite em algumas versões do ICU.
  const desdeMeiaNoite =
    (ler('hour') % 24) * 3_600_000 + ler('minute') * 60_000 + ler('second') * 1000

  return new Date(agora.getTime() - desdeMeiaNoite)
}

export type Saldo = {
  /** Chamadas que esta conta já fez no dia de cota corrente. */
  usuario: number
  /** Chamadas do projeto inteiro no mesmo dia. */
  projeto: number
  restantesUsuario: number
  restantesProjeto: number
  /** O menor dos dois — é o que a pessoa realmente ainda pode usar. */
  restantes: number
  /** Quando o contador zera, para a tela poder dizer "volta às 4h". */
  zeraEm: Date
}

/**
 * Quantas sobraram.
 *
 * Conta CHAMADAS, com e sem sucesso, e isso é o ponto: o Google debita a cota
 * quando recebe a requisição, não quando ela dá certo. Contar só os sucessos
 * deixaria uma sequência de timeouts consumir o dia inteiro sem aparecer em
 * lugar nenhum — o modo de falha mais silencioso possível.
 */
export async function saldoDoDia(userId: string): Promise<Saldo> {
  const admin = criarClienteAdministrador()
  const inicio = inicioDoDiaDeCota()
  const desde = inicio.toISOString()

  const [doUsuario, doProjeto] = await Promise.all([
    admin
      .from('uso_ia')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('criado_em', desde),
    admin.from('uso_ia').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
  ])

  const usuario = doUsuario.count ?? 0
  const projeto = doProjeto.count ?? 0
  const restantesUsuario = Math.max(0, TETO_USUARIO_DIA - usuario)
  const restantesProjeto = Math.max(0, TETO_PROJETO_DIA - projeto)

  return {
    usuario,
    projeto,
    restantesUsuario,
    restantesProjeto,
    restantes: Math.min(restantesUsuario, restantesProjeto),
    zeraEm: new Date(inicio.getTime() + 24 * 3_600_000),
  }
}

export type Veredito =
  | { pode: true; saldo: Saldo }
  | {
      pode: false
      motivo: 'muito_rapido' | 'cota_usuario' | 'cota_projeto'
      mensagem: string
      /** Só em 'muito_rapido': quanto falta para poder de novo. */
      espereMs?: number
      saldo: Saldo
    }

/**
 * Pode chamar?
 *
 * Três perguntas, na ordem em que a resposta é mais útil para quem está na
 * tela: acabei de chamar (espere um instante), gastei o meu dia (volta
 * amanhã), ou o projeto inteiro secou (não é você, sou eu).
 *
 * ===========================================================================
 * ISTO NÃO É ATÔMICO, E A ESCOLHA É CONSCIENTE
 * ===========================================================================
 * Entre ler a contagem e gravar a linha nova existe uma janela de alguns
 * milissegundos em que duas requisições simultâneas passam as duas. Fechar
 * essa janela pede lock consultivo no Postgres.
 *
 * Não fechei porque o custo de perder a corrida é UMA chamada de 500, e o
 * caso que motivou a proteção — clique repetido — não é simultâneo de
 * verdade: são dois cliques separados por dezenas ou centenas de
 * milissegundos, e a janela é bem menor que isso. Se um dia a corrida
 * aparecer nos números, um `pg_advisory_xact_lock(hashtext(user_id))` resolve
 * em uma linha.
 * ===========================================================================
 */
export async function verificarLimite(userId: string): Promise<Veredito> {
  const admin = criarClienteAdministrador()
  const saldo = await saldoDoDia(userId)

  const { data: ultima } = await admin
    .from('uso_ia')
    .select('criado_em')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultima) {
    const desdeAUltima = Date.now() - new Date(ultima.criado_em).getTime()
    if (desdeAUltima < INTERVALO_MINIMO_MS) {
      return {
        pode: false,
        motivo: 'muito_rapido',
        mensagem: 'Aguarde alguns segundos antes de gerar de novo.',
        espereMs: INTERVALO_MINIMO_MS - desdeAUltima,
        saldo,
      }
    }
  }

  if (saldo.restantesUsuario <= 0) {
    return {
      pode: false,
      motivo: 'cota_usuario',
      mensagem: 'Você usou as sugestões de hoje. O contador volta de madrugada.',
      saldo,
    }
  }

  if (saldo.restantesProjeto <= 0) {
    return {
      pode: false,
      motivo: 'cota_projeto',
      mensagem: 'As sugestões estão indisponíveis no momento. Tente mais tarde.',
      saldo,
    }
  }

  return { pode: true, saldo }
}

/**
 * Abre o registro ANTES da chamada, e devolve o id para fechar depois.
 *
 * ===========================================================================
 * A LINHA NASCE COMO FRACASSO E VIRA SUCESSO SE VOLTAR
 * ===========================================================================
 * Gravar só depois da resposta parece mais limpo e está errado por dois
 * motivos.
 *
 * O primeiro é a cota: se o processo morrer no meio da chamada — timeout da
 * função, deploy no meio, rede caindo — o Google já debitou e eu não tenho
 * registro. Meu contador fica atrás do dele, e a diferença só cresce.
 *
 * O segundo é o clique repetido: o intervalo mínimo lê a última linha. Se a
 * linha só existisse depois da resposta, o segundo clique não veria nada e
 * passaria direto — a proteção não protegeria exatamente no caso para o qual
 * foi feita, porque a chamada demora mais que os dois cliques.
 * ===========================================================================
 */
export async function abrirUso(userId: string, recurso: string, modelo: string) {
  const admin = criarClienteAdministrador()
  const { data } = await admin
    .from('uso_ia')
    .insert({ user_id: userId, recurso, modelo, sucesso: false })
    .select('id')
    .single()

  return data?.id ?? null
}

export type FechamentoDeUso = {
  sucesso: boolean
  motivoFalha?: 'cota' | 'timeout' | 'resposta_invalida' | 'erro_rede' | 'sem_chave'
  tokensEntrada?: number
  tokensSaida?: number
  duracaoMs?: number
}

/**
 * Fecha o registro com o que aconteceu.
 *
 * Não lança: contabilidade quebrada não pode derrubar uma resposta que deu
 * certo. O pior caso é uma linha que ficou marcada como falha tendo dado
 * certo — conservador na direção certa, porque erra para MENOS cota, nunca
 * para mais.
 */
export async function fecharUso(id: string | null, fechamento: FechamentoDeUso) {
  if (!id) return

  try {
    const admin = criarClienteAdministrador()
    await admin
      .from('uso_ia')
      .update({
        sucesso: fechamento.sucesso,
        motivo_falha: fechamento.motivoFalha ?? null,
        tokens_entrada: fechamento.tokensEntrada ?? null,
        tokens_saida: fechamento.tokensSaida ?? null,
        duracao_ms: fechamento.duracaoMs ?? null,
      })
      .eq('id', id)
  } catch (e) {
    console.error('não consegui fechar o registro de uso', id, e)
  }
}
