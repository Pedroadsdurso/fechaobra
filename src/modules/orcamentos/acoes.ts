'use server'

import { exigirAcesso } from '@/modules/acesso/guarda'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { criarClienteServidor } from '@/lib/supabase/servidor'
import { dataLocalEmDias } from '@/lib/utils'

import { NICHO_PADRAO, VALIDADE_PADRAO_DIAS } from './constantes'
import type {
  ItemBiblioteca,
  ItemEditor,
  RascunhoOrcamento,
  ResultadoSalvar,
  TextosDoServico,
  TipoItem,
} from './tipos'

async function exigirUsuario() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sessão expirada. Entre de novo.')
  return { supabase, user }
}

/** "1.234,56" ou "1234.56" -> 1234.56. Campo vazio vira 0. */
function paraNumero(texto: string) {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

/**
 * Cria o rascunho e manda o usuário para o editor.
 *
 * A linha nasce agora, e não no primeiro salvamento, porque o editor precisa
 * de um id para o autosave ter onde gravar. O número sai do trigger no banco
 * (perfis.proximo_numero), nunca de conta feita aqui.
 *
 * Efeito colateral aceito: abrir "novo" e desistir queima um número. É o preço
 * de o autosave funcionar desde a primeira tecla, e rascunho abandonado pode
 * ser apagado da lista.
 */
export async function criarRascunho() {
  await exigirAcesso('criarRascunho')
  const { supabase, user } = await exigirUsuario()

  // O `numero` aparece como obrigatório na tipagem gerada porque a coluna é
  // NOT NULL sem DEFAULT — o gerador não enxerga o trigger BEFORE INSERT que
  // a preenche a partir de perfis.proximo_numero. Omitir aqui é intencional:
  // quem numera é o banco. O cast diz isso ao TypeScript sem afrouxar o resto.
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      user_id: user.id,
      titulo: '',
      status: 'rascunho',
      validade_dias: VALIDADE_PADRAO_DIAS,
    } as never)
    .select('id')
    .single()

  if (error || !data) throw new Error('Não foi possível criar o orçamento.')

  revalidatePath('/painel/orcamentos')
  redirect(`/painel/orcamentos/${data.id}`)
}

/**
 * Salva o rascunho inteiro: cabeçalho e itens.
 *
 * Os itens são reescritos (apaga e insere) em vez de comparados um a um. Com
 * algumas dezenas de linhas por orçamento isso é uma ida ao banco previsível,
 * e evita toda a classe de bug de sincronização de ordem — que é justamente o
 * que quebra quando o usuário arrasta, apaga e digita ao mesmo tempo. Quem
 * chama só dispara isto quando algo mudou de verdade.
 */
export async function salvarRascunho(rascunho: RascunhoOrcamento): Promise<ResultadoSalvar> {
  await exigirAcesso('salvarRascunho')
  const { supabase, user } = await exigirUsuario()

  const dias = Number(rascunho.validadeDias) || VALIDADE_PADRAO_DIAS

  const { data: atualizado, error: erroCabecalho } = await supabase
    .from('orcamentos')
    .update({
      cliente_id: rascunho.clienteId,
      titulo: rascunho.titulo,
      tipo_servico: rascunho.tipoServico || null,
      local_servico: rascunho.localServico || null,
      validade_dias: dias,
      // Recalcula sempre que os dias mudam: o trigger só preenche na criação.
      // dataLocalEmDias, não toISOString: ver a nota em lib/utils.
      data_validade: dataLocalEmDias(dias),
      prazo_execucao: rascunho.prazoExecucao || null,
      texto_escopo: rascunho.textoEscopo || null,
      texto_exclusoes: rascunho.textoExclusoes || null,
      texto_garantia: rascunho.textoGarantia || null,
      texto_condicoes_pagamento: rascunho.textoCondicoesPagamento || null,
      observacoes: rascunho.observacoes || null,
    })
    .eq('id', rascunho.id)
    .eq('user_id', user.id)
    .select('data_validade')
    .single()

  if (erroCabecalho) return { ok: false, erro: 'Falha ao salvar. Vamos tentar de novo.' }

  const { error: erroApagar } = await supabase
    .from('orcamento_itens')
    .delete()
    .eq('orcamento_id', rascunho.id)

  if (erroApagar) return { ok: false, erro: 'Falha ao salvar os itens.' }

  const paraInserir = rascunho.itens
    .filter((i) => i.descricao.trim() !== '')
    .map((item, indice) => ({
      orcamento_id: rascunho.id,
      descricao: item.descricao.trim(),
      // O check do banco exige quantidade > 0; campo vazio vira 1.
      quantidade: paraNumero(item.quantidade) || 1,
      unidade: item.unidade || 'un',
      valor_unitario: paraNumero(item.valorUnitario),
      tipo: item.tipo,
      pacote: item.pacote,
      ordem: indice,
    }))

  let idsItens: string[] = []

  if (paraInserir.length > 0) {
    const { data: inseridos, error: erroInserir } = await supabase
      .from('orcamento_itens')
      .insert(paraInserir)
      .select('id')

    if (erroInserir) return { ok: false, erro: 'Falha ao salvar os itens.' }
    idsItens = (inseridos ?? []).map((i) => i.id)
  }

  await salvarPacotes(supabase, rascunho)

  revalidatePath('/painel/orcamentos')
  return {
    ok: true,
    dataValidade: atualizado?.data_validade ?? undefined,
    idsItens,
  }
}

