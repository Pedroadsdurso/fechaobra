import 'server-only'

import { abrirUso, fecharUso, verificarLimite, type Saldo } from './limite'

/**
 * A única porta de saída para o Gemini.
 *
 * ===========================================================================
 * A CHAVE MORA AQUI E EM MAIS LUGAR NENHUM
 * ===========================================================================
 * `GEMINI_API_KEY`, sem prefixo `NEXT_PUBLIC_`, lida dentro de um arquivo com
 * `import 'server-only'`. As duas coisas juntas são o que garante que ela não
 * atravesse: o `server-only` faz o build quebrar se um Client Component puxar
 * este módulo, e o `verificar:fronteira` para a travessia aqui de propósito,
 * porque ler segredo neste lado é o comportamento certo.
 *
 * Chamada de IA passa por esta função. Sempre. Se aparecer um segundo `fetch`
 * para generativelanguage.googleapis.com em qualquer outro arquivo, é bug: a
 * cota, o registro de uso e o limite de taxa estão todos aqui, e um caminho
 * paralelo passaria por fora dos três.
 * ===========================================================================
 */

/**
 * Escolhido medindo, não de memória — ver `npm run verificar:modelo`.
 *
 * A linha Flash Lite tem RPD 500 contra 20 do Flash, e o teste de
 * `responseSchema` passou nela: JSON válido, ~1s, 23→82 tokens numa extração.
 * O `gemini-2.5-flash-lite`, que eu teria escolhido de cabeça, responde 404
 * para contas novas — motivo suficiente para nunca mais fixar modelo sem
 * perguntar à API.
 */
export const MODELO = 'gemini-3.5-flash-lite'

const API = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Vinte segundos.
 *
 * A extração medida levou ~1s. Vinte é folga para rede ruim no canteiro, e
 * ainda cabe dentro do limite de execução da função na Vercel — estourar o
 * nosso primeiro deixa a linha de `uso_ia` fechada com 'timeout' em vez de a
 * função morrer com a cota já debitada e nenhum registro.
 */
const TEMPO_LIMITE_MS = 20_000

export type MotivoFalha =
  'cota' | 'muito_rapido' | 'timeout' | 'resposta_invalida' | 'erro_rede' | 'sem_chave'

export type ResultadoIA<T> =
  | { ok: true; dados: T; saldo: Saldo }
  | { ok: false; motivo: MotivoFalha; mensagem: string; espereMs?: number }

/**
 * Pede um JSON ao modelo e devolve já validado.
 *
 * `validar` é obrigatório e não tem valor padrão de propósito. `responseSchema`
 * garante a FORMA — que veio um array de objetos com as chaves certas — e não
 * garante o CONTEÚDO: nada impede o modelo de devolver quantidade negativa ou
 * unidade inventada. Quem chama tem que dizer o que é aceitável.
 */
export async function gerarJson<T>(parametros: {
  userId: string
  recurso: string
  /** O que o modelo deve fazer. Não leva dado de ninguém. */
  instrucao: string
  /** O payload já saneado por inclusão. Ver `saneamento.ts`. */
  entrada: object
  schema: object
  validar: (bruto: unknown) => T | null
}): Promise<ResultadoIA<T>> {
  const chave = process.env.GEMINI_API_KEY
  if (!chave) {
    // Não registra uso: nada foi gasto, nem cota nem requisição.
    console.error('GEMINI_API_KEY não está definida — recurso de IA indisponível.')
    return { ok: false, motivo: 'sem_chave', mensagem: 'Sugestões indisponíveis no momento.' }
  }

  const veredito = await verificarLimite(parametros.userId)
  if (!veredito.pode) {
    return {
      ok: false,
      motivo: veredito.motivo === 'muito_rapido' ? 'muito_rapido' : 'cota',
      mensagem: veredito.mensagem,
      espereMs: veredito.espereMs,
    }
  }

  // Abre ANTES da chamada: a cota é debitada por quem recebe a requisição, não
  // por quem devolve resposta. Ver o bloco em `limite.ts`.
  const idUso = await abrirUso(parametros.userId, parametros.recurso, MODELO)
  const comecou = Date.now()

  try {
    const resposta = await fetch(`${API}/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: parametros.instrucao }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(parametros.entrada) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: parametros.schema,
          // Zero porque a tarefa é extração, não criação: a mesma descrição
          // deve produzir os mesmos itens. Variação aqui é defeito.
          temperature: 0,
        },
      }),
    })

    const corpo = await resposta.json().catch(() => null)
    const duracaoMs = Date.now() - comecou

    if (!resposta.ok) {
      // 429 do Google significa que meu contador ficou atrás do dele. Não
      // deveria acontecer com a reserva de 100, e se acontecer eu quero ver.
      const motivo: MotivoFalha = resposta.status === 429 ? 'cota' : 'erro_rede'
      if (resposta.status === 429) {
        console.error('429 do Gemini com cota nossa disponível — conferir TETO_PROJETO_DIA')
      }
      await fecharUso(idUso, { sucesso: false, motivoFalha: motivo, duracaoMs })
      return { ok: false, motivo, mensagem: 'Não consegui gerar agora. Tente de novo.' }
    }

    const texto = corpo?.candidates?.[0]?.content?.parts?.[0]?.text
    let bruto: unknown
    try {
      bruto = JSON.parse(texto)
    } catch {
      await fecharUso(idUso, { sucesso: false, motivoFalha: 'resposta_invalida', duracaoMs })
      return { ok: false, motivo: 'resposta_invalida', mensagem: 'Resposta veio fora do formato.' }
    }

    const dados = parametros.validar(bruto)
    const uso = corpo?.usageMetadata ?? {}

    await fecharUso(idUso, {
      sucesso: dados !== null,
      motivoFalha: dados === null ? 'resposta_invalida' : undefined,
      tokensEntrada: uso.promptTokenCount,
      tokensSaida: uso.candidatesTokenCount,
      duracaoMs,
    })

    if (dados === null) {
      return {
        ok: false,
        motivo: 'resposta_invalida',
        mensagem: 'Não entendi o que você escreveu.',
      }
    }

    return { ok: true, dados, saldo: veredito.saldo }
  } catch (erro) {
    const expirou = erro instanceof Error && erro.name === 'TimeoutError'
    await fecharUso(idUso, {
      sucesso: false,
      motivoFalha: expirou ? 'timeout' : 'erro_rede',
      duracaoMs: Date.now() - comecou,
    })
    return {
      ok: false,
      motivo: expirou ? 'timeout' : 'erro_rede',
      mensagem: expirou ? 'Demorou demais. Tente de novo.' : 'Sem conexão com o serviço.',
    }
  }
}
