'use server'

import { exigirRecurso } from '@/modules/acesso/recursos'
import { extrairItens, LIMITE_DESCRICAO, type ItemExtraido } from '@/modules/ia/extrair-itens'
import { gerarTextos, type TextosGerados } from '@/modules/ia/gerar-textos'
import { criarClienteServidor } from '@/lib/supabase/servidor'

import { carregarTextosPadrao } from './consultas'

/**
 * As ações de IA do editor.
 *
 * Arquivo separado de `acoes.ts` de propósito: aqui toda ação passa por
 * `exigirRecurso`, não só por `exigirAcesso`. Misturar as duas famílias no
 * mesmo arquivo é como uma ação nova acaba nascendo com a guarda errada —
 * quem copia a função de cima copia a primeira linha dela.
 */

export type ResultadoExtracao =
  | { ok: true; itens: ItemExtraido[]; restantes: number }
  | { ok: false; mensagem: string; espereMs?: number }

/**
 * Texto corrido do prestador -> linhas de orçamento.
 *
 * O que sai desta máquina para o Gemini são DOIS campos, montados por
 * inclusão em `payloadExtracao`: o tipo de serviço e o texto que a pessoa
 * escreveu. Nada de cliente, endereço, telefone, CPF, valores ou dados da
 * empresa — nem por engano, porque não há caminho por onde eles passariam.
 *
 * Os itens voltam SEM valor unitário, e isso não é omissão: o schema mandado
 * ao modelo não tem campo de preço. Ver o bloco em `extrair-itens.ts`.
 */
export async function extrairItensDoTexto(entrada: {
  tipoServico: string
  descricao: string
}): Promise<ResultadoExtracao> {
  await exigirRecurso('ia_orcamento')

  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensagem: 'Sessão expirada. Entre de novo.' }

  const descricao = (entrada.descricao ?? '').trim()
  if (descricao.length < 10) {
    return { ok: false, mensagem: 'Escreva um pouco mais sobre o serviço.' }
  }

  const resultado = await extrairItens({
    userId: user.id,
    tipoServico: entrada.tipoServico ?? '',
    // O corte também acontece no saneamento; aqui é para a mensagem de erro
    // poder ser específica se um dia passar a existir.
    descricao: descricao.slice(0, LIMITE_DESCRICAO),
  })

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem, espereMs: resultado.espereMs }
  }

  return { ok: true, itens: resultado.dados, restantes: resultado.saldo.restantes - 1 }
}

export type ResultadoTextos =
  | { ok: true; textos: TextosGerados; restantes: number }
  | { ok: false; mensagem: string; espereMs?: number }

/**
 * Os quatro textos que sustentam o preço, a partir do que o orçamento já tem.
 *
 * Sai daqui: tipo de serviço, título e a DESCRIÇÃO de cada item — três campos,
 * montados por inclusão em `payloadTextos`. Quantidade, unidade e valor
 * unitário ficam: não melhoram um texto de escopo, e valor unitário é a
 * informação comercial mais sensível que o prestador tem.
 *
 * Precisa de itens. Escopo escrito sem saber o que foi contratado sai genérico
 * — e texto genérico num orçamento é pior que campo vazio, porque parece que
 * alguém escreveu.
 */
export async function gerarTextosDoOrcamento(entrada: {
  tipoServico: string
  titulo: string
  itens: { descricao: string }[]
}): Promise<ResultadoTextos> {
  await exigirRecurso('ia_textos')

  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensagem: 'Sessão expirada. Entre de novo.' }

  const itens = (entrada.itens ?? []).filter((i) => i?.descricao?.trim())
  if (itens.length === 0) {
    return { ok: false, mensagem: 'Inclua ao menos um item antes de gerar os textos.' }
  }

  /*
    O prazo de garantia sai daqui, do seed do tipo de serviço — 5 anos em
    impermeabilização, 3 em marcenaria, 2 em telhado. É o que dá ao modelo de
    onde tirar número em vez de inventar, e é contra este texto que os prazos
    do resultado são conferidos. Sem ele, nenhum período passa.
  */
  const padrao = await carregarTextosPadrao(entrada.tipoServico ?? '')

  const resultado = await gerarTextos({
    userId: user.id,
    tipoServico: entrada.tipoServico ?? '',
    titulo: entrada.titulo ?? '',
    itens,
    garantiaPadrao: padrao?.garantia ?? '',
  })

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem, espereMs: resultado.espereMs }
  }

  return { ok: true, textos: resultado.dados, restantes: resultado.saldo.restantes - 1 }
}
