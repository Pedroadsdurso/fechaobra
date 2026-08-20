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
    'Orçamentos profissionais de obra e reforma em PDF, prontos para mandar no WhatsApp.',
  applicationName: 'FechaObra',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sem maximumScale: bloquear zoom prejudica quem enxerga pouco.
  themeColor: '#f6f7f9',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${fonteSans.variable} ${fonteMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
