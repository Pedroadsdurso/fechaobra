/**
 * Prova que o PDF tem TEXTO VETORIAL SELECIONÁVEL, não imagem.
 *
 * Usa pdfjs-dist — o mesmo motor que os leitores de PDF do navegador usam
 * para a camada de seleção. Se ele extrai as strings, o mouse também seleciona.
 *
 * Uso: node scripts/verificar-pdf.mjs caminho/do/arquivo.pdf
 */
import { readFileSync } from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const caminho = process.argv[2]
if (!caminho) {
  console.error('uso: node scripts/verificar-pdf.mjs <arquivo.pdf>')
  process.exit(1)
}

const doc = await getDocument({
  data: new Uint8Array(readFileSync(caminho)),
  useSystemFonts: false,
}).promise

console.log(`arquivo   : ${caminho}`)
console.log(`páginas   : ${doc.numPages}`)

let totalChars = 0
let totalImagens = 0
const fontes = new Set()

for (let n = 1; n <= doc.numPages; n++) {
  const pagina = await doc.getPage(n)
  const conteudo = await pagina.getTextContent()
  const texto = conteudo.items.map((i) => i.str).join('')
  totalChars += texto.length

  for (const item of conteudo.items) if (item.fontName) fontes.add(item.fontName)

  const ops = await pagina.getOperatorList()
  const { OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const imagens = ops.fnArray.filter(
    (f) => f === OPS.paintImageXObject || f === OPS.paintJpegXObject,
  ).length
  totalImagens += imagens

  console.log(
    `  pág ${String(n).padStart(2)} | ${String(texto.length).padStart(5)} chars de texto | ${imagens} imagem(ns)`,
  )
}

const amostra = await (await doc.getPage(1)).getTextContent()
console.log(`\nprimeiras strings extraídas da página 1:`)
amostra.items.slice(0, 8).forEach((i) => i.str.trim() && console.log(`  "${i.str}"`))

console.log(`\ntotal de caracteres selecionáveis: ${totalChars}`)
console.log(`total de imagens rasterizadas    : ${totalImagens}`)
console.log(`fontes usadas                    : ${[...fontes].join(', ')}`)

if (totalChars === 0) {
  console.error('\nFALHOU: nenhum texto extraível. O documento virou imagem.')
  process.exit(1)
}
console.log('\nOK: o texto é vetorial e selecionável.')
