import { imagemOgDoApp, tamanhoOg, tipoOg } from '@/componentes/marca/og'

/*
  force-static: a imagem é gerada no build, junto com as fontes que ela lê do
  disco. Sem isto ela viraria função em produção e cairia no mesmo buraco da
  rota do PDF — public/ não é empacotada na Vercel.
*/
export const dynamic = 'force-static'

export const alt = 'FechaObra — orçamento pronto em 3 minutos, com a sua cara'
export const size = tamanhoOg
export const contentType = tipoOg

export default function Imagem() {
  return imagemOgDoApp()
}
