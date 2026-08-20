import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const fonteSans = Geist({ variable: '--fonte-sans', subsets: ['latin'], display: 'swap' })
const fonteMono = Geist_Mono({ variable: '--fonte-mono', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'FechaObra',
    template: '%s · FechaObra',
  },
  description:
    'Monte o orçamento em 3 minutos, baixe o PDF com a sua marca e mande o link para o cliente aceitar pelo celular. Para pedreiro, elétrica, hidráulica, pintura, drywall e marcenaria.',
  applicationName: 'FechaObra',
  // Nome curto para quando o prestador adiciona à tela inicial do iPhone.
  appleWebApp: { capable: true, title: 'FechaObra', statusBarStyle: 'default' },
  /*
    NENHUM openGraph aqui de propósito.

    Metadado de layout desce por herança para TODAS as rotas, inclusive
    /p/[token]. Uma imagem de prévia do FechaObra na raiz apareceria no
    WhatsApp do cliente final quando o prestador mandasse o orçamento — e
    aquela prévia é do prestador, não nossa. Por isso a og:image do app mora
    nos grupos (publico) e (painel). Ver componentes/marca/og.tsx.
  */
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sem maximumScale: bloquear zoom prejudica quem enxerga pouco.
  themeColor: [
    // Acompanha o tema do sistema: barra clara no claro, tinta da marca no
    // escuro. Um valor fixo deixaria uma faixa branca no topo do iPhone em
    // modo escuro, que é como o app vai passar boa parte do dia na obra.
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#1E2939' },
  ],
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${fonteSans.variable} ${fonteMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
