import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/tipos-banco'

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * A sessão vem dos cookies da requisição, então o RLS enxerga o usuário logado.
 *
 * Precisa de await: em Next 16 a função cookies() é assíncrona.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesParaGravar) {
          try {
            cookiesParaGravar.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components não podem gravar cookies. Tudo bem: quem
            // renova a sessão é o proxy (src/proxy.ts), que roda antes.
          }
        },
      },
    },
  )
}
