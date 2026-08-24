import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  descreverItem,
  ehProdutoPrincipal,
  produtoDoPagamento,
} from '@/lib/cakto/produtos'
import { lerEvento, type ItemCakto, type LeituraEvento } from '@/lib/cakto/payload'
import type { Database, Json } from '@/lib/tipos-banco'

/**
 * O que fazer com um evento da Cakto.
 *
 * ===========================================================================
 * MAPEIE POR `event`. NUNCA POR `status`.
 * ===========================================================================
 * Não mude isto sem reler o parágrafo inteiro.
 *
 * Parece que `data[n].status` seria a fonte mais confiável — é o estado do
 * pedido, afinal. Não é. Conferido no payload real da Cakto:
 *
 *     evento              status   refundedAt   chargedbackAt
 *     purchase_approved   "paid"   null         null
 *     refund              "paid"   null         null
 *     chargeback          "paid"   null         null
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
 * ===========================================================================
 * E VARRA `data[]` INTEIRO. `data[0]` NÃO É O PRINCIPAL.
 * ===========================================================================
 * A segunda regra desta casa, e ela custou uma reescrita. Ver o bloco de
 * abertura de lib/cakto/payload.ts: no evento real 8X7Zs1S o item principal é
 * o ÚLTIMO dos quatro, e `data[0]` é um bump de R$ 10,90.
 *
 * O vitalício sai do item cujo `product.id` é o do FechaObra, e de mais lugar
 * nenhum. Nem por posição, nem por `offer_type === 'main'` — os upsells também
 * chegam como 'main', cada um no evento deles.
 * ===========================================================================
 */

type Admin = SupabaseClient<Database>

/** Os únicos três que mexem em acesso. */
const TRATADOS = new Set(['purchase_approved', 'refund', 'chargeback'])

/**
 * O desfecho de UMA linha do log — e há uma linha por item de `data[]`.
 *
 * A correspondência com `linhasDoEvento` é 1:1 e na mesma ordem, de propósito:
 * é o que deixa a rota gravar o desfecho de cada pedido na linha dele em vez
 * de espremer quatro histórias diferentes numa `nota` só.
 */
export type LinhaResultado = {
  /** Nulo só quando o evento não tinha item aproveitável. */
  pedidoId: string | null
  processado: boolean
  /** Fica no log, para eu entender depois o que aconteceu sem reler o payload. */
  nota: string
}

export type Resultado = { linhas: LinhaResultado[] }

export function eventoTratado(tipo: string | null) {
  return tipo !== null && TRATADOS.has(tipo)
}

export async function processarEventoCakto(
  admin: Admin,
  tipo: string,
  payload: Json,
): Promise<Resultado> {
  const leitura = lerEvento(payload)

  /*
    Os 12 outros eventos do catálogo — pix_gerado, boleto_gerado,
    subscription_*, checkout_abandonment, purchase_refused e companhia.

    Ficam registrados e respondem 200, SEM processar. Isto é explícito de
    propósito: um `default` que cai no vazio funciona igual, mas não diz a
    ninguém que a decisão foi tomada. Se um dia algum deles precisar mexer em
    acesso, é aqui que se descobre que ele existe.
  */
  if (!eventoTratado(tipo)) {
    return {
      linhas: paraCadaLinha(leitura, (item) => ({
        pedidoId: item?.pedidoId ?? null,
        processado: true,
        nota: `evento fora do escopo do acesso: ${tipo}`,
      })),
    }
  }

  /*
    FALHA ALTA COM DADO INCOMPLETO.

    Nenhum item com id de pedido E e-mail: nada acontece, não libera e não
    revoga. Fica registrado como NÃO processado, e a resposta é 200 para a
    Cakto não retentar em vão — retentar não vai completar um payload que
    chegou torto.

    A assimetria é deliberada. Liberar de menos custa uma liberação manual;
    revogar de menos custa um acesso a mais por algumas horas. Revogar por
    engano tira a ferramenta de trabalho de quem pagou, no meio de um
    orçamento. Entre os três erros, os dois primeiros são baratos.
  */
  if (leitura.itens.length === 0) {
    return {
      linhas: [
        {
          pedidoId: null,
          processado: false,
          nota: `${tipo} sem nenhum item utilizável em data[] (${leitura.total} recebido(s), todos sem id ou sem customer.email) — nada foi liberado nem revogado`,
        },
      ],
    }
  }

  /*
    Item descartado num evento de acesso é alguém que pagou e pode não receber.
    Vai na nota de TODAS as linhas do evento — não há linha própria para o item
    que não existe, e enterrar isso só na primeira linha seria contar com quem
    lê o log começar pelo começo.
  */
  const alerta =
    leitura.descartados > 0
      ? `ATENÇÃO: ${leitura.descartados} de ${leitura.total} itens deste evento vieram sem id ou sem e-mail e foram ignorados`
      : ''

  const linhas =
    tipo === 'purchase_approved'
      ? await liberarEvento(admin, leitura)
      : await revogarEvento(admin, leitura, tipo)

  if (!alerta) return { linhas }
  return { linhas: linhas.map((l) => ({ ...l, nota: `${alerta} · ${l.nota}` })) }
}

