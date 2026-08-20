import type { NextRequest } from 'next/server'

import { atualizarSessao } from '@/lib/supabase/proxy'

/**
 * Em Next 16 o arquivo `middleware.ts` foi renomeado para `proxy.ts`.
 * A API é a mesma; o nome antigo ainda funciona, mas emite aviso de descontinuado.
 */
export default async function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos:
     * - _next/static e _next/image (assets já processados)
     * - favicon e arquivos de imagem
     * Manter o proxy fora dos assets evita renovar sessão à toa.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
