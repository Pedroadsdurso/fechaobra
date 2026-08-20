import { NextResponse, type NextRequest } from 'next/server'

import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * INERTE NA FASE 0.
 *
 * A confirmação de e-mail está DESLIGADA no painel do Supabase, de propósito:
 * o app é vendido por tráfego pago com pagamento único, e cada passo entre
 * pagar e usar custa conversão. O e-mail já chega validado pela compra.
 *
 * Esta rota fica pronta para o dia em que você quiser religar a confirmação
 * (Authentication > Sign In / Providers > Confirm email). Ao religar, cadastre
 * também esta URL em Authentication > URL Configuration > Redirect URLs:
 *
 *   http://localhost:3000/auth/callback
 *   https://SEU-DOMINIO.vercel.app/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const proximo = searchParams.get('proximo') ?? '/painel'

  // Só aceita caminho interno: evita virar redirecionador aberto.
  const destino = proximo.startsWith('/') && !proximo.startsWith('//') ? proximo : '/painel'

  if (code) {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${destino}`)
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`)
}
