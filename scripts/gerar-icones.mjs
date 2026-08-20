/**
 * Gera os ícones raster a partir do símbolo da identidade (1a — O Selo).
 *
 * Roda uma vez, quando a marca muda. O resultado é versionado: não faz
 * sentido rasterizar a cada build algo que não muda entre deploys.
 *
 * O favicon NÃO sai daqui — é src/app/icon.svg, escrito à mão, porque o
 * Next 16 aceita SVG na convenção `icon` e vetor não precisa de tamanhos.
 * Já `apple-icon` só aceita png/jpg (conferido em
 * node_modules/next/dist/docs/.../app-icons.md), por isso este script.
 *
 * Uso: node scripts/gerar-icones.mjs
 */
import sharp from 'sharp'

const TINTA = '#1E2939'

/** sym-selo do documento de identidade: moldura arredondada + check. */
const selo = (cor) => `
  <rect x="9" y="9" width="82" height="82" rx="20" fill="none" stroke="${cor}" stroke-width="9"/>
  <path d="M31 52 45 66 70 37" fill="none" stroke="${cor}" stroke-width="11" stroke-linecap="square"/>`

/**
 * apple-touch-icon 180x180.
 *
 * Sem cantos arredondados de propósito: o iOS aplica a própria máscara, e
 * arredondar aqui deixaria uma casca escura aparecendo por fora dela.
 * Sem transparência: onde há alfa, o iOS pinta preto por baixo.
 * O símbolo ocupa 57% do lado — a proporção do mockup "ícone de app".
 */
const LADO = 180
const S = Math.round(LADO * 0.57)
const apple = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
  <rect width="${LADO}" height="${LADO}" fill="${TINTA}"/>
  <svg x="${(LADO - S) / 2}" y="${(LADO - S) / 2}" width="${S}" height="${S}" viewBox="0 0 100 100">${selo('#fff')}</svg>
</svg>`

await sharp(Buffer.from(apple)).png({ compressionLevel: 9, palette: true }).toFile('src/app/apple-icon.png')
console.log('src/app/apple-icon.png')

/**
 * og:image 1200x630, para os grupos (publico) e (painel).
 *
 * NÃO vai na raiz de app/: dali ele desceria por herança para /p/[token] e
 * carimbaria a marca do FechaObra na prévia do link que o cliente final
 * recebe no WhatsApp — exatamente o que não pode acontecer.
 *
 * Sem texto renderizado aqui: o sharp depende das fontes do sistema para
 * <text>, e o que sai na minha máquina não é o que sairia noutra. O nome
 * entra como forma, desenhado com as mesmas primitivas do símbolo.
 */
const L = 1200
const A = 630
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}" viewBox="0 0 ${L} ${A}">
  <rect width="${L}" height="${A}" fill="${TINTA}"/>
  <svg x="${(L - 260) / 2}" y="150" width="260" height="260" viewBox="0 0 100 100">${selo('#fff')}</svg>
  <rect x="${(L - 360) / 2}" y="470" width="360" height="10" rx="5" fill="#ffffff" opacity="0.22"/>
  <rect x="${(L - 220) / 2}" y="502" width="220" height="10" rx="5" fill="#ffffff" opacity="0.12"/>
</svg>`

const destinos = ['src/app/(publico)/opengraph-image.png', 'src/app/(painel)/opengraph-image.png']
for (const destino of destinos) {
  await sharp(Buffer.from(og)).png({ compressionLevel: 9, palette: true }).toFile(destino)
  console.log(destino)
}
