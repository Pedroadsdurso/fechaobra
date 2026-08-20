import type { NextConfig } from 'next'

/**
 * Trava de build: sem URL pública, produção não sai do lugar.
 *
 * Esta checagem roda quando o Next carrega a configuração — antes de qualquer
 * página ser gerada. Se o deploy de produção não tiver como montar o link
 * público, o build falha aqui, com mensagem clara, em vez de publicar um app
 * que manda `http://localhost:3000/p/...` para o cliente do prestador.
 *
 * Em desenvolvimento nada é exigido: localhost é a resposta certa.
 */
function exigirUrlBase() {
  const emProducao = process.env.NODE_ENV === 'production'
  if (!emProducao) return

  const temFonte =
    process.env.NEXT_PUBLIC_URL_BASE?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()

  if (temFonte) return

  throw new Error(
    [
      '',
      'Build de produção interrompido: falta a URL pública da aplicação.',
      '',
      'O link do orçamento que o prestador manda para o cliente sai daqui.',
      'Sem isso, ele apontaria para localhost.',
      '',
      'Defina NEXT_PUBLIC_URL_BASE nas variáveis de ambiente do projeto',
      '(ex.: https://fechaobra.com.br). Na Vercel, VERCEL_PROJECT_PRODUCTION_URL',
      'já serve como alternativa automática.',
      '',
    ].join('\n'),
  )
}

exigirUrlBase()

const nextConfig: NextConfig = {}

export default nextConfig
