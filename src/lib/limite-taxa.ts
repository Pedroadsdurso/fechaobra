import 'server-only'

/**
 * Limite de taxa simples, em memória.
 *
 * Janela deslizante por chave (normalmente o IP). Serve para conter rajada
 * acidental e varredura boba na rota pública.
 *
 * O QUE ISTO NÃO É: proteção distribuída. Cada instância serverless tem a
 * própria memória, então o limite real é por instância, e reinício zera a
 * contagem. Está adequado ao risco atual: o token é uuid v4, então não há
 * enumeração viável — o que sobra é ruído e carga, e para isso a plataforma já
 * ajuda. Quando houver receita (Fase 4) e infraestrutura compartilhada, isto
 * vira Redis ou uma tabela com índice em (chave, janela).
 */

type Registro = { contagem: number; expiraEm: number }

const registros = new Map<string, Registro>()

/** Faxina preguiçosa: só roda quando o mapa cresce, sem timer em background. */
function limpar(agora: number) {
  if (registros.size < 500) return
  for (const [chave, registro] of registros) {
    if (registro.expiraEm <= agora) registros.delete(chave)
  }
}

export function dentroDoLimite(chave: string, maximo: number, janelaMs: number) {
  const agora = Date.now()
  limpar(agora)

  const registro = registros.get(chave)

  if (!registro || registro.expiraEm <= agora) {
    registros.set(chave, { contagem: 1, expiraEm: agora + janelaMs })
    return true
  }

  registro.contagem += 1
  return registro.contagem <= maximo
}

/**
 * IP do visitante atrás de proxy.
 *
 * x-forwarded-for pode vir com uma cadeia; o primeiro é o cliente original.
 * Sem cabeçalho (ambiente local), cai numa chave fixa — o que faz o limite
 * valer para todo mundo junto em dev, que é aceitável.
 */
export function ipDaRequisicao(cabecalhos: Headers) {
  const encaminhado = cabecalhos.get('x-forwarded-for')
  if (encaminhado) return encaminhado.split(',')[0]!.trim()
  return cabecalhos.get('x-real-ip')?.trim() || 'desconhecido'
}
