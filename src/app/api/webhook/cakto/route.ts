import { timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { dentroDoLimite, ipDaRequisicao } from '@/lib/limite-taxa'
import { criarClienteAdministrador } from '@/lib/supabase/administrador'
import type { Json } from '@/lib/tipos-banco'

/**
 * Webhook da Cakto — ETAPA A: só registra, não processa.
 *
 * Nada aqui libera, revoga ou toca em conta de usuário. Esta rota existe para
 * responder uma pergunta antes de a lógica ser escrita: o que a Cakto manda
 * de verdade? Webhook construído no escuro falha exatamente quando entra
 * dinheiro, e o mapeamento de campos vai ser escrito olhando o payload real.
 *
 * ===========================================================================
 * A CAKTO NÃO ASSINA O PAYLOAD
 * ===========================================================================
 * Conferido na documentação dela, não suposto: não há HMAC e não há header de
 * assinatura. O segredo compartilhado viaja DENTRO do corpo JSON, no campo
 * `secret`, e a validação é comparar esse campo com o que está guardado.
 *
 * Três consequências que mudam o desenho combinado:
 *
 * 1. Não existe "confiar só no que a assinatura cobre". Ou o segredo bate — e
 *    aí a requisição veio de quem o conhece — ou não bate. Não há integridade
 *    campo a campo: quem tiver o segredo forja o corpo inteiro.
 *
 * 2. O segredo NÃO PODE SER GRAVADO. O pedido era registrar o payload bruto,
 *    mas o payload bruto contém a credencial. Guardá-lo colocaria o segredo
 *    em texto puro no banco, exposto a backup, export e consulta de suporte.
 *    Ele é trocado por '[removido]' antes de gravar.
 *
 * 3. Como o segredo anda no corpo, HTTPS é obrigatório — e é o que a Vercel
 *    já garante.
 *
 * A comparação é em tempo constante. Comparar credencial com === vaza o
 * tamanho do prefixo comum pelo tempo de resposta.
 * ===========================================================================
 *
 * A Cakto tenta de novo até 5 vezes (5s, 1min, 2min30, 6min, 30min) e espera
 * 2xx em até 8 segundos. Por isso esta rota faz uma coisa só: gravar.
 */

/** Corpo maior que isto não é webhook de venda — é alguém enchendo a tabela. */
const LIMITE_CORPO = 512 * 1024

/** Cabeçalhos que não têm o que fazer num log. */
const NAO_REGISTRAR = new Set(['authorization', 'cookie', 'x-api-key', 'proxy-authorization'])

function iguais(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  // timingSafeEqual exige mesmo tamanho; tamanho diferente já é diferente.
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

/** Tira a credencial do corpo antes de ele virar linha no banco. */
function semSegredo(corpo: Record<string, unknown>): Json {
  const copia = { ...corpo }
  if ('secret' in copia) copia.secret = '[removido]'
  // O corpo veio de JSON.parse, então já é Json por construção — o TypeScript
  // é que não consegue provar isso a partir de um Record<string, unknown>.
  return copia as Json
}

function cabecalhosLimpos(request: NextRequest) {
  const saida: Record<string, string> = {}
  request.headers.forEach((valor, nome) => {
    if (!NAO_REGISTRAR.has(nome.toLowerCase())) saida[nome] = valor
  })
  return saida
}

export async function POST(request: NextRequest) {
  const segredo = process.env.CAKTO_WEBHOOK_SECRET?.trim()

  /*
    Sem segredo configurado a rota não tem como distinguir a Cakto de
    qualquer um. 500, e não 401: o problema é nosso, não de quem chamou — e
    500 faz a Cakto tentar de novo, o que é o comportamento desejado enquanto
    a variável não estiver na Vercel.
  */
  if (!segredo) {
    console.error('CAKTO_WEBHOOK_SECRET não está definida — webhook recusado.')
    return NextResponse.json({ erro: 'Webhook não configurado.' }, { status: 500 })
  }

  const ip = ipDaRequisicao(request.headers)
  if (!dentroDoLimite(`cakto:${ip}`, 60, 60_000)) {
    return NextResponse.json({ erro: 'Muitas requisições.' }, { status: 429 })
  }

  const bruto = await request.text()
  if (bruto.length > LIMITE_CORPO) {
    return NextResponse.json({ erro: 'Corpo grande demais.' }, { status: 413 })
  }

  let corpo: Record<string, unknown>
  try {
    corpo = JSON.parse(bruto) as Record<string, unknown>
  } catch {
    return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 })
  }

  const recebido = typeof corpo.secret === 'string' ? corpo.secret : ''
  const valido = recebido.length > 0 && iguais(recebido, segredo)
  const tipo = typeof corpo.event === 'string' ? corpo.event : null

  /*
    O evento é registrado mesmo quando o segredo não bate.

    Parece contraintuitivo, e é deliberado: na Etapa A a pergunta é o que
    chega nesta URL. Se a Cakto mandar o segredo num formato que eu não
    previ, recusar em silêncio me deixaria sem nenhuma pista — e eu teria
    exatamente o webhook construído no escuro que estamos evitando.

    O risco de registrar é a tabela encher de lixo, e ele está contido: há
    limite de taxa por IP, limite de tamanho de corpo, e NADA é processado a
    partir daqui. A linha inválida é evidência, não instrução.
  */
  const admin = criarClienteAdministrador()
  const { error } = await admin.from('eventos_cakto').insert({
    tipo,
    payload: semSegredo(corpo),
    cabecalhos: cabecalhosLimpos(request),
    segredo_valido: valido,
    processado: false,
  })

  if (error) {
    // 500 faz a Cakto tentar de novo — melhor do que perder o evento calado.
    console.error('falhei ao registrar evento da Cakto:', error.message)
    return NextResponse.json({ erro: 'Não consegui registrar.' }, { status: 500 })
  }

  if (!valido) {
    return NextResponse.json({ erro: 'Segredo inválido.' }, { status: 401 })
  }

  /*
    200 com o segredo válido, mesmo sem processar nada.

    É o combinado da Etapa A, e também o que evita a Cakto entrar em
    retentativa por 30 minutos enquanto a liberação ainda não existe. Quando
    a Etapa B entrar, ela lê as linhas com segredo_valido e processado=false.
  */
  return NextResponse.json({ ok: true, registrado: true })
}

/**
 * GET só para conferir que a rota existe e está configurada.
 * Não revela o segredo nem nada do que chegou.
 */
export async function GET() {
  return NextResponse.json({
    rota: 'webhook cakto',
    etapa: 'A — registro apenas, nenhum processamento',
    configurada: Boolean(process.env.CAKTO_WEBHOOK_SECRET?.trim()),
  })
}
