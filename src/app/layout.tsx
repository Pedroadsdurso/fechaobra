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
  /*
    O iOS não gera splash a partir do manifest (suporte segue parcial em 2026):
    a tela entre o toque no ícone e o primeiro paint vem destas imagens, uma
    por resolução de aparelho, casadas por media query. Sem elas, tela branca.
    Retrato apenas — o manifest trava orientation: portrait.
  */
  appleWebApp: {
    capable: true,
    title: 'FechaObra',
    statusBarStyle: 'default',
    startupImage: [
      { url: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1206x2622.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/splash-1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/splash-1320x2868.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
    ],
  },
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
      <body className={`${fonteSans.variable} ${fonteMono.variable} antialiased`}>
        {/*
          Tela de carregamento do modo instalado (standalone). Vive AQUI, no
          layout raiz, e não dentro do template das rotas: ela é position:
          fixed, e o template anima com transform — ancestral com transform
          vira bloco de contenção e o fixed deixa de grudar na janela (ver
          "Decisões que valem lembrar" no README).

          No navegador comum o CSS a mantém display: none; ela só existe na
          abertura pelo ícone da tela inicial, onde continua a splash do
          sistema (mesmo azul-tinta, mesmo símbolo) até o documento terminar
          de chegar.

          A saída é um ATRIBUTO no <html>, não uma remoção do nó: este div é
          filho do body que o React hidrata, e mexer na árvore antes da
          hidratação é pedir mismatch. Atributo extra no <html> fica fora
          dessa reconciliação (confirmado em teste: setado, permanece). O
          sinal dispara no DOMContentLoaded — que no streaming do App Router
          só chega quando o conteúdo suspenso terminou — com dois rAF antes,
          para o painel já estar pintado por baixo do fade.

          O setTimeout ao lado dos rAF é obrigatório, e foi visto em teste:
          requestAnimationFrame NÃO dispara em aba oculta, e sem ele o sinal
          ficava pendurado até a aba voltar. O MutationObserver é cinto
          defensivo: se algo limpar o atributo do <html>, ele repõe; dez
          segundos depois se desliga.
        */}
        <div id="fo-splash" aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M20 54 44 76 82 30" stroke="#FFFFFF" strokeWidth="19" strokeLinecap="square" />
          </svg>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var A='data-fo-pronto',h=document.documentElement;function marcar(){if(!h.hasAttribute(A))h.setAttribute(A,'')}function armar(){marcar();var o=new MutationObserver(marcar);o.observe(h,{attributes:true,attributeFilter:[A]});setTimeout(function(){o.disconnect();marcar()},10000)}function sair(){var feito=false;function umaVez(){if(feito)return;feito=true;armar()}requestAnimationFrame(function(){requestAnimationFrame(umaVez)});setTimeout(umaVez,250)}if(document.readyState!=='loading'){sair()}else{document.addEventListener('DOMContentLoaded',sair)}})();",
          }}
        />
        {children}
      </body>
    </html>
  )
}
