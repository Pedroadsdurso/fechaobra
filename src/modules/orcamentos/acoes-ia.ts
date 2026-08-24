'use server'

import { exigirRecurso } from '@/modules/acesso/recursos'
import { extrairItens, LIMITE_DESCRICAO, type ItemExtraido } from '@/modules/ia/extrair-itens'
import { criarClienteServidor } from '@/lib/supabase/servidor'

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
