/**
 * Prova que um checkout com order bumps é liberado item a item — e que o
 * reembolso de um item não alcança os outros.
 *
 * ===========================================================================
 * AFIRME SOBRE O MECANISMO, NÃO SOBRE O RESULTADO
 * ===========================================================================
 * A regra da casa, herdada de verificar-acesso.mjs e do teste que quase passou
 * por engano lá.
 *
 * Aqui ela morde num lugar específico. "O vitalício foi liberado" ficaria
 * VERDE mesmo com o defeito que este trabalho existe para corrigir: o código
 * antigo lia `data[0]` e também teria criado uma liberação ativa. O que ele
 * não faria é carimbá-la com o pedido do item PRINCIPAL — no evento real
 * `data[0]` é um order bump de R$ 10,90, e a liberação sairia com o pedido
 * dele.
 *
 * Por isso todo teste daqui olha o CARIMBO, não a existência da linha:
 * `liberacoes.pedido_id` tem que ser o do FechaObra, e cada módulo tem que
 * trazer o pedido do bump que o pagou. E o de refund vai além do estado final:
 * conta as consultas feitas a `liberacoes`, para provar que o reembolso de um
 * bump nem CHEGA PERTO do vitalício, em vez de provar só que não o revogou.
 * ===========================================================================
 *
 * Roda sem banco e sem servidor: o Supabase é falso, em memória. É de propósito
 * — o que está sendo testado é a decisão de quem libera o quê, e ela não
 * precisa de rede para ser errada. Rodar contra o Supabase remoto também
 * escreveria liberações de teste na mesma tabela que atende quem pagou.
 *
 * Uso: npm run verificar:cakto
 */

import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'

const TEMPORARIO = 'node_modules/.cache/fechaobra'

// ===========================================================================
// O PAYLOAD
// ===========================================================================
/**
 * O evento 8X7Zs1S, copiado de `eventos_cakto` — a compra de teste com os três
 * order bumps marcados.
 *
 * TODO CAMPO QUE O CÓDIGO LÊ ESTÁ VERBATIM: os quatro `id` de pedido, os
 * `product.id`, os `offer.id`, os `offer_type` e os `parent_order`. Inclusive a
 * ORDEM, que é o ponto: o item principal é o ÚLTIMO, e `data[0]` é o bump da
 * Recuperação de Cliente.
 *
 * O que foi mudado, e por quê:
 *   - `customer` virou uma identidade de teste. O evento real traz nome,
 *     telefone e CPF de uma pessoa; nada disso entra no git.
 *   - `fbc`, `fbp`, `pix.qrCode` e `commissions` foram removidos: blobs de
 *     rastreio e valores que nenhum caminho deste código toca.
 *   - `status` e os carimbos ficaram como no original — 'waiting_payment' com
 *     refundedAt/chargedbackAt nulos — porque provam a primeira regra do
 *     handler: quem decide é `event`, nunca `status`.
 */
const COMPRADOR = {
  id: 1,
  name: 'comprador de teste',
  email: 'bump-teste@fechaobra.test',
  docType: 'cpf',
  birthDate: null,
  docNumber: null,
  phone: null,
}

function item({ id, produtoId, nome, oferta, preco, offerType, parentOrder, refId }) {
  return {
    id,
    offer: { id: oferta, name: nome, image: null, price: preco, currency: 'BRL' },
    refId,
    amount: preco,
    paidAt: null,
    status: 'waiting_payment',
    product: {
      id: produtoId,
      name: nome,
      type: 'unique',
      short_id: 'ignorado',
      supportEmail: 'suporte@fechaobra.test',
      invoiceDescription: nome,
    },
    checkout: 1054119,
    customer: COMPRADOR,
    offer_type: offerType,
    refundedAt: null,
    checkoutUrl: 'https://pay.cakto.com.br/fkxh94h_1054119',
    parent_order: parentOrder,
    chargedbackAt: null,
    paymentMethod: 'pix',
    paymentMethodName: 'PIX',
  }
}