/**
 * Grava rótulo, frase e destaque dos três níveis.
 *
 * Em duas etapas de propósito. O índice único parcial da 0003 permite um só
 * `destaque = true` por orçamento; se o upsert mandasse o novo destaque antes
 * de desligar o antigo, os dois coexistiriam por um instante e o banco
 * rejeitaria a transação. Então: todos vão como false, e só depois o escolhido
 * é ligado.
 *
 * As linhas não são apagadas quando os pacotes deixam de ser usados — o texto
 * que a pessoa escreveu continua lá para quando ela voltar a usar. Quem decide
 * se os pacotes aparecem é a marcação dos itens, não a existência das linhas.
 */
async function salvarPacotes(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  rascunho: RascunhoOrcamento,
) {
  // Mesma razão do default em pacotesDerivados: rascunho de bundle antigo.
  if (!rascunho.pacotes?.length) return

  const { error: erroUpsert } = await supabase.from('orcamento_pacotes').upsert(
    rascunho.pacotes.map((p) => ({
      orcamento_id: rascunho.id,
      nivel: p.nivel,
      rotulo: p.rotulo.trim(),
      descricao: p.descricao.trim(),
      destaque: false,
    })),
    { onConflict: 'orcamento_id,nivel' },
  )

  if (erroUpsert) return

  const destacado = rascunho.pacotes.find((p) => p.destaque)
  if (!destacado) return

  await supabase
    .from('orcamento_pacotes')
    .update({ destaque: true })
    .eq('orcamento_id', rascunho.id)
    .eq('nivel', destacado.nivel)
}

/** Guarda um item no catálogo pessoal, para reusar em orçamentos futuros. */
export async function salvarItemNaBiblioteca(
  item: Pick<ItemEditor, 'descricao' | 'unidade' | 'valorUnitario' | 'tipo'>,
): Promise<{ ok: boolean; erro?: string; item?: ItemBiblioteca }> {
  await exigirAcesso('salvarItemNaBiblioteca')
  const descricao = item.descricao.trim()
  if (!descricao) return { ok: false, erro: 'Descreva o item antes de guardar.' }

  const { supabase, user } = await exigirUsuario()

  // Evita encher a biblioteca com o mesmo item repetido: se já existir com a
  // mesma descrição, atualiza o preço em vez de criar outra linha.
  const { data: existente } = await supabase
    .from('itens_biblioteca')
    .select('id')
    .eq('user_id', user.id)
    .ilike('descricao', descricao)
    .maybeSingle()

  const valores = {
    descricao,
    unidade: item.unidade || 'un',
    valor_unitario: paraNumero(item.valorUnitario),
    tipo: item.tipo,
  }

  const { data, error } = existente
    ? await supabase
        .from('itens_biblioteca')
        .update(valores)
        .eq('id', existente.id)
        .select('id, descricao, unidade, valor_unitario, tipo')
        .single()
    : await supabase
        .from('itens_biblioteca')
        .insert({ ...valores, user_id: user.id })
        .select('id, descricao, unidade, valor_unitario, tipo')
        .single()

  if (error || !data) return { ok: false, erro: 'Não foi possível guardar na biblioteca.' }

  return {
    ok: true,
    item: {
      id: data.id,
      descricao: data.descricao,
      unidade: data.unidade,
      valorUnitario: Number(data.valor_unitario),
      tipo: data.tipo as TipoItem,
    },
  }
}

export async function apagarItemBiblioteca(id: string): Promise<{ ok: boolean }> {
  await exigirAcesso('apagarItemBiblioteca')
  const { supabase, user } = await exigirUsuario()
  const { error } = await supabase
    .from('itens_biblioteca')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return { ok: !error }
}

