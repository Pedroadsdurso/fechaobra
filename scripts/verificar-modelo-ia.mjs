/**
 * Descobre quais modelos a conta enxerga e se eles aceitam responseSchema.
 *
 * Existe porque a escolha do modelo não pode sair da minha memória: os nomes
 * da linha Flash Lite mudaram depois do meu corte de conhecimento, e "eu acho
 * que suporta" não é base para desenhar uma etapa inteira em cima. Aqui a
 * pergunta é feita para a API, que é quem sabe.
 *
 * models.list é DE GRAÇA e não consome RPD. O teste de schema consome 1
 * requisição por modelo — de 500, e só quando pedido com --gerar.
 *
 * Uso:  node scripts/verificar-modelo-ia.mjs [--gerar]
 */

import { readFileSync } from 'node:fs'

for (const linha of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const CHAVE = process.env.GEMINI_API_KEY
if (!CHAVE) {
  console.error('\n  GEMINI_API_KEY não está no ambiente nem no .env.local.\n')
  process.exit(2)
}

const API = 'https://generativelanguage.googleapis.com/v1beta'
const cabecalhos = { 'x-goog-api-key': CHAVE, 'Content-Type': 'application/json' }
const INTERESSE = /flash/i

console.log('\n  === modelos que esta conta enxerga ===\n')

const resposta = await fetch(`${API}/models?pageSize=200`, { headers: cabecalhos })
if (!resposta.ok) {
  console.error(
    `  models.list falhou: HTTP ${resposta.status} — ${(await resposta.text()).slice(0, 200)}\n`,
  )
  process.exit(1)
}

const { models = [] } = await resposta.json()
const candidatos = models
  .filter(
    (m) =>
      INTERESSE.test(m.name) && (m.supportedGenerationMethods ?? []).includes('generateContent'),
  )
  .map((m) => m.name.replace(/^models\//, ''))
  .sort()

for (const nome of candidatos) console.log(`    ${nome}`)
if (!candidatos.length) console.log('    (nenhum modelo Flash disponível para generateContent)')

if (!process.argv.includes('--gerar')) {
  console.log(
    '\n  Para provar responseSchema de verdade: node scripts/verificar-modelo-ia.mjs --gerar',
  )
  console.log('  (gasta 1 requisição por modelo testado)\n')
  process.exit(0)
}

/*
  O teste que importa. Não basta a API aceitar o campo responseSchema sem
  reclamar: um modelo pode aceitar e devolver texto solto assim mesmo. Então a
  prova é o PARSE — se JSON.parse passa e as chaves do schema estão lá, o
  contrato vale. Afirmar sobre o mecanismo, não sobre o HTTP 200.
*/
const schema = {
  type: 'OBJECT',
  properties: {
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          descricao: { type: 'STRING' },
          quantidade: { type: 'NUMBER' },
          unidade: { type: 'STRING' },
        },
        required: ['descricao', 'quantidade', 'unidade'],
      },
    },
  },
  required: ['itens'],
}

/*
  Só os Flash Lite de texto. Fora: -image e -tts, que são outra modalidade, e
  -preview, que não é base para produção. Cada nome aqui custa uma requisição
  da cota do dia — não vale gastar em modelo que não seria escolhido.
*/
const ALVOS = candidatos.filter((n) => /flash-lite$/.test(n) && !/image|tts|preview/.test(n))
console.log(`\n  === responseSchema: ${ALVOS.length} modelo(s) ===\n`)

for (const modelo of ALVOS) {
  const inicio = Date.now()
  try {
    const r = await fetch(`${API}/models/${modelo}:generateContent`, {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Extraia os itens: "pintar 40 metros quadrados de parede e trocar 3 tomadas"',
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
        },
      }),
    })

    const corpo = await r.json()
    if (!r.ok) {
      console.log(
        `    FALHA ${modelo.padEnd(26)} HTTP ${r.status} — ${corpo?.error?.message?.slice(0, 90)}`,
      )
      continue
    }

    const texto = corpo.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const dados = JSON.parse(texto)
    const ok =
      Array.isArray(dados.itens) && dados.itens.every((i) => 'descricao' in i && 'quantidade' in i)
    const uso = corpo.usageMetadata ?? {}

    console.log(
      `    ${ok ? 'ok   ' : 'FALHA'} ${modelo.padEnd(26)} ${Date.now() - inicio}ms · ` +
        `${uso.promptTokenCount ?? '?'}→${uso.candidatesTokenCount ?? '?'} tokens · ` +
        `${dados.itens?.length ?? 0} item(ns): ${JSON.stringify(dados.itens?.[0] ?? null)}`,
    )
  } catch (e) {
    console.log(`    FALHA ${modelo.padEnd(26)} ${e.message.slice(0, 90)}`)
  }
}
console.log('')
