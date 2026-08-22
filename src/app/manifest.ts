import type { MetadataRoute } from 'next'

/**
 * O manifest que torna o app instalável — "adicionar à tela inicial e ficar
 * com cara de app", que é o que a página de vendas promete no FAQ.
 *
 * O Next serve isto em /manifest.webmanifest e injeta o <link> sozinho em
 * todas as rotas. O restante do PWA já existia no layout: apple-touch-icon,
 * appleWebApp (o equivalente do iOS, que ignora manifest para instalação) e
 * o themeColor por tema do sistema.
 *
 * ===========================================================================
 * SEM SERVICE WORKER, DE PROPÓSITO
 * ===========================================================================
 * Instalar não exige service worker (o Chrome derrubou a exigência; o iOS
 * nunca a teve). E offline aqui é risco sem ganho: o app é transacional —
 * orçamento salvo no servidor, aceite com hora certa, acesso liberado por
 * webhook de pagamento. Um cache desatualizado nessas telas engana o
 * prestador com dado velho parecendo vivo. No dia em que offline valer a
 * pena (rascunho no canteiro sem sinal), ele entra como recurso desenhado,
 * não como efeito colateral de cache.
 *
 * start_url em /painel: quem instalou é prestador, e a rotina dele começa no
 * painel. Deslogado, o middleware manda para /entrar — o fluxo normal.
 *
 * theme_color aqui é um valor único (manifest não aceita media query): fica o
 * claro, que é o tema de partida do app. O dark do navegador continua coberto
 * pelo themeColor do layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FechaObra',
    short_name: 'FechaObra',
    description:
      'Orçamento de obra profissional em PDF: monte em 3 minutos, mande o link no WhatsApp e receba o aceite do cliente.',
    id: '/painel',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#f6f7f9',
    lang: 'pt-BR',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