/** Uma saída por linha do log, com a linha solta quando não houve item. */
function paraCadaLinha(
  leitura: LeituraEvento,
  montar: (item: ItemCakto | null) => LinhaResultado,
): LinhaResultado[] {
  if (leitura.itens.length === 0) return [montar(null)]
  return leitura.itens.map(montar)
}


// ===========================================================================
// LIBERAÇÃO
// ===========================================================================

async function liberarEvento(admin: Admin, leitura: LeituraEvento): Promise<LinhaResultado[]> {
  /*
    A conta pode já existir: quem paga depois de se cadastrar deve entrar
    liberado sem precisar sair e voltar. Resolvido UMA vez por e-mail, fora do
    laço: `listUsers` pagina mil contas, e chamá-lo quatro vezes para os quatro
    itens do mesmo comprador seria quatro varreduras idênticas.
  */
  const contas = new Map<string, string | null>()
  const acharConta = async (email: string) => {
    if (!contas.has(email)) contas.set(email, await acharUsuarioPorEmail(admin, email))
    return contas.get(email) ?? null
  }

  const linhas: LinhaResultado[] = []

  for (const item of leitura.itens) {
    if (await jaProcessado(admin, 'purchase_approved', item.pedidoId)) {
      linhas.push({ pedidoId: item.pedidoId, processado: true, nota: 'repetido — já processado antes' })
      continue
    }

    /*
      ORDEM DE CHEGADA NÃO É GARANTIDA.

      O caso óbvio — purchase_approved depois de refund — a guarda de
      `liberarVitalicio` cobre, porque a liberação está lá, revogada. O caso
      invertido não:

        refund(X) chega primeiro  -> não existe liberação de X, nada a revogar
        purchase_approved(X) depois -> cria acesso para um pedido REEMBOLSADO

      Acontece de verdade: se o purchase_approved falhar na entrega e a Cakto
      retentar em 30 minutos, o refund pode passar na frente.

      Por isso a pergunta certa não é "existe liberação revogada?", e sim "este
      PEDIDO já foi reembolsado ou contestado alguma vez?". A resposta está no
      log de eventos, que guarda tudo o que chegou — e agora guarda por item,
      então a pergunta vale por bump, e não pelo checkout inteiro.
    */
    const revogacao = await revogacaoRegistrada(admin, item.pedidoId)
    if (revogacao) {
      linhas.push({
        pedidoId: item.pedidoId,
        processado: false,
        nota: `compra aprovada para pedido que já tem ${revogacao} registrado (${item.pedidoId}, ${descreverItem(item)}) — NÃO liberado, revisar à mão`,
      })
      continue
    }

    const userId = await acharConta(item.email)
    const notas: string[] = []
    let processado = true

    /*
      ===========================================================================
      A ASSERÇÃO: O FECHAOBRA NÃO PODE CHEGAR COMO BUMP
      ===========================================================================
      Todo o desenho assume que o produto principal é vendido como principal.
      Se um dia ele chegar com `offer_type` diferente de 'main', a premissa
      mudou — alguém o marcou como order bump de outro checkout na Cakto — e o
      mapeamento inteiro precisa ser reconferido antes de conceder mais nada.

      O que a asserção faz: grita no log e NÃO concede os módulos daquele item.
      O que ela NÃO faz: bloquear o vitalício. Quem pagou R$ 47 pagou, seja
      qual for a caixinha em que a Cakto tenha colocado o produto — e negar
      acesso a um pagamento confirmado por causa de um campo de metadados é
      exatamente o erro caro que a assimetria manda evitar.

      Hoje o FechaObra não tem módulo nenhum no catálogo, então "não concede
      módulos" não muda nada na prática. É de propósito: a guarda existe para o
      dia em que ele tiver, e nesse dia ela já vai estar no lugar em vez de
      precisar ser lembrada.
      ===========================================================================
    */
    const principalDisfarcado =
      ehProdutoPrincipal(item.produtoId) && item.offerType !== null && item.offerType !== 'main'

    if (principalDisfarcado) {
      console.warn(
        `[cakto] ASSERÇÃO: produto principal ${item.produtoId} chegou com offer_type="${item.offerType}" ` +
          `no pedido ${item.pedidoId}. Módulos NÃO concedidos. Reconferir o mapa em lib/cakto/produtos.ts.`,
      )
      notas.push(
        `ASSERÇÃO VIOLADA: FechaObra com offer_type="${item.offerType}" — módulos deste item NÃO concedidos`,
      )
      processado = false
    }

    if (ehProdutoPrincipal(item.produtoId)) {
      const vitalicio = await liberarVitalicio(admin, item, userId)
      notas.push(vitalicio.nota)
      if (!vitalicio.ok) processado = false
    }

    if (!principalDisfarcado) notas.push(await liberarModulos(admin, item, userId))

    linhas.push({ pedidoId: item.pedidoId, processado, nota: notas.join(' · ') })
  }

  return linhas
}