const RECUPERACAO = item({
  id: '5713ddd2-c3e6-4849-9f13-c971e0d643ba',
  produtoId: 'e7a1a53f-29ec-4e6e-a0b4-d7aea797c90c',
  nome: 'Recuperação de Cliente',
  oferta: 'gwjmcjt',
  preco: 10.9,
  offerType: 'orderbump',
  parentOrder: '8X7Zs1S',
  refId: '7LRaxyp',
})

const IA = item({
  id: '74c97f50-c3e7-4e8d-a5f9-6992b3aa888b',
  produtoId: '8fe54020-3178-447d-bc4d-140174cdd494',
  nome: 'Orçamento com IA em 1 minuto',
  oferta: 'iqrjnua',
  preco: 29.9,
  offerType: 'orderbump',
  parentOrder: '8X7Zs1S',
  refId: '7ojhoPm',
})

const CONTRATO = item({
  id: '7b07650f-b115-4c4e-aebd-12302f4be6e0',
  produtoId: '478dc215-b46e-46f0-80a2-efe86b77b1ab',
  nome: 'Contrato e Recibo',
  oferta: '3ed238w',
  preco: 19.9,
  offerType: 'orderbump',
  parentOrder: '8X7Zs1S',
  refId: '8oj3XCk',
})

/*
  O principal. Repare em duas coisas medidas no evento real e reproduzidas
  aqui, porque as duas quebram implementações ingênuas:

    - `parent_order` é STRING VAZIA, não ausente e não nula;
    - `refId` é '8X7Zs1S' — é para o refId que os bumps apontam, e não para o
      `id`. Quem juntar bump e principal por `parent_order = id` não casa nada.
*/
const PRINCIPAL = item({
  id: '22f8e1f3-1fdf-497e-942d-8fc73b766fd4',
  produtoId: '6ba610fb-1bc6-46d2-919f-4db497b6da84',
  nome: 'FechaObra',
  oferta: 'fkxh94h',
  preco: 47,
  offerType: 'main',
  parentOrder: '',
  refId: '8X7Zs1S',
})

/** O upsell do Áudio, no evento próprio dele: um item só, offer_type 'main'. */
const AUDIO = item({
  id: '28eeb043-ac1b-4f17-ab1d-57f200810796',
  produtoId: '7b678169-aff6-41ff-9396-1d025b2334a1',
  nome: 'Áudio Vira Orçamento',
  oferta: '3f2urd6',
  preco: 39.9,
  offerType: 'main',
  parentOrder: '',
  refId: 'aUd10up',
})

const CHECKOUT_COMPLETO = [RECUPERACAO, IA, CONTRATO, PRINCIPAL]

const evento = (tipo, data) => ({ event: tipo, secret: '[removido]', data })

// ===========================================================================
// O SUPABASE FALSO
// ===========================================================================
/**
 * O suficiente do PostgREST para este handler, e nem um método a mais.
 *
 * Ele CONTA as consultas por tabela. Não é enfeite: é o que permite provar que
 * o reembolso de um bump não consulta `liberacoes` — uma afirmação sobre o
 * caminho percorrido, que nenhuma inspeção do estado final consegue fazer.
 */
