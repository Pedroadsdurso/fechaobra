/**
 * A fronteira servidor/cliente.
 *
 * Existe por causa de um bug real, encontrado no dia do primeiro deploy e a
 * poucos minutos de ir para produção: `DialogoEnvio` — a tela onde o prestador
 * copia o link para mandar no WhatsApp — chamava `urlBase()`, que lê
 * VERCEL_PROJECT_PRODUCTION_URL.
 *
 * O Next injeta no bundle do navegador APENAS variáveis com prefixo
 * NEXT_PUBLIC_. Sem esse prefixo, no cliente a variável é `undefined`.
 *
 * O que torna essa classe de bug perigosa é como ela se esconde:
 *
 *   - o `tsc` não vê: `process.env.X` é string em qualquer ambiente;
 *   - o `eslint` não vê: é acesso a propriedade, sintaticamente impecável;
 *   - o build passa: no servidor, durante o build, a variável existe;
 *   - o `npm run dev` funciona: o fallback de localhost cobre o buraco.
 *
 * Só aparece no navegador de quem pagou, em produção. Por isso é um check que
 * derruba o build, e não um comentário: comentário não impede ninguém.
 *
 * A varredura é TRANSITIVA. O defeito não precisa estar no arquivo com
 * 'use client' — basta ele importar, a qualquer profundidade, um módulo que
 * leia a variável. Foi assim que o original passou despercebido.
 *
 * A travessia PARA em duas fronteiras, porque elas não empacotam nada:
 *
 *   - arquivos 'use server': o Next troca o import por uma chamada RPC. O
 *     corpo da Server Action fica no servidor, e ler service_role ali é o
 *     comportamento correto — acusar isso seria ensinar a ignorar o check.
 *   - arquivos que importam 'server-only': o próprio pacote já quebra o build
 *     se forem parar no cliente.
 *
 * Uso: node scripts/verificar-fronteira.mjs   (roda antes de `next build`)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(RAIZ, 'src')
const URL_BASE = join(SRC, 'lib', 'url-base.ts')

/**
 * NODE_ENV é a única exceção legítima: o próprio Next a substitui no bundle
 * do cliente. Qualquer outra sem NEXT_PUBLIC_ chega como undefined.
 */
const PERMITIDAS = new Set(['NODE_ENV'])

const EXTENSOES = ['.ts', '.tsx', '.js', '.jsx', '.mjs']

/** Remove comentários preservando as quebras de linha, para o número da linha continuar certo. */
function semComentarios(texto) {
  let saida = ''
  let i = 0
  let dentroDe = null // 'linha' | 'bloco' | 'aspas' | 'template'
  let aspa = ''

  while (i < texto.length) {
    const c = texto[i]
    const proximo = texto[i + 1]

    if (dentroDe === 'linha') {
      if (c === '\n') { dentroDe = null; saida += c } else saida += ' '
      i++
      continue
    }
    if (dentroDe === 'bloco') {
      if (c === '*' && proximo === '/') { dentroDe = null; saida += '  '; i += 2; continue }
      saida += c === '\n' ? c : ' '
      i++
      continue
    }
    if (dentroDe === 'aspas' || dentroDe === 'template') {
      saida += c
      if (c === '\\') { saida += texto[i + 1] ?? ''; i += 2; continue }
      if (c === aspa) dentroDe = null
      i++
      continue
    }

    if (c === '/' && proximo === '/') { dentroDe = 'linha'; saida += '  '; i += 2; continue }
    if (c === '/' && proximo === '*') { dentroDe = 'bloco'; saida += '  '; i += 2; continue }
    if (c === '"' || c === "'") { dentroDe = 'aspas'; aspa = c; saida += c; i++; continue }
    if (c === '`') { dentroDe = 'template'; aspa = c; saida += c; i++; continue }

    saida += c
    i++
  }

  return saida
}

/**
 * Neutraliza strings comuns, mas NÃO template literals: `${process.env.FOO}`
 * é leitura de verdade e precisa continuar visível.
 */
function semStringsSimples(texto) {
  return texto.replace(/(['"])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => m[0].repeat(m.length))
}

function arquivosDeFonte(dir) {
  const achados = []
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDeFonte(caminho))
    else if (EXTENSOES.some((e) => nome.endsWith(e))) achados.push(caminho)
  }
  return achados
}

function resolverModulo(especificador, origem) {
  let base
  if (especificador.startsWith('@/')) base = join(SRC, especificador.slice(2))
  else if (especificador.startsWith('.')) base = resolve(dirname(origem), especificador)
  else return null // pacote do node_modules: não é nosso código

  const candidatos = [base, ...EXTENSOES.map((e) => base + e), ...EXTENSOES.map((e) => join(base, 'index' + e))]
  for (const c of candidatos) {
    try { if (statSync(c).isFile()) return c } catch { /* segue */ }
  }
  return null
}

function importesDe(codigo) {
  const especificadores = []
  const padroes = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const padrao of padroes) {
    for (const achado of codigo.matchAll(padrao)) especificadores.push(achado[1])
  }
  return especificadores
}