/**
 * O vitalício de R$ 47 — e só a partir do item do FechaObra.
 *
 * O `pedido_id` gravado aqui é o do ITEM PRINCIPAL, não o de `data[0]`. É essa
 * escolha que faz o reembolso de um bump não alcançar o acesso: a revogação
 * procura `liberacoes` por `pedido_id`, e o pedido do bump nunca vai casar.
 */
async function liberarVitalicio(admin: Admin, item: ItemCakto, userId: string | null) {
  const { data: existente } = await admin
    .from('liberacoes')
    .select('id, status, pedido_id')
    .eq('email', item.email)
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
  if (existente?.status === 'revogada' && existente.pedido_id === item.pedidoId) {
    return {
      ok: false,
      nota: `compra aprovada para pedido já revogado (${item.pedidoId}) — NÃO reativado, revisar à mão`,
    }
  }

  const { error } = await admin.from('liberacoes').upsert(
    {
      email: item.email,
      user_id: userId,
      status: 'ativa',
      pedido_id: item.pedidoId,
      liberada_em: new Date().toISOString(),
      revogada_em: null,
      motivo_revogacao: null,
    },
    { onConflict: 'email' },
  )

  if (error) throw new Error(`não consegui liberar ${item.email}: ${error.message}`)

  return {
    ok: true,
    nota: userId
      ? 'vitalício liberado e vinculado à conta existente'
      : 'vitalício liberado, aguardando o cadastro',
  }
}

