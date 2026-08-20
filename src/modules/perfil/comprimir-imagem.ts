/**
 * Compressão de logo no navegador, antes de subir.
 *
 * Por que no cliente: o prestador vai mandar a foto que tem no celular, que
 * hoje sai com 4 mil pixels e 5 MB. Subir isso num 4G de canteiro de obra
 * demora e às vezes nem completa. Redimensionando antes, o upload vira alguns
 * KB e acontece na hora.
 *
 * PNG é tentado primeiro, para preservar fundo transparente — quase todo logo
 * de empresa tem. Só cai para JPEG (achatado em branco) se o PNG passar do
 * limite, porque o @react-pdf/renderer aceita apenas PNG e JPEG.
 */

export const LADO_MAXIMO = 600
export const BYTES_MAXIMO = 400 * 1024

const QUALIDADES_JPEG = [0.9, 0.82, 0.74, 0.66, 0.55]

export type ImagemComprimida = {
  arquivo: File
  largura: number
  altura: number
  bytesOriginais: number
  bytesFinais: number
  /** true quando a transparência foi perdida na conversão para JPEG. */
  achatada: boolean
}

async function carregarBitmap(arquivo: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(arquivo)
    } catch {
      // Safari antigo engasga com alguns PNG; cai no caminho do <img>.
    }
  }

  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    // Revogar só depois do decode: antes disso o navegador ainda está lendo.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, qualidade))
}

export async function comprimirLogo(arquivo: File): Promise<ImagemComprimida> {
  const fonte = await carregarBitmap(arquivo)
  const larguraOriginal = 'width' in fonte ? fonte.width : 0
  const alturaOriginal = 'height' in fonte ? fonte.height : 0

  if (!larguraOriginal || !alturaOriginal) {
    throw new Error('Não consegui ler essa imagem. Tente um PNG ou JPEG.')
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(larguraOriginal, alturaOriginal))
  const largura = Math.max(1, Math.round(larguraOriginal * escala))
  const altura = Math.max(1, Math.round(alturaOriginal * escala))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Este navegador não conseguiu processar a imagem.')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fonte, 0, 0, largura, altura)
  if ('close' in fonte) fonte.close()

  const png = await paraBlob(canvas, 'image/png')
  if (png && png.size <= BYTES_MAXIMO) {
    return {
      arquivo: new File([png], 'logo.png', { type: 'image/png' }),
      largura,
      altura,
      bytesOriginais: arquivo.size,
      bytesFinais: png.size,
      achatada: false,
    }
  }

  // JPEG não tem canal alpha: sem o fundo branco, a área transparente sairia
  // preta. Redesenha por cima de branco antes de exportar.
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, largura, altura)
  ctx.globalCompositeOperation = 'source-over'

  for (const qualidade of QUALIDADES_JPEG) {
    const jpeg = await paraBlob(canvas, 'image/jpeg', qualidade)
    if (jpeg && jpeg.size <= BYTES_MAXIMO) {
      return {
        arquivo: new File([jpeg], 'logo.jpg', { type: 'image/jpeg' }),
        largura,
        altura,
        bytesOriginais: arquivo.size,
        bytesFinais: jpeg.size,
        achatada: true,
      }
    }
  }

  throw new Error('Não consegui deixar essa imagem leve o bastante. Tente uma imagem mais simples.')
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