function bancoFalso({ usuarios = [] } = {}) {
  const tabelas = { eventos_cakto: [], liberacoes: [], recursos_liberados: [] }
  const consultas = { eventos_cakto: 0, liberacoes: 0, recursos_liberados: 0 }
  let sequencia = 0

  const casa = (linha, filtros) =>
    filtros.every(({ tipo, coluna, valor }) => {
      if (tipo === 'eq') return linha[coluna] === valor
      if (tipo === 'is') return (linha[coluna] ?? null) === valor
      if (tipo === 'in') return valor.includes(linha[coluna])
      throw new Error(`filtro não implementado: ${tipo}`)
    })

  class Consulta {
    constructor(nome, op, dados, opcoes) {
      this.nome = nome
      this.op = op
      this.dados = dados
      this.opcoes = opcoes ?? {}
      this.filtros = []
      this.limite = null
      this.unico = null
      this.devolver = op !== 'update' && op !== 'upsert'
    }

    select() {
      // Depois de update/upsert, `.select()` pede as linhas afetadas de volta.
      this.devolver = true
      return this
    }
    eq(coluna, valor) {
      this.filtros.push({ tipo: 'eq', coluna, valor })
      return this
    }
    is(coluna, valor) {
      this.filtros.push({ tipo: 'is', coluna, valor })
      return this
    }
    in(coluna, valor) {
      this.filtros.push({ tipo: 'in', coluna, valor })
      return this
    }
    limit(n) {
      this.limite = n
      return this
    }
    maybeSingle() {
      this.unico = 'talvez'
      return this
    }
    single() {
      this.unico = 'exato'
      return this
    }

    executar() {
      const tabela = tabelas[this.nome]
      if (!tabela) throw new Error(`tabela desconhecida: ${this.nome}`)

      if (this.op === 'select') {
        consultas[this.nome]++
        let linhas = tabela.filter((l) => casa(l, this.filtros))
        if (this.limite !== null) linhas = linhas.slice(0, this.limite)
        return this.embrulhar(linhas)
      }

      if (this.op === 'insert') {
        const novas = this.dados.map((l) => ({ id: `linha-${++sequencia}`, ...l }))
        tabela.push(...novas)
        return this.embrulhar(novas)
      }

      if (this.op === 'update') {
        const atingidas = tabela.filter((l) => casa(l, this.filtros))
        for (const l of atingidas) Object.assign(l, this.dados)
        return this.embrulhar(atingidas)
      }

      if (this.op === 'upsert') {
        const chave = (this.opcoes.onConflict ?? 'id').split(',').map((c) => c.trim())
        const afetadas = []
        for (const nova of this.dados) {
          const existente = tabela.find((l) => chave.every((c) => l[c] === nova[c]))
          if (existente) {
            Object.assign(existente, nova)
            afetadas.push(existente)
          } else {
            const criada = { id: `linha-${++sequencia}`, ...nova }
            tabela.push(criada)
            afetadas.push(criada)
          }
        }
        return this.embrulhar(afetadas)
      }

      throw new Error(`operação não implementada: ${this.op}`)
    }

    embrulhar(linhas) {
      const copia = linhas.map((l) => ({ ...l }))
      if (!this.devolver) return { data: null, error: null }
      if (this.unico === 'talvez') return { data: copia[0] ?? null, error: null }
      if (this.unico === 'exato') {
        if (copia.length !== 1) return { data: null, error: { message: 'esperava uma linha' } }
        return { data: copia[0], error: null }
      }
      return { data: copia, error: null }
    }

    then(resolver, rejeitar) {
      return Promise.resolve()
        .then(() => this.executar())
        .then(resolver, rejeitar)
    }
  }

  return {
    tabelas,
    consultas,
    cliente: {
      from(nome) {
        return {
          select: (...a) => new Consulta(nome, 'select', null).select(...a),
          insert: (linhas) => new Consulta(nome, 'insert', [].concat(linhas)),
          update: (valores) => new Consulta(nome, 'update', valores),
          upsert: (linhas, opcoes) => new Consulta(nome, 'upsert', [].concat(linhas), opcoes),
        }
      },
      auth: { admin: { listUsers: async () => ({ data: { users: usuarios } }) } },
    },
  }
}

// ===========================================================================
// AS PROVAS
// ===========================================================================
const falhas = []
const conferir = (nome, passou, detalhe) => {
  console.log(`  ${passou ? 'ok   ' : 'FALHA'} ${nome} — ${detalhe}`)
  if (!passou) falhas.push(nome)
}

const porRecurso = (banco) =>
  Object.fromEntries(banco.tabelas.recursos_liberados.map((l) => [l.recurso, l]))

/** Marca no log o que já foi tratado, como a rota faz depois de processar. */
function registrar(banco, tipo, resultado, itens) {
  const linhas = itens.map((i, n) => ({
    id: `evt-${tipo}-${n}`,
    tipo,
    pedido_id: i.id,
    processado: resultado.linhas[n].processado,
    nota: resultado.linhas[n].nota,
  }))
  banco.tabelas.eventos_cakto.push(...linhas)
}