/**
 * Os recursos que este item concede, gravados com o pedido que os pagou.
 *
 * ===========================================================================
 * O pedido_id NA LINHA É O QUE TORNA A REVOGAÇÃO CIRÚRGICA
 * ===========================================================================
 * Cada recurso nasce carimbado com o pedido que o pagou — o do ITEM, não o do
 * checkout. Quando o reembolso chegar, ele revoga `where pedido_id = <aquele>`
 * e por construção não alcança recurso de outro bump nem o vitalício, que mora
 * noutra tabela e tem o pedido do item principal.
 *
 * Sem o carimbo, revogar exigiria olhar o catálogo e deduzir quais recursos
 * "provavelmente" vieram daquela compra. Dedução em revogação é como se tira
 * acesso de quem pagou.
 * ===========================================================================
 *
 * Não lança: módulo que falha não pode derrubar o vitalício que já foi
 * gravado. Fica na nota do evento, que é o lugar de onde eu conserto à mão.
 */
async function liberarModulos(admin: Admin, item: ItemCakto, userId: string | null) {
  const produto = produtoDoPagamento(item.produtoId)

  if (!produto) {
    /*
      Produto que a Cakto vendeu e o mapa não conhece.

      Vai para o console COM UUID, NOME E OFERTA. O UUID sozinho me obrigaria a
      voltar ao payload para saber de que produto se trata, e é justamente na
      hora em que isto aparece — alguém pagou e não recebeu — que eu não quero
      estar caçando payload.

      Não é exceção: a compra do item continua registrada, e o vitalício (se
      este evento tiver o item principal) foi liberado normalmente. Só não há o
      que conceder por um produto que ninguém mapeou.
    */
    console.warn(
      `[cakto] ${descreverItem(item)} — pedido ${item.pedidoId}, ${item.email}. ` +
        `Nenhum módulo concedido. Se o produto é novo, acrescente-o em lib/cakto/produtos.ts.`,
    )
    return `sem módulos — ${descreverItem(item)}`
  }

  if (produto.recursos.length === 0) return `${produto.apelido} — não concede módulo`

  const agora = new Date().toISOString()
  const linhas = produto.recursos.map((recurso) => ({
    email: item.email,
    user_id: userId,
    recurso,
    status: 'ativa',
    pedido_id: item.pedidoId,
    liberada_em: agora,
    revogada_em: null,
    motivo_revogacao: null,
  }))

  /*
    Todas as chaves em todas as linhas, e nenhuma omitida: no insert em lote do
    PostgREST, chave ausente numa linha vira NULL explícito e atropela o
    DEFAULT da coluna. Ver a regra no README.
  */
  const { error } = await admin
    .from('recursos_liberados')
    .upsert(linhas, { onConflict: 'email,recurso' })

  if (error) return `FALHOU ao liberar ${produto.apelido}: ${error.message}`
  return `${produto.apelido} liberou: ${produto.recursos.join(', ')}`
}


// ===========================================================================
// REVOGAÇÃO
// ===========================================================================