export async function apagarOrcamento(id: string): Promise<{ ok: boolean; erro?: string }> {
  await exigirAcesso('apagarOrcamento')
  const { supabase, user } = await exigirUsuario()

  const { error } = await supabase.from('orcamentos').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { ok: false, erro: 'Não foi possível apagar o orçamento.' }

  revalidatePath('/painel/orcamentos')
  return { ok: true }
}

/**
 * Traz os 4 textos do seed para o tipo de serviço escolhido.
 *
 * Existe como action porque a escolha acontece no editor, no navegador, e
 * buscar isso no cliente exigiria expor a tabela. Ela é global e legível por
 * qualquer autenticado, mas passar pelo servidor mantém o padrão do resto.
 */
export async function buscarTextosPadrao(tipoServico: string): Promise<TextosDoServico | null> {
  if (!tipoServico) return null

  const { supabase } = await exigirUsuario()
  const { data } = await supabase
    .from('textos_padrao')
    .select('tipo_texto, conteudo')
    .eq('nicho', NICHO_PADRAO)
    .eq('tipo_servico', tipoServico)

  if (!data || data.length === 0) return null

  const porTipo = Object.fromEntries(data.map((t) => [t.tipo_texto, t.conteudo]))
  return {
    escopo: porTipo.escopo ?? '',
    exclusoes: porTipo.exclusoes ?? '',
    garantia: porTipo.garantia ?? '',
    condicoes: porTipo.condicoes ?? '',
  }
}

/**
 * Duplica um orçamento: o caso de uso mais frequente do produto.
 *
 * Três decisões embutidas:
 *
 * 1. O CLIENTE NÃO É COPIADO. Duplicar é quase sempre "mesmo serviço, outro
 *    cliente" — e mandar orçamento para a pessoa errada é o pior erro possível
 *    aqui. Deixar o campo vazio custa um toque; mandar para o cliente errado
 *    custa o cliente.
 *
 * 2. OS PACOTES SÓ VÊM SE ESTAVAM EM USO. Copiar o texto dos níveis num
 *    orçamento onde todos os itens estão no mesmo pacote faria o novo nascer
 *    carregando frase que ninguém vai ver.
 *
 * 3. O NÚMERO SAI DO TRIGGER, como em qualquer orçamento novo. Duplicata é
 *    documento novo, não versão do mesmo.
 */
export async function duplicarOrcamento(
  id: string,
): Promise<{ ok: boolean; id?: string; erro?: string }> {
  await exigirAcesso('duplicarOrcamento')
  const { supabase, user } = await exigirUsuario()

  const { data: origem } = await supabase
    .from('orcamentos')
    .select(
      'titulo, tipo_servico, local_servico, validade_dias, prazo_execucao, texto_escopo, texto_exclusoes, texto_garantia, texto_condicoes_pagamento, observacoes',
    )
    .eq('id', id)
    .maybeSingle()

  if (!origem) return { ok: false, erro: 'Orçamento não encontrado.' }

  const dias = origem.validade_dias ?? VALIDADE_PADRAO_DIAS

  const { data: novo, error: erroNovo } = await supabase
    .from('orcamentos')
    .insert({
      user_id: user.id,
      cliente_id: null,
      titulo: origem.titulo ?? '',
      tipo_servico: origem.tipo_servico,
      local_servico: null,
      status: 'rascunho',
      validade_dias: dias,
      data_validade: dataLocalEmDias(dias),
      prazo_execucao: origem.prazo_execucao,
      texto_escopo: origem.texto_escopo,
      texto_exclusoes: origem.texto_exclusoes,
      texto_garantia: origem.texto_garantia,
      texto_condicoes_pagamento: origem.texto_condicoes_pagamento,
      observacoes: origem.observacoes,
    } as never)
    .select('id')
    .single()

  if (erroNovo || !novo) return { ok: false, erro: 'Não foi possível duplicar.' }

  const { data: itens } = await supabase
    .from('orcamento_itens')
    .select('descricao, quantidade, unidade, valor_unitario, tipo, pacote, ordem')
    .eq('orcamento_id', id)
    .order('ordem')

  if (itens && itens.length > 0) {
    await supabase
      .from('orcamento_itens')
      .insert(itens.map((i) => ({ ...i, orcamento_id: novo.id })))
  }

  // "Em uso" é a mesma regra da tela e do documento: itens espalhados em mais
  // de um nível. Sem isso, não há comparação a fazer e o texto seria inútil.
  const niveisUsados = new Set((itens ?? []).map((i) => i.pacote))

  if (niveisUsados.size > 1) {
    const { data: pacotes } = await supabase
      .from('orcamento_pacotes')
      .select('nivel, rotulo, descricao, destaque')
      .eq('orcamento_id', id)

    if (pacotes && pacotes.length > 0) {
      // Mesma dança do salvarPacotes: o índice único parcial não deixa dois
      // destaques coexistirem nem por um instante.
      await supabase.from('orcamento_pacotes').insert(
        pacotes.map((p) => ({
          ...p,
          orcamento_id: novo.id,
          destaque: false,
        })),
      )

      const destacado = pacotes.find((p) => p.destaque)
      if (destacado) {
        await supabase
          .from('orcamento_pacotes')
          .update({ destaque: true })
          .eq('orcamento_id', novo.id)
          .eq('nivel', destacado.nivel)
      }
    }
  }

  revalidatePath('/painel/orcamentos')
  return { ok: true, id: novo.id }
}

