/**
 * Gera as imagens de fixture do mock do PDF (logo + fotos da galeria).
 *
 * São placeholders gerados por código de propósito: o objetivo é exercitar
 * o caminho de <Image> do react-pdf com PNG real, não simular fotografia.
 *
 * Uso: node scripts/gerar-mock-imagens.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const tabelaCrc = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = tabelaCrc[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function bloco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const tam = Buffer.alloc(4)
  tam.writeUInt32BE(dados.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([tam, corpo, crc])
}

/** pintor(x, y) -> [r, g, b] */
function png(largura, altura, pintor) {
  const linhas = Buffer.alloc(altura * (1 + largura * 3))
  let p = 0
  for (let y = 0; y < altura; y++) {
    linhas[p++] = 0 // filtro "none"
    for (let x = 0; x < largura; x++) {
      const [r, g, b] = pintor(x, y)
      linhas[p++] = r
      linhas[p++] = g
      linhas[p++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 2 // truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/mock', { recursive: true })

// ---- Logo: marca d'água geométrica (casa) sobre a cor da marca ---------------
const MARCA = [11, 61, 46] // verde profundo, mesma cor primária do tema
const LOGO = 256
writeFileSync(
  'public/mock/logo.png',
  png(LOGO, LOGO, (x, y) => {
    const cx = x - LOGO / 2
    const telhado = y > LOGO * 0.32 && y < LOGO * 0.46 && Math.abs(cx) < (y - LOGO * 0.14) * 1.15
    const corpo = y >= LOGO * 0.46 && y < LOGO * 0.74 && Math.abs(cx) < LOGO * 0.26
    const porta = y >= LOGO * 0.58 && y < LOGO * 0.74 && Math.abs(cx) < LOGO * 0.08
    if ((telhado || corpo) && !porta) return [255, 255, 255]
    return MARCA
  }),
)

// ---- Galeria: 4 texturas distintas, tons de canteiro de obra ------------------
const FOTOS = [
  { nome: 'obra-1.png', base: [122, 128, 134], veio: [150, 156, 162] }, // concreto
  { nome: 'obra-2.png', base: [158, 122, 84], veio: [186, 150, 108] }, // madeira
  { nome: 'obra-3.png', base: [92, 118, 138], veio: [124, 150, 170] }, // azulejo
  { nome: 'obra-4.png', base: [196, 192, 184], veio: [220, 216, 208] }, // parede pintada
]

const L = 640
const A = 480
for (const { nome, base, veio } of FOTOS) {
  writeFileSync(
    `public/mock/${nome}`,
    png(L, A, (x, y) => {
      const grade = (x % 80 < 2 || y % 64 < 2) ? 1 : 0
      const gradiente = (y / A) * 0.35 + (x / L) * 0.1
      const ruido = ((x * 7919 + y * 104729) % 23) / 23 - 0.5
      return base.map((c, i) => {
        const alvo = grade ? veio[i] : c
        const v = alvo * (1 - gradiente * 0.5) + ruido * 14
        return Math.max(0, Math.min(255, Math.round(v)))
      })
    }),
  )
}

console.log('imagens geradas:')
for (const f of ['logo.png', ...FOTOS.map((f) => f.nome)]) console.log('  public/mock/' + f)
