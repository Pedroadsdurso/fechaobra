/**
 * Rasteriza um PDF em PNGs, uma imagem por página.
 *
 * Só para inspeção visual durante o desenvolvimento — o PDF entregue continua
 * sendo vetorial. Útil para conferir layout sem depender do visualizador do
 * navegador, que não pode ser capturado por screenshot.
 *
 * Uso: node scripts/pdf-para-png.mjs arquivo.pdf [pasta-saida] [escala]
 */
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const entrada = process.argv[2]
const saida = process.argv[3] ?? '/tmp/fechaobra-png'
const escala = Number(process.argv[4] ?? 1.6)

if (!entrada) {
  console.error('uso: node scripts/pdf-para-png.mjs <arquivo.pdf> [pasta] [escala]')
  process.exit(1)
}

mkdirSync(saida, { recursive: true })

const doc = await getDocument({
  data: new Uint8Array(readFileSync(entrada)),
  useSystemFonts: false,
}).promise

const nome = basename(entrada, '.pdf')

for (let n = 1; n <= doc.numPages; n++) {
  const pagina = await doc.getPage(n)
  const viewport = pagina.getViewport({ scale: escala })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await pagina.render({ canvasContext: ctx, viewport, canvas }).promise

  const destino = `${saida}/${nome}-p${String(n).padStart(2, '0')}.png`
  writeFileSync(destino, canvas.toBuffer('image/png'))
  console.log(`${destino}  (${canvas.width}x${canvas.height})`)
}
