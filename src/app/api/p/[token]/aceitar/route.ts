import { NextResponse, type NextRequest } from 'next/server'

import { situacaoDocumento } from '@/lib/documento-br'
import { dentroDoLimite, ipDaRequisicao } from '@/lib/limite-taxa'
import { criarClienteAdministrador } from '@/lib/supabase/administrador'
import { somar } from '@/modules/orcamentos/calculos'
import { carregarOrcamentoPublico } from '@/modules/publico/consultas'

/**
 * O aceite.
 *
 * Três coisas acontecem juntas, nesta ordem:
 *
 * 1. CONGELA o orçamento inteiro em snapshot_aceite. Se o prestador editar
 *    depois — trocar um item, mexer no preço, ajustar o escopo — o que foi
 *    aceito continua recuperável exatamente como estava. É a prova do acordo,
 *    e é o que protege os dois lados.
 * 2. REGISTRA o evento com nome, IP e user agent.
 * 3. ENRIQUECE a linha do cliente. O cadastro que nasceu só com um nome se
 *    completa aqui, pelas mãos de quem tem a informação certa.
 *
 * O snapshot é gravado ANTES da mudança de status: se algo falhar no meio, o
 * pior caso é um snapshot sem aceite registrado — recuperável. O contrário
 * (aceite sem snapshot) deixaria o acordo sem prova.
 */
export async function POST(request: NextRequest, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params

  if (!dentroDoLimite(`aceitar:${ipDaRequisicao(request.headers)}`, 10, 60_000)) {
    return NextResponse.json({ erro: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 })
  }

  let corpo: { nome?: string; cpf?: string; endereco?: string }
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })
  }

  const nome = (corpo.nome ?? '').trim()
  const cpf = (corpo.cpf ?? '').trim()
  const endereco = (corpo.endereco ?? '').trim()

  if (nome.length < 2) {
    return NextResponse.json({ erro: 'Informe seu nome completo.' }, { status: 400 })
  }

  const publico = await carregarOrcamentoPublico(token)
  if (!publico) return NextResponse.json({ erro: 'Orçamento não encontrado.' }, { status: 404 })

  if (publico.status === 'aceito') {
    return NextResponse.json({ ok: true, jaAceito: true })
  }

  if (publico.expirado) {
    return NextResponse.json(
      { erro: 'Este orçamento venceu. Peça uma proposta atualizada.' },
      { status: 409 },
    )
  }

  const admin = criarClienteAdministrador()
  const agora = new Date().toISOString()
  const total = somar(publico.rascunho.itens)

  // Cópia completa e autossuficiente: quem ler isto daqui a dois anos não
  // precisa de nenhuma outra tabela para saber o que foi acordado.
  const snapshot = {
    versao: 1,
    aceito_em: agora,
    aceite: {
      nome,
      cpf: cpf || null,
      // O validador avisa, mas nunca impede: um dígito errado no celular não
      // pode custar o fechamento. Fica registrado o que ele achou.
      cpf_valido: cpf ? situacaoDocumento(cpf) === 'valido' : null,
      endereco: endereco || null,
      ip: ipDaRequisicao(request.headers),
      user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
    },
    orcamento: {
      id: publico.id,
      numero: publico.numero,
      titulo: publico.rascunho.titulo,
      tipo_servico: publico.rascunho.tipoServico,
      local_servico: publico.rascunho.localServico,
      validade_dias: publico.rascunho.validadeDias,
      data_validade: publico.rascunho.dataValidade,
      prazo_execucao: publico.rascunho.prazoExecucao,
      texto_escopo: publico.rascunho.textoEscopo,
      texto_exclusoes: publico.rascunho.textoExclusoes,
      texto_garantia: publico.rascunho.textoGarantia,
      texto_condicoes_pagamento: publico.rascunho.textoCondicoesPagamento,
      observacoes: publico.rascunho.observacoes,
      total,
    },
    itens: publico.rascunho.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: i.quantidade,
      unidade: i.unidade,
      valor_unitario: i.valorUnitario,
      tipo: i.tipo,
      pacote: i.pacote,
    })),
    pacotes: publico.rascunho.pacotes,
    empresa: publico.empresa,
    cliente_no_momento: publico.cliente,
  }

  const { error: erroSnapshot } = await admin
    .from('orcamentos')
    .update({ snapshot_aceite: snapshot })
    .eq('id', publico.id)

  if (erroSnapshot) {
    return NextResponse.json({ erro: 'Não foi possível registrar o aceite.' }, { status: 500 })
  }

  await admin.from('eventos_orcamento').insert({
    orcamento_id: publico.id,
    tipo: 'aceito',
    nome_aceite: nome,
    ip: ipDaRequisicao(request.headers),
    user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
  })

  await admin
    .from('orcamentos')
    .update({ status: 'aceito', respondido_em: agora })
    .eq('id', publico.id)

  // O cadastro se completa. Não sobrescreve o que já existe: o prestador pode
  // ter anotado um apelido ou um endereço mais útil que o formal.
  const precisaEndereco = Boolean(publico.cliente && !publico.cliente.endereco.trim() && endereco)
  if (publico.cliente && precisaEndereco) {
    await admin.from('clientes').update({ endereco }).eq('id', publico.cliente.id)
  }

  return NextResponse.json({ ok: true, aceitoEm: agora, total })
}