async function revogarEvento(
  admin: Admin,
  leitura: LeituraEvento,
  tipo: string,
): Promise<LinhaResultado[]> {
  const linhas: LinhaResultado[] = []

  for (const item of leitura.itens) {
    if (await jaProcessado(admin, tipo, item.pedidoId)) {
      linhas.push({ pedidoId: item.pedidoId, processado: true, nota: 'repetido — já processado antes' })
      continue
    }

    const notas: string[] = []
    let processado = true

    /*
      ===========================================================================
      SÓ O ITEM DO FECHAOBRA CHEGA PERTO DE `liberacoes`
      ===========================================================================
      Antes de haver mapa de produtos, todo refund passava pela busca em
      `liberacoes` — não havia como saber que aquele pedido era de um bump. O
      resultado, para o reembolso de um bump, era a nota "não casa com a
      liberação, revisar à mão" em TODA revogação de bump. Ruído em revisão é
      pior que ruído em log: ele treina a pessoa a ignorar a lista onde moram
      as contestações de verdade.

      Agora o item diz de que produto é. Quando ele é um bump ou upsell
      conhecido, o vitalício está fora de questão por definição e a busca nem
      acontece.

      Produto DESCONHECIDO continua passando pelo caminho cauteloso: não saber
      de que produto é não é motivo para deixar de olhar o vitalício — e o
      caminho cauteloso, por ser filtrado por pedido_id, não revoga nada que
      não seja daquele pedido.
      ===========================================================================
    */
    const podeSerVitalicio =
      ehProdutoPrincipal(item.produtoId) || produtoDoPagamento(item.produtoId) === null

    if (podeSerVitalicio) {
      const r = await revogarVitalicio(admin, item, tipo)
      notas.push(r.nota)
      if (!r.ok) processado = false
    }

    const modulos = await revogarModulos(admin, item, tipo)
    notas.push(modulos.nota)
    if (!modulos.ok) processado = false

    linhas.push({ pedidoId: item.pedidoId, processado, nota: notas.join(' · ') })
  }

  return linhas
}

