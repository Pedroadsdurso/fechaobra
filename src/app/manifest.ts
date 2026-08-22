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
 * Cores no azul-tinta da marca (#1E2939), não no claro do app: elas pintam a
 * SPLASH do Android (fundo + ícone maskable centralizado) e devem casar com a
 * tela de carregamento própria que vem logo depois — transição invisível.
 * Dentro do app, a status bar volta ao claro porque a meta theme-color da
 * página (o themeColor do layout) tem precedência sobre o manifest.
 *
 * O iOS ignora tudo isto para splash: lá valem as apple-touch-startup-image
 * por resolução, declaradas no layout (appleWebApp.startupImage).
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
    background_color: '#1E2939',
    theme_color: '#1E2939',
    lang: 'pt-BR',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