// ---------------------------------------------------------------------------

const arquivos = arquivosDeFonte(SRC)
const codigo = new Map()
for (const arquivo of arquivos) codigo.set(arquivo, semComentarios(readFileSync(arquivo, 'utf8')))

/** 'use client' precisa ser a primeira instrução — se estiver só num comentário, não vale. */
const ehCliente = (arquivo) => /^\s*(['"])use client\1/.test(codigo.get(arquivo) ?? '')
const entradas = arquivos.filter(ehCliente)

/** Onde a travessia para: o que está atrás disto nunca chega ao navegador. */
function ficaNoServidor(arquivo) {
  const fonte = codigo.get(arquivo) ?? ''
  if (/^\s*(['"])use server\1/.test(fonte)) return true
  return importesDe(fonte).includes('server-only')
}

/** Caminho de imports que levou até o arquivo — sem ele o erro não ajuda a consertar. */
const comoChegou = new Map()
const fila = []
for (const entrada of entradas) { comoChegou.set(entrada, [entrada]); fila.push(entrada) }

while (fila.length > 0) {
  const atual = fila.shift()
  for (const especificador of importesDe(codigo.get(atual) ?? '')) {
    const destino = resolverModulo(especificador, atual)
    if (!destino || comoChegou.has(destino) || !codigo.has(destino)) continue
    comoChegou.set(destino, [...comoChegou.get(atual), destino])
    if (!ficaNoServidor(destino)) fila.push(destino)
  }
}

const curto = (p) => relative(RAIZ, p)
const problemas = []

for (const [arquivo, trilha] of comoChegou) {
  if (ficaNoServidor(arquivo)) continue

  const fonte = codigo.get(arquivo)
  const linhas = semStringsSimples(fonte).split('\n')

  // 1. Importa a resolução de URL, que depende de variáveis sem NEXT_PUBLIC_.
  for (const especificador of importesDe(fonte)) {
    if (resolverModulo(especificador, arquivo) === URL_BASE) {
      problemas.push({
        arquivo,
        linha: fonte.split('\n').findIndex((l) => l.includes(especificador)) + 1,
        o_que: `importa '${especificador}'`,
        porque: 'url-base lê VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL, que no navegador são undefined',
        trilha,
      })
    }
  }

  // 2. Lê process.env sem o prefixo que o Next injeta no bundle.
  linhas.forEach((linha, indice) => {
    for (const achado of linha.matchAll(/process\.env\.([A-Za-z_$][\w$]*)/g)) {
      const nome = achado[1]
      if (nome.startsWith('NEXT_PUBLIC_') || PERMITIDAS.has(nome)) continue
      problemas.push({
        arquivo,
        linha: indice + 1,
        o_que: `lê process.env.${nome}`,
        porque: 'sem prefixo NEXT_PUBLIC_ o valor não vai para o bundle: no navegador é undefined',
        trilha,
      })
    }
  })
}

if (problemas.length === 0) {
  console.log(
    `fronteira ok — ${entradas.length} componentes de cliente, ${comoChegou.size} arquivos alcançados, nenhuma leitura de ambiente indevida`,
  )
  process.exit(0)
}

console.error(`\nFRONTEIRA SERVIDOR/CLIENTE VIOLADA — ${problemas.length} ocorrência(s)\n`)

for (const p of problemas) {
  console.error(`  ${curto(p.arquivo)}:${p.linha}`)
  console.error(`    ${p.o_que}`)
  console.error(`    ${p.porque}`)
  if (p.trilha.length > 1) {
    console.error(`    chega pelo cliente por: ${p.trilha.map(curto).join('\n                            -> ')}`)
  } else {
    console.error(`    este arquivo é 'use client'`)
  }
  console.error('')
}

console.error('Como resolver: resolva o valor no servidor (Server Component, Server Action ou')
console.error('Route Handler) e passe para o componente por prop. Se o valor PRECISA existir no')
console.error('navegador e não é segredo, renomeie a variável com prefixo NEXT_PUBLIC_.')
console.error('')
console.error('Isto quebra o build de propósito: em desenvolvimento o defeito não aparece.\n')

process.exit(1)
