import { NextResponse, type NextRequest } from 'next/server'

import { dentroDoLimite, ipDaRequisicao } from '@/lib/limite-taxa'
import { criarClienteAdministrador } from '@/lib/supabase/administrador'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * Registra que o cliente abriu o orçamento — de verdade.
 *
 * É POST disparado pelo navegador depois que a página monta, e não durante o
 * render do servidor. Essa escolha é o que separa abertura real de ruído:
 *
 * 1. PRÉVIA DO WHATSAPP não conta. O robô que gera o cartãozinho do link baixa
 *    o HTML e vai embora; ele não executa JavaScript, então nunca chega aqui.
 *    Se o evento fosse gravado no render da página, TODO link colado no
 *    WhatsApp nasceria "visualizado" antes de o cliente tocar nele.
 *
 * 2. RECARREGAR não conta. Só age quando o status ainda é 'enviado', e a
 *    primeira passagem já o move para 'visualizado'. Da segunda vez em diante
 *    não há o que fazer — a condição é o próprio antídoto contra refresh.
 *
 * 3. O PRÓPRIO PRESTADOR não conta. Ele vai abrir o link para conferir como
 *    ficou, e sem esta checagem veria "visualizado" e concluiria que o cliente
 *    leu. É o falso positivo mais caro dos três: leva a pessoa a cobrar
 *    resposta de quem nem recebeu.
 */
export async function POST(request: NextRequest, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params

  if (!dentroDoLimite(`visualizado:${ipDaRequisicao(request.headers)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const admin = criarClienteAdministrador()

  const { data: orcamento } = await admin
    .from('orcamentos')
    .select('id, user_id, status')
    .eq('token_publico', token)
    .maybeSingle()

  if (!orcamento) return NextResponse.json({ ok: false }, { status: 404 })

  // Já visualizado, aceito ou recusado: nada a registrar.
  if (orcamento.status !== 'enviado') return NextResponse.json({ ok: true, registrado: false })

  // O dono abrindo o próprio link.
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === orcamento.user_id) {
    return NextResponse.json({ ok: true, registrado: false, motivo: 'dono' })
  }

  await admin.from('eventos_orcamento').insert({
    orcamento_id: orcamento.id,
    tipo: 'visualizado',
    ip: ipDaRequisicao(request.headers),
    user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
  })

  await admin.from('orcamentos').update({ status: 'visualizado' }).eq('id', orcamento.id)

  return NextResponse.json({ ok: true, registrado: true })
}