async function revogarVitalicio(admin: Admin, item: ItemCakto, tipo: string) {
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
    ===========================================================================
  */
  const { data: porPedido } = await admin
    .from('liberacoes')
    .select('id')
    .eq('pedido_id', item.pedidoId)
    .maybeSingle()

  let alvo = porPedido
  let casouPor = 'pedido'

  if (!alvo) {
    const { data: porEmail } = await admin
      .from('liberacoes')
      .select('id, pedido_id')
      .eq('email', item.email)
      .maybeSingle()

    if (porEmail && !porEmail.pedido_id) {
      alvo = { id: porEmail.id }
      casouPor = 'e-mail (liberação manual, sem pedido)'
    } else if (porEmail) {
      return {
        ok: false,
        nota: `${tipo} do pedido ${item.pedidoId} não casa com a liberação de ${item.email}, que veio da compra ${porEmail.pedido_id} — vitalício NÃO revogado, revisar à mão`,
      }
    }
  }

  if (!alvo) {
    /*
      ===========================================================================
      REVOGAÇÃO SEM ALVO NÃO É CASO RESOLVIDO. É CASO PARA OLHAR.
      ===========================================================================
      `processado: true` aqui faria isto sumir da revisão.

      Um reembolso ou contestação de pedido que o sistema NUNCA VIU significa
      uma de três coisas, e nenhuma é boa:

        - cobrança que aconteceu fora do fluxo previsto;
        - fraude;
        - um purchase_approved que se perdeu — entrega falhada, payload
          incompleto, janela em que o webhook estava fora.

      Existe um caso legítimo: entrega fora de ordem, com a contestação
      chegando antes da compra. Mas a assimetria manda de novo — revisar um
      caso legítimo custa um olhar; não ver uma contestação real custa dinheiro
      e não avisa ninguém.
      ===========================================================================
    */
    return {
      ok: false,
      nota: `${tipo} sem liberação correspondente (pedido ${item.pedidoId}) — nada a revogar no vitalício, mas contestação de pedido desconhecido merece revisão`,
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

  if (error) throw new Error(`não consegui revogar ${item.email}: ${error.message}`)

  return { ok: true, nota: `vitalício revogado por ${tipo} (casou por ${casouPor})` }
}

/**
 * Revoga SÓ os módulos daquele pedido.
 *
 * ===========================================================================
 * O FILTRO É O pedido_id, E ISSO NÃO É DETALHE
 * ===========================================================================
 * Quem comprou três bumps tem recursos de três pedidos diferentes, todos no
 * mesmo checkout. Pedir reembolso de um não pode tirar os outros dois — e não
 * tira, porque o `.eq` é pelo pedido, não pelo e-mail nem pelo catálogo.
 *
 * O vitalício de R$ 47 está fora por construção: mora em `liberacoes`, outra
 * tabela, carimbado com o pedido do item principal.
 *
 * Repare no que NÃO acontece aqui: nada é apagado. O status vira 'revogada' e
 * a linha fica. O que o recurso já produziu — textos no orçamento, contrato
 * gerado — continua existindo e válido. Revogação tira a capacidade de gerar
 * NOVOS, nunca o que já foi entregue. Quem for "limpar" isto depois: reembolso
 * devolve o dinheiro do serviço, não desfaz o trabalho que o prestador já
 * mandou para o cliente dele.
 * ===========================================================================
 */
async function revogarModulos(admin: Admin, item: ItemCakto, tipo: string) {
  const { data, error } = await admin
    .from('recursos_liberados')
    .update({
      status: 'revogada',
      revogada_em: new Date().toISOString(),
      motivo_revogacao: tipo,
    })
    .eq('pedido_id', item.pedidoId)
    .eq('status', 'ativa')
    .select('recurso')

  if (error) return { ok: false, nota: `FALHOU ao revogar módulos: ${error.message}` }
  if (data?.length) return { ok: true, nota: `módulos revogados: ${data.map((r) => r.recurso).join(', ')}` }

  const produto = produtoDoPagamento(item.produtoId)

  /*
    Zero linhas revogadas para um produto que o mapa diz vender módulos é
    anomalia, não rotina: alguém pagou por um módulo, pediu o dinheiro de
    volta, e o módulo nunca chegou a ser concedido. Quase sempre é o
    purchase_approved que se perdeu — e é justamente o caso em que eu quero
    olhar, porque significa que existiu um comprador sem acesso.
  */
  if (produto && produto.recursos.length > 0) {
    return {
      ok: false,
      nota: `${tipo} de ${produto.apelido} (pedido ${item.pedidoId}) mas nenhum módulo ativo estava vinculado a ele — o purchase_approved pode ter se perdido, revisar à mão`,
    }
  }

  return { ok: true, nota: 'nenhum módulo vinculado a este pedido' }
}


// ===========================================================================
// CONSULTAS DE APOIO
// ===========================================================================

/**
 * Este par (evento, pedido) já foi processado?
 *
 * A Cakto retenta até 5 vezes e não manda id de entrega em cabeçalho
 * (conferido: só user-agent CaktoBot/1.0 e traceparent). Os ids da Vercel
 * identificam a invocação, não o evento — numa retentativa viriam diferentes.
 *
 * A chave é o par (tipo do evento, id do PEDIDO), e é por isso que o log
 * precisou virar uma linha por item: com uma linha por evento, a retentativa
 * de um checkout com bumps não teria como dizer quais dos quatro pedidos já
 * tinham sido tratados.
 */
async function jaProcessado(admin: Admin, tipo: string, pedidoId: string) {
  const { data } = await admin
    .from('eventos_cakto')
    .select('id')
    .eq('tipo', tipo)
    .eq('pedido_id', pedidoId)
    .eq('processado', true)
    .limit(1)

  return Boolean(data && data.length > 0)
}

/** O tipo da revogação já registrada para este pedido, se houver. */
async function revogacaoRegistrada(admin: Admin, pedidoId: string) {
  const { data } = await admin
    .from('eventos_cakto')
    .select('tipo')
    .eq('pedido_id', pedidoId)
    .in('tipo', ['refund', 'chargeback'])
    .limit(1)

  return data && data.length > 0 ? data[0].tipo : null
}

/** Procura a conta pelo e-mail. Nulo quando ela ainda não existe. */
async function acharUsuarioPorEmail(admin: Admin, email: string): Promise<string | null> {
  // listUsers pagina; a base é pequena e isto roda no webhook, fora do
  // caminho do usuário. Se um dia crescer, vira consulta direta em auth.users.
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const conta = data?.users.find((u) => u.email?.trim().toLowerCase() === email)
  return conta?.id ?? null
}
