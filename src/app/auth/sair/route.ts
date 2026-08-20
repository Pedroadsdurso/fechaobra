import { NextResponse, type NextRequest } from 'next/server'

import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * Logout por POST, não por GET: link de logout em GET é disparado por
 * prefetch do navegador e por qualquer <img> de terceiro (CSRF bobo).
 */
export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/entrar', request.url), { status: 303 })
}
