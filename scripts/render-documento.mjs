/**
 * Renderiza os mocks do documento em PDF, fora do navegador.
 *
 * Serve para inspecionar o resultado e rodar o verificador de texto sem abrir
 * a aplicação. O react-pdf usa o mesmo motor nos dois lados, então o que sai
 * aqui é o que sai no PDFViewer.
 *
 * Uso: node scripts/render-documento.mjs [pasta-de-saida]
 */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const destino = process.argv[2] ?? '/tmp/fechaobra'
// Dentro do projeto: um bundle em /tmp não resolveria os pacotes externos.
const temporario = 'node_modules/.cache/fechaobra'

mkdirSync(destino, { recursive: true })
mkdirSync(temporario, { recursive: true })

// O react-pdf e o React ficam de fora do bundle: precisam ser a mesma instância
// que o renderToFile usa, senão o reconciliador não reconhece os elementos.
await build({
  entryPoints: ['src/modules/documento/entrada-render.tsx'],
  outfile: `${temporario}/documento.mjs`,
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  target: 'node22',
  external: ['react', 'react-dom', '@react-pdf/renderer'],
  logLevel: 'warning',
})

const { renderToFile } = await import('@react-pdf/renderer')
const { criarDocumento, MOCKS } = await import(
  pathToFileURL(`${temporario}/documento.mjs`).href
)

console.log('renderizando...\n')

for (const [chave, { rotulo }] of Object.entries(MOCKS)) {
  const caminho = `${destino}/orcamento-${chave}.pdf`
  const inicio = Date.now()
  await renderToFile(criarDocumento(chave), caminho)
  console.log(`  ${chave.padEnd(9)} ${String(Date.now() - inicio).padStart(5)}ms  ${caminho}`)
  console.log(`  ${' '.repeat(9)}        ${rotulo}\n`)
}

rmSync(temporario, { recursive: true, force: true })
