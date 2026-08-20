import 'server-only'

import {
  BUCKET_LOGOS,
  criarClienteAdministrador,
  SEGUNDOS_URL_ASSINADA,
} from '@/lib/supabase/administrador'
import type { Cliente } from '@/modules/clientes/tipos'
import type { EmpresaDocumento } from '@/modules/documento/tipos'
import { PACOTES_PADRAO, TIPOS_SERVICO, VALIDADE_PADRAO_DIAS } from '@/modules/orcamentos/constantes'
import type { ItemEditor, Pacote, RascunhoOrcamento, StatusOrcamento } from '@/modules/orcamentos/tipos'

/**
 * Leitura do orçamento pelo token público.
 *
 * Usa service role porque o visitante não tem sessão — e a decisão registrada
 * desde a Fase 0 é resolver isso no servidor, sem afrouxar RLS. Nenhuma
 * policy foi criada para `anon`: quem lê aqui é o servidor, com o token na
 * mão, e devolve apenas o recorte necessário para desenhar a proposta.
 *
 * O QUE NUNCA SAI DAQUI:
 *   - user_id do prestador
 *   - e-mail de acesso do prestador (só o e-mail comercial do perfil)
 *   - qualquer coisa de outro orçamento
 *   - snapshot_aceite, eventos, valores internos
 *
 * O token vem da URL, mas é comparado com o do banco — nunca é usado para
 * montar consulta em outra tabela.
 */

export type OrcamentoPublico = {
  id: string
  token: string
  numero: number
  status: StatusOrcamento
  expirado: boolean
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
  /** Telefone do prestador, para o cliente tirar dúvida. */
  telefonePrestador: string
  nomePrestador: string
  /** ISO da resposta do cliente. Nulo enquanto não respondeu. */
  respondidoEm: string | null
}

function paraTexto(valor: unknown) {
  return valor === null || valor === undefined ? '' : String(valor)
}

export async function carregarOrcamentoPublico(
  token: string,
): Promise<OrcamentoPublico | null> {
  // Um token que não é uuid não chega ao banco: corta varredura barata.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return null
  }

  const admin = criarClienteAdministrador()

  const { data: orcamento } = await admin
    .from('orcamentos')
    .select(
      `id, user_id, numero, titulo, tipo_servico, local_servico, status, validade_dias,
       data_validade, prazo_execucao, respondido_em, texto_escopo, texto_exclusoes, texto_garantia,
       texto_condicoes_pagamento, observacoes, token_publico,
       clientes ( id, nome, telefone, email, endereco )`,
    )
    .eq('token_publico', token)
    .maybeSingle()

  if (!orcamento) return null

  // Rascunho não tem link válido: só existe orçamento público depois do envio.
  if (orcamento.status === 'rascunho') return null

  const [{ data: itens }, { data: pacotesGravados }, { data: perfil }] = await Promise.all([
    admin
      .from('orcamento_itens')
      .select('id, descricao, quantidade, unidade, valor_unitario, tipo, pacote')
      .eq('orcamento_id', orcamento.id)
      .order('ordem'),
    admin
      .from('orcamento_pacotes')
      .select('nivel, rotulo, descricao, destaque')
      .eq('orcamento_id', orcamento.id),
    admin
      .from('perfis')
      .select('nome_empresa, responsavel, telefone, email, cnpj_cpf, endereco, cor_primaria, logo_url')
      .eq('user_id', orcamento.user_id)
      .maybeSingle(),
  ])

  let logoUrl: string | undefined
  if (perfil?.logo_url) {
    const { data } = await admin.storage
      .from(BUCKET_LOGOS)
      .createSignedUrl(perfil.logo_url, SEGUNDOS_URL_ASSINADA)
    logoUrl = data?.signedUrl
  }

  const bruto = orcamento as unknown as { clientes: Cliente | Cliente[] | null }
  const clienteBruto = Array.isArray(bruto.clientes) ? bruto.clientes[0] : bruto.clientes

  const itensEditor: ItemEditor[] = (itens ?? []).map((i) => ({
    id: i.id,
    descricao: i.descricao,
    quantidade: paraTexto(i.quantidade),
    unidade: i.unidade,
    valorUnitario: paraTexto(i.valor_unitario),
    tipo: i.tipo as ItemEditor['tipo'],
    pacote: i.pacote as Pacote,
  }))

  const niveis: Pacote[] = ['essencial', 'recomendado', 'completo']
  const pacotes = niveis.map((nivel) => {
    const gravado = pacotesGravados?.find((p) => p.nivel === nivel)
    return {
      nivel,
      rotulo: gravado?.rotulo || PACOTES_PADRAO[nivel].rotulo,
      descricao: gravado?.descricao || PACOTES_PADRAO[nivel].descricao,
      destaque: gravado?.destaque ?? nivel === 'recomendado',
    }
  })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const validade = orcamento.data_validade ? new Date(`${orcamento.data_validade}T00:00:00`) : null
  const expirado = Boolean(validade && validade < hoje)

  return {
    id: orcamento.id,
    token: orcamento.token_publico,
    numero: orcamento.numero,
    status: orcamento.status as StatusOrcamento,
    expirado,
    cliente: clienteBruto
      ? {
          id: clienteBruto.id,
          nome: clienteBruto.nome,
          telefone: clienteBruto.telefone ?? '',
          email: clienteBruto.email ?? '',
          endereco: clienteBruto.endereco ?? '',
        }
      : null,
    // O e-mail aqui é o comercial do perfil, nunca o de acesso à conta.
    empresa: {
      nome: perfil?.nome_empresa?.trim() || 'Prestador de serviço',
      responsavel: perfil?.responsavel ?? undefined,
      telefone: perfil?.telefone ?? undefined,
      email: perfil?.email ?? undefined,
      cnpjCpf: perfil?.cnpj_cpf ?? undefined,
      endereco: perfil?.endereco ?? undefined,
      logoUrl,
      corPrimaria: perfil?.cor_primaria ?? undefined,
    },
    respondidoEm: orcamento.respondido_em,
    telefonePrestador: perfil?.telefone ?? '',
    nomePrestador: perfil?.responsavel?.trim() || perfil?.nome_empresa?.trim() || '',
    rascunho: {
      id: orcamento.id,
      numero: orcamento.numero,
      clienteId: clienteBruto?.id ?? null,
      titulo: orcamento.titulo ?? '',
      tipoServico: orcamento.tipo_servico ?? '',
      localServico: orcamento.local_servico ?? '',
      validadeDias: paraTexto(orcamento.validade_dias ?? VALIDADE_PADRAO_DIAS),
      dataValidade: orcamento.data_validade ?? '',
      prazoExecucao: orcamento.prazo_execucao ?? '',
      textoEscopo: orcamento.texto_escopo ?? '',
      textoExclusoes: orcamento.texto_exclusoes ?? '',
      textoGarantia: orcamento.texto_garantia ?? '',
      textoCondicoesPagamento: orcamento.texto_condicoes_pagamento ?? '',
      observacoes: orcamento.observacoes ?? '',
      status: orcamento.status as StatusOrcamento,
      itens: itensEditor,
      pacotes,
    },
  }
}

export function rotuloDoServico(valor: string) {
  return TIPOS_SERVICO.find((t) => t.valor === valor)?.rotulo ?? ''
}
