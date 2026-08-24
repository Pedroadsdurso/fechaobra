import { NextResponse, type NextRequest } from 'next/server'

import { dentroDoLimite, ipDaRequisicao } from '@/lib/limite-taxa'
import { criarClienteAdministrador } from '@/lib/supabase/administrador'
import { LIMITE_MOTIVO_TEXTO, motivoValido } from '@/modules/publico/motivos'
import { carregarOrcamentoPublico } from '@/modules/publico/consultas'

/**
 * O motivo da dúvida.
 *
 * ===========================================================================
 * NINGUÉM ESPERA ESTA RESPOSTA — E A FALTA DE TRATAMENTO DE ERRO É DELIBERADA
 * ===========================================================================
 * Quem for mexer nisto vai achar que falta try/catch no cliente. Não falta.
 *
 * O cliente final toca em "Tenho uma dúvida" e a próxima coisa que tem que
 * acontecer é o WhatsApp abrir. O registro do motivo viaja junto, por
 * `fetch(..., { keepalive: true })`, e ninguém lê o que volta.
 *
 * Duas razões, e a segunda é a que decide:
 *
 * 1. A CONVERSA VALE MAIS QUE O DADO. Se o registro falhar, o prestador perde
 *    uma informação útil. Se a conversa falhar, ele perde a venda. Não há
 *    erro aqui que justifique segurar a pessoa numa tela.
 *
 * 2. `window.open` DEPOIS DE UM await É BLOQUEADO NO SAFARI DO IPHONE, porque
 *    já não está dentro do gesto do usuário. Um `await fetch()` antes de abrir
 *    o WhatsApp faria uma parte dos clientes responder a pergunta e não sair
 *    do lugar — perdendo exatamente a conversa que este fluxo existe para
 *    preservar. Por isso o botão é uma âncora de verdade, que navega no
 *    próprio toque, e o POST vai junto sem ninguém segurar.
 *
 * Os códigos abaixo (400, 404, 429) existem para MIM, no log e na aba de rede,
 * não para o chamador. Devolver 204 para tudo esconderia corpo malformado de
 * quem for depurar isto depois.
 * ===========================================================================
 *
 * O STATUS DO ORÇAMENTO NÃO MUDA. Dúvida não é recusa: continua 'enviado' ou
 * 'visualizado', e `respondido_em` continua nulo. Ver a decisão no README e no
 * cabeçalho de 0010_motivo_duvida.sql.
 */
export async function POST(request: NextRequest, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params
  const ip = ipDaRequisicao(request.headers)

  // Mais folgado que o do aceite: dúvida é barata e repetir é legítimo — o
  // cliente pode voltar dias depois com outra pergunta.
  if (!dentroDoLimite(`duvida:${ip}`, 20, 60_000)) {
    return NextResponse.json({ erro: 'Muitas tentativas.' }, { status: 429 })
  }

  let corpo: { motivo?: unknown; texto?: unknown }
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }

  if (!motivoValido(corpo.motivo)) {
    return NextResponse.json({ erro: 'Motivo desconhecido.' }, { status: 400 })
  }

  const texto =
    typeof corpo.texto === 'string' ? corpo.texto.trim().slice(0, LIMITE_MOTIVO_TEXTO) : ''

  const publico = await carregarOrcamentoPublico(token)
  if (!publico) return NextResponse.json({ erro: 'Orçamento não encontrado.' }, { status: 404 })

  const admin = criarClienteAdministrador()
  await admin.from('eventos_orcamento').insert({
    orcamento_id: publico.id,
    tipo: 'duvida',
    motivo: corpo.motivo,
    motivo_texto: texto || null,
    ip,
    user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
  })

  return new NextResponse(null, { status: 204 })
}
