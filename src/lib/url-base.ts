/**
 * A URL pública da aplicação.
 *
 * É daqui que sai o link que o prestador manda para o cliente dele. Um
 * `http://localhost:3000/p/...` chegando no WhatsApp de um cliente real é o
 * pior defeito que este app pode ter: o prestador pagou, mandou para o cliente
 * dele, e o link não abre. Não dá para consertar depois — a credibilidade já
 * foi.
 *
 * Por isso a resolução é explícita e o build de produção QUEBRA se nada
 * resolver (ver a checagem em next.config.ts, que roda antes de qualquer
 * página ser gerada).
 *
 * ===========================================================================
 * SÓ CHAME ISTO NO SERVIDOR.
 * ===========================================================================
 *
 * O Next injeta no bundle do navegador apenas variáveis com prefixo
 * NEXT_PUBLIC_. As da Vercel (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL) não
 * têm esse prefixo, então no cliente elas são `undefined` — e num deploy que
 * dependa só do fallback da Vercel, `urlBase()` chamada no navegador lançaria
 * erro em produção, mesmo com o build tendo passado.
 *
 * Quem precisa da URL no cliente recebe por prop, calculada no servidor.
 * ===========================================================================
 *
 * Ordem de precedência:
 *
 *   1. NEXT_PUBLIC_URL_BASE — o domínio próprio, quando existir. Sempre vence.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — o domínio estável de produção da
 *      Vercel. Não muda a cada deploy.
 *   3. VERCEL_URL — a URL do deploy atual. Serve para preview; em produção é
 *      um endereço com hash que muda a cada publicação, então só entra como
 *      último recurso.
 *   4. localhost — apenas em desenvolvimento.
 */

function comProtocolo(host: string) {
  return host.startsWith('http') ? host : `https://${host}`
}

/** Resolve a base, ou null se não houver nenhuma fonte confiável. */
export function resolverUrlBase(): string | null {
  const explicita = process.env.NEXT_PUBLIC_URL_BASE?.trim()
  if (explicita) return comProtocolo(explicita).replace(/\/$/, '')

  const producaoVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (producaoVercel) return comProtocolo(producaoVercel)

  const deployVercel = process.env.VERCEL_URL?.trim()
  if (deployVercel) return comProtocolo(deployVercel)

  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'

  return null
}

export function urlBase(): string {
  const base = resolverUrlBase()

  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_URL_BASE não está definida. Sem ela o link público sairia apontando para lugar nenhum.',
    )
  }

  return base
}

/** O link que vai para o cliente. */
export function urlPublica(token: string) {
  return `${urlBase()}/p/${token}`
}
