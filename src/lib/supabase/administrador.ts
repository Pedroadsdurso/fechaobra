import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/tipos-banco'

/**
 * Cliente Supabase com service role. IGNORA RLS COMPLETAMENTE.
 *
 * O `import 'server-only'` no topo é a trava: se algum dia um Client Component
 * importar este arquivo, mesmo que indiretamente, o build quebra com erro em
 * vez de vazar a chave no bundle do navegador.
 *
 * Só existe por um motivo: o bucket de logos é privado e não tem policies de
 * RLS próprias, então toda escrita e toda URL assinada passam pelo servidor.
 * Quem chama É RESPONSÁVEL por conferir a identidade do usuário antes — o RLS
 * não vai fazer isso aqui.
 */
export function criarClienteAdministrador() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!chave) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não está definida. Confira o .env.local (e, na Vercel, as variáveis de ambiente do projeto).',
    )
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const BUCKET_LOGOS = 'logos'

/** Validade da URL assinada do logo. Curta: ela é regerada a cada render. */
export const SEGUNDOS_URL_ASSINADA = 60 * 60
