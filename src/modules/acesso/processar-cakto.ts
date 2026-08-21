import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/tipos-banco'

/**
 * O que fazer com um evento da Cakto.
 *
 * ===========================================================================
 * MAPEIE POR `event`. NUNCA POR `status`.
 * ===========================================================================
 * Não mude isto sem reler o parágrafo inteiro.
 *
 * Parece que `data[0].status` seria a fonte mais confiável — é o estado do
 * pedido, afinal. Não é. Conferido no payload real da Cakto:
 *
 *     evento              data[0].status   refundedAt   chargedbackAt
 *     purchase_approved   "paid"           null         null
 *     refund              "paid"           null         null
 *     chargeback          "paid"           null         null
 *
 * Os três chegam como "paid", com os carimbos de reembolso e chargeback
 * nulos. Só o campo `event`, no topo do payload, diz o que aconteceu.
 *
 * Mapear por status faria um reembolso ser lido como compra aprovada: a
 * pessoa recebe o dinheiro de volta e mantém o acesso vitalício. Isso não
 * gera erro em lugar nenhum — nenhum log, nenhuma exceção, nenhum alerta. Só
 * apareceria meses depois, contando usuário ativo contra venda líquida.
 *
 * É a decisão mais fácil de alguém "corrigir" depois achando que status é
 * mais confiável. É por isso que este comentário é do tamanho que é.
 * ===========================================================================
 *
 * Também conferido no payload real: `data` é um ARRAY (`payload.data[0]`),
 * não um objeto como a documentação descreve.
 */

type Admin = SupabaseClient<Database>

/** Os únicos três que mexem em acesso. */
const TRATADOS = new Set(['purchase_approved', 'refund', 'chargeback'])

export type Resultado = {
  processado: boolean
  /** Fica no log, para eu entender depois o que aconteceu sem reler o payload. */
  nota: string
  pedidoId: string | null
}

type Pedido = { id: string; email: string }

/**
 * Tira do payload só o que a liberação precisa, e diz quando não dá.
 *
 * Devolve null se faltar qualquer um dos dois. Não há valor padrão nem
 * tentativa de adivinhar: ver `processarEventoCakto` para o porquê.
 */
function lerPedido(payload: unknown): Pedido | null {
  if (!payload || typeof payload !== 'object') return null
  const corpo = payload as Record<string, unknown>

  const dados = Array.isArray(corpo.data) ? corpo.data[0] : null
  if (!dados || typeof dados !== 'object') return null
  const pedido = dados as Record<string, unknown>

  const id = typeof pedido.id === 'string' ? pedido.id.trim() : ''

  const cliente = pedido.customer as Record<string, unknown> | undefined
  const email = typeof cliente?.email === 'string' ? cliente.email.trim().toLowerCase() : ''

  if (!id || !email) return null
  return { id, email }
}

export function eventoTratado(tipo: string | null) {
  return tipo !== null && TRATADOS.has(tipo)
}

export async function processarEventoCakto(
  admin: Admin,
  tipo: string,
  payload: Json,
): Promise<Resultado> {
  /*
    Os 12 outros eventos do catálogo — pix_gerado, boleto_gerado,
    subscription_*, checkout_abandonment, purchase_refused e companhia.

    Ficam registrados e respondem 200, SEM processar. Isto é explícito de
    propósito: um `default` que cai no vazio funciona igual, mas não diz a
    ninguém que a decisão foi tomada. Se um dia algum deles precisar mexer em
    acesso, é aqui que se descobre que ele existe.
  */
  if (!eventoTratado(tipo)) {
    return { processado: true, nota: `evento fora do escopo do acesso: ${tipo}`, pedidoId: null }
  }

  const pedido = lerPedido(payload)

  /*
    FALHA ALTA COM DADO INCOMPLETO.

    Sem id do pedido ou sem e-mail do comprador, nada acontece: não libera e
    não revoga. Fica registrado como NÃO processado, e a resposta é 200 para
    a Cakto não retentar em vão — retentar não vai completar um payload que
    chegou torto.

    A assimetria é deliberada. Liberar de menos custa uma liberação manual;
    revogar de menos custa um acesso a mais por algumas horas. Revogar por
    engano tira a ferramenta de trabalho de quem pagou, no meio de um
    orçamento. Entre os três erros, os dois primeiros são baratos.
  */
  if (!pedido) {
    return {
      processado: false,
      nota: 'payload sem data[0].id ou sem customer.email — nada foi liberado nem revogado',
      pedidoId: null,
    }
  }

  // ---- idempotência ------------------------------------------------------
  /*
    A Cakto retenta até 5 vezes e não manda id de entrega em cabeçalho
    (conferido: só user-agent CaktoBot/1.0 e traceparent). Os ids da Vercel
    identificam a invocação, não o evento — numa retentativa viriam
    diferentes e não serviriam para nada.

    A chave é o par (tipo do evento, id do pedido). Reprocessar uma compra não
    pode duplicar liberação; reprocessar um reembolso não pode fazer nada.
  */
  const { data: jaVisto } = await admin
    .from('eventos_cakto')
    .select('id')
    .eq('tipo', tipo)
    .eq('pedido_id', pedido.id)
    .eq('processado', true)
    .limit(1)

  if (jaVisto && jaVisto.length > 0) {
    return { processado: true, nota: 'repetido — já processado antes', pedidoId: pedido.id }
  }

  if (tipo === 'purchase_approved') return liberar(admin, pedido)
  return revogar(admin, pedido, tipo)
}