async function principal() {
  await build({
    entryPoints: ['src/modules/acesso/processar-cakto.ts'],
    outfile: `${TEMPORARIO}/cakto.mjs`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    alias: { '@': './src' },
    /*
      `react-server` é obrigatória, e o motivo é o contrário do que parece: no
      pacote `server-only` a entrada PADRÃO é a que explode ao ser importada
      ("cannot be imported from a Client Component"), e é a condição
      `react-server` que aponta para o módulo vazio. Sem ela o esbuild embute a
      versão que estoura, e o teste nem chega a rodar.
    */
    conditions: ['react-server', 'node', 'import'],
    logLevel: 'warning',
  })
  await build({
    entryPoints: ['src/lib/cakto/payload.ts'],
    outfile: `${TEMPORARIO}/cakto-payload.mjs`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    alias: { '@': './src' },
    conditions: ['react-server', 'node', 'import'],
    logLevel: 'warning',
  })

  const { processarEventoCakto } = await import(
    pathToFileURL(`${TEMPORARIO}/cakto.mjs`).href
  )
  const { lerEvento, linhasDoEvento } = await import(
    pathToFileURL(`${TEMPORARIO}/cakto-payload.mjs`).href
  )

  const avisos = []
  const warnOriginal = console.warn
  console.warn = (...a) => avisos.push(a.join(' '))

  try {
    // -----------------------------------------------------------------------
    console.log('\n1. o log grava uma linha por item de data[]')
    // -----------------------------------------------------------------------
    {
      const leitura = lerEvento(evento('purchase_approved', CHECKOUT_COMPLETO))
      const linhas = linhasDoEvento(leitura, {
        tipo: 'purchase_approved',
        payload: {},
        cabecalhos: {},
        segredoValido: true,
      })

      conferir('quatro linhas', linhas.length === 4, `linhas = ${linhas.length}`)

      const pedidos = linhas.map((l) => l.pedido_id)
      conferir(
        'cada linha tem o pedido DELA',
        new Set(pedidos).size === 4 && pedidos.every(Boolean),
        pedidos.map((p) => p.slice(0, 8)).join(', '),
      )

      const principal = linhas.find((l) => l.pedido_id === PRINCIPAL.id)
      conferir(
        'principal: offer_type main e parent_order nulo',
        principal.offer_type === 'main' && principal.parent_order === null,
        `offer_type=${principal.offer_type}, parent_order=${JSON.stringify(principal.parent_order)} (a Cakto manda "")`,
      )

      const bumps = linhas.filter((l) => l.pedido_id !== PRINCIPAL.id)
      conferir(
        'os três bumps apontam para o refId do principal',
        bumps.length === 3 && bumps.every((b) => b.parent_order === '8X7Zs1S'),
        `parent_order = 8X7Zs1S (refId do principal, não o id ${PRINCIPAL.id.slice(0, 8)})`,
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n2. purchase_approved do checkout completo libera os cinco')
    // -----------------------------------------------------------------------
    const banco = bancoFalso()
    {
      const r = await processarEventoCakto(
        banco.cliente,
        'purchase_approved',
        evento('purchase_approved', CHECKOUT_COMPLETO),
      )

      conferir(
        'quatro desfechos, todos processados',
        r.linhas.length === 4 && r.linhas.every((l) => l.processado),
        r.linhas.map((l) => `${l.pedidoId.slice(0, 8)}:${l.processado}`).join(' '),
      )

      const liberacoes = banco.tabelas.liberacoes
      conferir(
        'uma liberação ativa',
        liberacoes.length === 1 && liberacoes[0].status === 'ativa',
        `${liberacoes.length} linha(s), status ${liberacoes[0]?.status}`,
      )

      /*
        A AFIRMAÇÃO CENTRAL DESTE ARQUIVO.

        Não é "o vitalício foi liberado" — o código antigo, lendo data[0],
        também liberaria. É "o vitalício saiu do item do FechaObra": o carimbo
        tem que ser 22f8e1f3 (o principal, que é data[3]) e não 5713ddd2 (a
        Recuperação, que é data[0]).

        Com o carimbo errado, o reembolso do bump de R$ 10,90 derrubaria o
        acesso de R$ 47 — e o teste 4 é justamente o que ficaria vermelho.
      */
      conferir(
        'vitalício carimbado com o pedido do PRINCIPAL, não com data[0]',
        liberacoes[0]?.pedido_id === PRINCIPAL.id,
        `pedido_id = ${liberacoes[0]?.pedido_id} (data[0] seria ${RECUPERACAO.id})`,
      )

      const recursos = porRecurso(banco)
      const esperados = ['recuperacao', 'ia_textos', 'ia_orcamento', 'contratos']
      conferir(
        'os quatro módulos dos três bumps',
        banco.tabelas.recursos_liberados.length === 4 &&
          esperados.every((r) => recursos[r]?.status === 'ativa'),
        Object.keys(recursos).sort().join(', '),
      )

      // Cada módulo tem que trazer o pedido do BUMP que o pagou — é o que faz
      // a revogação do teste 4 ser cirúrgica em vez de adivinhação.
      const carimbos = {
        recuperacao: RECUPERACAO.id,
        ia_textos: IA.id,
        ia_orcamento: IA.id,
        contratos: CONTRATO.id,
      }
      const certos = Object.entries(carimbos).filter(
        ([recurso, pedido]) => recursos[recurso]?.pedido_id === pedido,
      )
      conferir(
        'cada módulo carimbado com o pedido do seu próprio item',
        certos.length === 4,
        `${certos.length}/4 · contratos ← ${recursos.contratos?.pedido_id?.slice(0, 8)} (item Contrato e Recibo)`,
      )

      conferir(
        'nenhum aviso de produto fora do mapa',
        avisos.length === 0,
        avisos.length ? avisos.join(' | ') : 'os sete UUIDs do payload estão no catálogo',
      )

      registrar(banco, 'purchase_approved', r, CHECKOUT_COMPLETO)
    }

    // -----------------------------------------------------------------------
    console.log('\n3. a ordem de data[] não decide nada')
    // -----------------------------------------------------------------------
    {
      // Mesmo checkout, principal em PRIMEIRO. Se algum caminho ainda dependesse
      // de posição, este teste e o 2 não poderiam ficar verdes ao mesmo tempo.
      const b = bancoFalso()
      await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', [PRINCIPAL, CONTRATO, IA, RECUPERACAO]),
      )
      conferir(
        'principal em data[0] dá o mesmo carimbo',
        b.tabelas.liberacoes[0]?.pedido_id === PRINCIPAL.id,
        `pedido_id = ${b.tabelas.liberacoes[0]?.pedido_id?.slice(0, 8)} nas duas ordens`,
      )
      conferir(
        'mesmos quatro módulos',
        b.tabelas.recursos_liberados.length === 4,
        `${b.tabelas.recursos_liberados.length} módulos`,
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n4. refund só do Contrato e Recibo revoga só contratos')
    // -----------------------------------------------------------------------
    {
      const antes = banco.consultas.liberacoes

      const r = await processarEventoCakto(banco.cliente, 'refund', evento('refund', [CONTRATO]))

      conferir(
        'um desfecho, processado',
        r.linhas.length === 1 && r.linhas[0].processado,
        r.linhas[0].nota,
      )

      const recursos = porRecurso(banco)
      conferir(
        'contratos revogado por refund',
        recursos.contratos?.status === 'revogada' && recursos.contratos?.motivo_revogacao === 'refund',
        `status ${recursos.contratos?.status}, motivo ${recursos.contratos?.motivo_revogacao}`,
      )

      const intactos = ['recuperacao', 'ia_textos', 'ia_orcamento']
      conferir(
        'os módulos dos outros dois bumps continuam ativos',
        intactos.every((x) => recursos[x]?.status === 'ativa'),
        intactos.map((x) => `${x}=${recursos[x]?.status}`).join(' '),
      )

      conferir(
        'vitalício intacto',
        banco.tabelas.liberacoes[0]?.status === 'ativa' &&
          banco.tabelas.liberacoes[0]?.revogada_em == null,
        `status ${banco.tabelas.liberacoes[0]?.status}, revogada_em ${banco.tabelas.liberacoes[0]?.revogada_em}`,
      )

      /*
        SOBRE O MECANISMO, NÃO SÓ SOBRE O ESTADO.

        "Continua ativa" ficaria verde por acidente se o handler tivesse
        procurado em `liberacoes` e não encontrado nada — que é como a versão
        anterior se comportava, deixando junto uma nota "não casa, revisar à
        mão" em TODO reembolso de bump.

        Zero consultas prova o desenho: o item diz que é um bump, então o
        vitalício está fora de questão e a tabela nem é aberta.
      */
      conferir(
        'liberacoes nem foi consultada',
        banco.consultas.liberacoes === antes,
        `${banco.consultas.liberacoes - antes} consulta(s) — o item é bump conhecido, o vitalício está fora de questão`,
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n5. idempotência agora vale por item')
    // -----------------------------------------------------------------------
    {
      const b = bancoFalso()
      const r1 = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', CHECKOUT_COMPLETO),
      )
      registrar(b, 'purchase_approved', r1, CHECKOUT_COMPLETO)

      const r2 = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', CHECKOUT_COMPLETO),
      )

      conferir(
        'a retentativa reconhece os quatro pedidos',
        r2.linhas.length === 4 && r2.linhas.every((l) => l.nota.includes('repetido')),
        r2.linhas[0].nota,
      )
      conferir(
        'nada duplicou',
        b.tabelas.liberacoes.length === 1 && b.tabelas.recursos_liberados.length === 4,
        `${b.tabelas.liberacoes.length} liberação, ${b.tabelas.recursos_liberados.length} módulos`,
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n6. upsell avulso não concede vitalício')
    // -----------------------------------------------------------------------
    {
      const b = bancoFalso()
      const r = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', [AUDIO]),
      )

      conferir(
        'audio_orcamento liberado',
        b.tabelas.recursos_liberados.length === 1 &&
          b.tabelas.recursos_liberados[0].recurso === 'audio_orcamento',
        `${b.tabelas.recursos_liberados.map((l) => l.recurso).join(', ') || 'nenhum'} (era ia_audio antes da 0011)`,
      )
      /*
        O upsell chega com offer_type 'main' — porque é o principal DO CHECKOUT
        DELE. Se o vitalício saísse de 'main' em vez de sair do UUID do
        FechaObra, esta compra de R$ 39,90 daria o produto de R$ 47 de graça.
      */
      conferir(
        'nenhuma liberação vitalícia, apesar de offer_type "main"',
        b.tabelas.liberacoes.length === 0,
        `${b.tabelas.liberacoes.length} liberação — 'main' quer dizer "principal deste checkout", não "é o FechaObra"`,
      )
      conferir('processado', r.linhas[0].processado, r.linhas[0].nota)
    }

    // -----------------------------------------------------------------------
    console.log('\n7. produto fora do mapa avisa e não trava o resto')
    // -----------------------------------------------------------------------
    {
      avisos.length = 0
      const desconhecido = item({
        id: 'ffffffff-0000-0000-0000-000000000001',
        produtoId: '11111111-2222-3333-4444-555555555555',
        nome: 'Produto Que Ninguém Mapeou',
        oferta: 'zzz9999',
        preco: 9.9,
        offerType: 'orderbump',
        parentOrder: '8X7Zs1S',
        refId: 'novoRef',
      })

      const b = bancoFalso()
      const r = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', [desconhecido, PRINCIPAL]),
      )

      const aviso = avisos.join(' | ')
      conferir(
        'aviso traz id, nome e oferta juntos',
        aviso.includes('11111111-2222-3333-4444-555555555555') &&
          aviso.includes('Produto Que Ninguém Mapeou') &&
          aviso.includes('zzz9999'),
        aviso || '(nenhum aviso)',
      )
      conferir(
        'o vitalício do mesmo evento foi liberado assim mesmo',
        b.tabelas.liberacoes[0]?.pedido_id === PRINCIPAL.id,
        'produto desconhecido não contamina os outros itens',
      )
      conferir(
        'nenhum módulo concedido pelo desconhecido',
        b.tabelas.recursos_liberados.length === 0,
        `${b.tabelas.recursos_liberados.length} módulos`,
      )
      conferir(
        'a nota do item guarda o que era',
        r.linhas[0].nota.includes('PRODUTO FORA DO MAPA'),
        r.linhas[0].nota,
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n8. asserção: FechaObra não pode chegar como bump')
    // -----------------------------------------------------------------------
    {
      avisos.length = 0
      const disfarcado = { ...PRINCIPAL, offer_type: 'orderbump', parent_order: 'OUTRO' }

      const b = bancoFalso()
      const r = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', [disfarcado]),
      )

      conferir(
        'grita no console',
        avisos.some((a) => a.includes('ASSERÇÃO') && a.includes('orderbump')),
        avisos.join(' | ') || '(nenhum aviso)',
      )
      conferir(
        'fica pendente de revisão',
        r.linhas[0].processado === false && r.linhas[0].nota.includes('ASSERÇÃO VIOLADA'),
        r.linhas[0].nota,
      )
      /*
        E o vitalício SAI mesmo assim. Quem pagou R$ 47 pagou — negar acesso
        confirmado por causa de um campo de metadados é o erro caro que a
        assimetria manda evitar. A asserção existe para eu reconferir o mapa,
        não para punir o comprador.
      */
      conferir(
        'mas o vitalício foi liberado',
        b.tabelas.liberacoes[0]?.status === 'ativa',
        'pagamento confirmado libera; o campo estranho vira revisão, não bloqueio',
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n9. refund do principal não derruba os bumps')
    // -----------------------------------------------------------------------
    {
      const b = bancoFalso()
      const r1 = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', CHECKOUT_COMPLETO),
      )
      registrar(b, 'purchase_approved', r1, CHECKOUT_COMPLETO)

      await processarEventoCakto(b.cliente, 'refund', evento('refund', [PRINCIPAL]))

      conferir(
        'vitalício revogado',
        b.tabelas.liberacoes[0]?.status === 'revogada' &&
          b.tabelas.liberacoes[0]?.motivo_revogacao === 'refund',
        `status ${b.tabelas.liberacoes[0]?.status}`,
      )
      const recursos = porRecurso(b)
      conferir(
        'os quatro módulos dos bumps continuam ativos',
        Object.values(recursos).every((l) => l.status === 'ativa'),
        Object.entries(recursos)
          .map(([k, v]) => `${k}=${v.status}`)
          .join(' '),
      )
    }

    // -----------------------------------------------------------------------
    console.log('\n10. compra depois de reembolso não reativa (por item)')
    // -----------------------------------------------------------------------
    {
      const b = bancoFalso()
      // O refund do bump chega primeiro e fica no log — entrega fora de ordem.
      b.tabelas.eventos_cakto.push({
        id: 'evt-antigo',
        tipo: 'refund',
        pedido_id: CONTRATO.id,
        processado: false,
        nota: 'chegou antes da compra',
      })

      const r = await processarEventoCakto(
        b.cliente,
        'purchase_approved',
        evento('purchase_approved', CHECKOUT_COMPLETO),
      )

      const contrato = r.linhas.find((l) => l.pedidoId === CONTRATO.id)
      conferir(
        'o item reembolsado fica pendente',
        contrato.processado === false && contrato.nota.includes('já tem refund'),
        contrato.nota,
      )
      conferir(
        'contratos NÃO foi concedido',
        porRecurso(b).contratos === undefined,
        Object.keys(porRecurso(b)).sort().join(', ') || 'nenhum',
      )
      /*
        E o resto do checkout passa. A guarda é por PEDIDO, não pelo envelope:
        antes, com uma linha por evento, um bump contestado teria que derrubar
        o checkout inteiro ou ser ignorado — não havia meio-termo.
      */
      conferir(
        'os outros três itens foram liberados normalmente',
        b.tabelas.liberacoes[0]?.status === 'ativa' && b.tabelas.recursos_liberados.length === 3,
        `vitalício ativo + ${b.tabelas.recursos_liberados.length} módulos`,
      )
    }
  } finally {
    console.warn = warnOriginal
  }

  console.log(
    falhas.length === 0
      ? '\ncakto ok — bumps e upsells liberados e revogados por item\n'
      : `\n${falhas.length} FALHA(S): ${falhas.join(', ')}\n`,
  )
  process.exit(falhas.length === 0 ? 0 : 1)
}

principal().catch((e) => {
  console.error(e)
  process.exit(1)
})