/**
 * Envia o orçamento: o gesto que faltava no produto.
 *
 * Até aqui o status nunca saía de 'rascunho'. Enviar é o que separa "estou
 * montando" de "está na mão do cliente" — e é o que faz a lista virar fila de
 * trabalho em vez de arquivo.
 *
 * O token não é gerado aqui: a coluna tem default gen_random_uuid(), então
 * toda linha já nasce com um. Isto só o lê. Token vindo do banco, nunca de
 * nada que o cliente mande.
 */
export async function enviarOrcamento(id: string): Promise<{
  ok: boolean
  erro?: string
  token?: string
  jaEstavaEnviado?: boolean
}> {
  await exigirAcesso('enviarOrcamento')
  const { supabase, user } = await exigirUsuario()

  const { data: orcamento } = await supabase
    .from('orcamentos')
    .select('id, cliente_id, status, token_publico, enviado_em')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!orcamento) return { ok: false, erro: 'Orçamento não encontrado.' }
  if (!orcamento.cliente_id) return { ok: false, erro: 'Escolha o cliente antes de enviar.' }

  const { count } = await supabase
    .from('orcamento_itens')
    .select('*', { count: 'exact', head: true })
    .eq('orcamento_id', id)

  if (!count) return { ok: false, erro: 'Inclua ao menos um item antes de enviar.' }

  // Reenviar não reseta o histórico: se o cliente já abriu ou já respondeu,
  // voltar o status para 'enviado' apagaria a informação mais valiosa da tela.
  const jaRespondeu = orcamento.status === 'aceito' || orcamento.status === 'recusado'
  const jaAbriu = orcamento.status === 'visualizado'

  const { error } = await supabase
    .from('orcamentos')
    .update({
      status: jaRespondeu || jaAbriu ? orcamento.status : 'enviado',
      // A data do PRIMEIRO envio é a que interessa para cobrar retorno.
      enviado_em: orcamento.enviado_em ?? new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, erro: 'Não foi possível marcar como enviado.' }

  revalidatePath('/painel/orcamentos')
  revalidatePath(`/painel/orcamentos/${id}`)

  return {
    ok: true,
    token: orcamento.token_publico,
    jaEstavaEnviado: Boolean(orcamento.enviado_em),
  }
}

/**
 * Tira (ou devolve) um orçamento aceito da fila de trabalho.
 *
 * Não mexe no status: o orçamento continua 'aceito'. `tratado_em` responde
 * só à pergunta interna "já combinei o início com essa pessoa?", e é isso que
 * decide se ele aparece no topo da lista.
 *
 * Reversível a qualquer momento, de propósito. O desfazer imediato no cartão
 * resolve o clique errado, mas não sobrevive a um refresh — então o estado
 * tratado nunca é definitivo: o cartão sempre oferece o caminho de volta.
 */
export async function marcarComoTratado(
  id: string,
  tratado: boolean,
): Promise<{ ok: boolean; erro?: string }> {
  await exigirAcesso('marcarComoTratado')
  const { supabase, user } = await exigirUsuario()

  const { error } = await supabase
    .from('orcamentos')
    .update({ tratado_em: tratado ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, erro: 'Não foi possível atualizar.' }

  // Sem revalidatePath aqui, de propósito.
  //
  // Ele revalida a rota atual assim que a action volta, e a lista se
  // reordenaria no mesmo instante do toque — engolindo a janela de "Saiu da
  // fila · Desfazer" antes de a pessoa ler. Quem decide a hora de recarregar
  // é a tela, que sabe quando a confirmação terminou.
  return { ok: true }
}
