import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/tipos-banco'

/**
 * Cliente Supabase para Client Components (roda no navegador).
 * Usa apenas a chave anon, que é pública por natureza e limitada pelo RLS.
 */
export function criarClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