async function liberar(admin: Admin, pedido: Pedido): Promise<Resultado> {
  /*
    ORDEM DE CHEGADA NÃO É GARANTIDA.

    O caso óbvio — purchase_approved depois de refund — a guarda logo abaixo
    cobre, porque a liberação está lá, revogada. O caso invertido não:

      refund(X) chega primeiro  -> não existe liberação de X, nada a revogar
      purchase_approved(X) depois -> cria acesso para um pedido REEMBOLSADO

    Acontece de verdade: se o purchase_approved falhar na entrega e a Cakto
    retentar em 30 minutos, o refund pode passar na frente. E acontece com a
    tabela zerada, como agora.

    Por isso a pergunta certa não é "existe liberação revogada?", e sim "este
    pedido já foi reembolsado ou contestado alguma vez?". A resposta está no
    log de eventos, que guarda tudo o que chegou.
  */
  const { data: revogacoes } = await admin
    .from('eventos_cakto')
    .select('tipo')
    .eq('pedido_id', pedido.id)
    .in('tipo', ['refund', 'chargeback'])
    .limit(1)

  if (revogacoes && revogacoes.length > 0) {
    return {
      processado: false,
      nota: `compra aprovada para pedido que já tem ${revogacoes[0].tipo} registrado (${pedido.id}) — NÃO liberado, revisar à mão`,
      pedidoId: pedido.id,
    }
  }

  const { data: existente } = await admin
    .from('liberacoes')
    .select('id, status, pedido_id')
    .eq('email', pedido.email)
    .maybeSingle()

  /*
    REVOGAÇÃO NÃO SE DESFAZ PELO WEBHOOK.

    Se chegar um purchase_approved para um pedido que já foi reembolsado ou
    sofreu chargeback, registra e não reativa. Pode ser reenvio fora de ordem,
    pode ser tentativa de burlar — de qualquer forma é caso de olhar na mão,
    não de o sistema decidir sozinho a favor de quem pediu o dinheiro de volta.

    Compra NOVA, com pedido_id diferente, reativa normalmente: quem foi
    reembolsado e depois comprou de novo tem direito ao acesso.
  */
  if (existente?.status === 'revogada' && existente.pedido_id === pedido.id) {
    return {
      processado: false,
      nota: `compra aprovada para pedido já revogado (${pedido.id}) — NÃO reativado, revisar à mão`,
      pedidoId: pedido.id,
    }
  }

  // A conta pode já existir: quem paga depois de se cadastrar deve entrar
  // liberado sem precisar sair e voltar.
  const userId = await acharUsuarioPorEmail(admin, pedido.email)

  const { error } = await admin.from('liberacoes').upsert(
    {
      email: pedido.email,
      user_id: userId,
      status: 'ativa',
      pedido_id: pedido.id,
      liberada_em: new Date().toISOString(),
      revogada_em: null,
      motivo_revogacao: null,
    },
    { onConflict: 'email' },
  )

  if (error) throw new Error(`não consegui liberar ${pedido.email}: ${error.message}`)

  return {
    processado: true,
    nota: userId ? 'liberado e vinculado à conta existente' : 'liberado, aguardando o cadastro',
    pedidoId: pedido.id,
  }
}

async function revogar(admin: Admin, pedido: Pedido, tipo: string): Promise<Resultado> {
  /*
    ===========================================================================
    A RESERVA POR E-MAIL SÓ VALE PARA LIBERAÇÃO MANUAL.
    ===========================================================================
    Não afrouxe isto para "casa por e-mail sempre". Parece mais seguro —
    revogar em dúvida — e é o contrário.

    O cenário concreto, e ele é comum: a pessoa paga por Pix e a cobrança
    duplica. Ela pede reembolso da duplicada, que é exatamente a coisa certa a
    fazer. O refund chega com o pedido_id da DUPLICADA, que não casa com a
    liberação (criada pelo pedido original). Com reserva ampla, cai no e-mail
    e revoga o acesso que ela pagou e não pediu de volta.

    Quem age direito perde a ferramenta de trabalho no meio de um orçamento.

    A reserva existe para cobrir liberação criada à mão — as do fundador, com
    pedido_id 'manual-fundador' — que nunca teriam pedido para casar. Por isso
    ela só vale quando a liberação NÃO veio de compra.

    Reembolso de pedido desconhecido contra liberação originada de compra:
    registra, não revoga, e fica com nota para revisão.
    ===========================================================================
  */
  const { data: porPedido } = await admin
    .from('liberacoes')
    .select('id')
    .eq('pedido_id', pedido.id)
    .maybeSingle()

  let alvo = porPedido
  let casouPor = 'pedido'

  if (!alvo) {
    const { data: porEmail } = await admin
      .from('liberacoes')
      .select('id, pedido_id')
      .eq('email', pedido.email)
      .maybeSingle()

    if (porEmail && !porEmail.pedido_id) {
      alvo = { id: porEmail.id }
      casouPor = 'e-mail (liberação manual, sem pedido)'
    } else if (porEmail) {
      return {
        processado: false,
        nota: `${tipo} do pedido ${pedido.id} não casa com a liberação de ${pedido.email}, que veio da compra ${porEmail.pedido_id} — NÃO revogado, revisar à mão`,
        pedidoId: pedido.id,
      }
    }
  }

  if (!alvo) {
    /*
      ===========================================================================
      REVOGAÇÃO SEM ALVO NÃO É CASO RESOLVIDO. É CASO PARA OLHAR.
      ===========================================================================
      Terceira decisão desta fase que parece candidata a "simplificar" depois.
      Não simplifique: `processado: true` aqui faria isto sumir da revisão.

      Um reembolso ou contestação de pedido que o sistema NUNCA VIU significa
      uma de três coisas, e nenhuma é boa:

        - cobrança que aconteceu fora do fluxo previsto;
        - fraude;
        - um purchase_approved que se perdeu — entrega falhada, payload
          incompleto, janela em que o webhook estava fora.

      É verdade que existe um caso legítimo: entrega fora de ordem, com a
      contestação chegando antes da compra. Foi o que aconteceu no disparo de
      teste. Mas a assimetria manda de novo — revisar um caso legítimo custa
      um olhar; não ver uma contestação real custa dinheiro e não avisa
      ninguém.

      Fica registrado, não processado, e aparece na revisão.
      ===========================================================================
    */
    return {
      processado: false,
      nota: `${tipo} sem liberação correspondente (pedido ${pedido.id}) — nada a revogar, mas contestação de pedido desconhecido merece revisão`,
      pedidoId: pedido.id,
    }
  }

  const { error } = await admin
    .from('liberacoes')
    .update({
      status: 'revogada',
      revogada_em: new Date().toISOString(),
      motivo_revogacao: tipo,
    })
    .eq('id', alvo.id)

  if (error) throw new Error(`não consegui revogar ${pedido.email}: ${error.message}`)

  return {
    processado: true,
    nota: `revogado por ${tipo} (casou por ${casouPor})`,
    pedidoId: pedido.id,
  }
}

/** Procura a conta pelo e-mail. Nulo quando ela ainda não existe. */
async function acharUsuarioPorEmail(admin: Admin, email: string): Promise<string | null> {
  // listUsers pagina; a base é pequena e isto roda no webhook, fora do
  // caminho do usuário. Se um dia crescer, vira consulta direta em auth.users.
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const conta = data?.users.find((u) => u.email?.trim().toLowerCase() === email)
  return conta?.id ?? null
}
