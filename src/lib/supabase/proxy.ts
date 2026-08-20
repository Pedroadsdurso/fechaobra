import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/lib/tipos-banco'

/** Rotas que exigem sessão. Tudo o que começa com um destes prefixos. */
const ROTAS_PROTEGIDAS = ['/painel', '/clientes', '/orcamentos', '/biblioteca', '/configuracoes']

/**
 * Rotas abertas que não dependem de sessão nenhuma.
 *
 * A página do orçamento público é aberta pelo cliente do prestador, no
 * celular, muitas vezes no 4G. Validar token de sessão ali seria uma ida ao
 * Supabase antes de qualquer byte sair — latência pura, para uma resposta que
 * é sempre "não há sessão". O endpoint que registra visualização continua
 * passando pelo fluxo normal, porque lá a sessão importa: é como se descobre
 * que quem abriu é o próprio dono.
 */
const ROTAS_ABERTAS = ['/p/']

/** Rotas de entrada: quem já está logado não deveria ficar aqui. */
const ROTAS_DE_AUTENTICACAO = ['/entrar', '/cadastro']

/**
 * Renova o token de sessão a cada requisição e faz o controle de acesso.
 *
 * Detalhe importante do @supabase/ssr: quando o token é renovado, os cookies
 * novos precisam ser gravados TANTO na request (para o resto do render enxergar)
 * QUANTO na response (para o navegador guardar). Por isso a resposta é
 * reconstruída dentro de setAll.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  if (ROTAS_ABERTAS.some((rota) => request.nextUrl.pathname.startsWith(rota))) {
    return resposta
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesParaGravar) {
          cookiesParaGravar.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          resposta = NextResponse.next({ request })
          cookiesParaGravar.forEach(({ name, value, options }) => {
            resposta.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // getUser() valida o token no servidor do Supabase. Não troque por
  // getSession(), que só lê o cookie e aceitaria um token forjado.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const caminho = request.nextUrl.pathname
  const ehProtegida = ROTAS_PROTEGIDAS.some((rota) => caminho.startsWith(rota))
  const ehAutenticacao = ROTAS_DE_AUTENTICACAO.some((rota) => caminho.startsWith(rota))

  if (!user && ehProtegida) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/entrar'
    // Guarda para onde a pessoa queria ir, para voltar depois do login.
    destino.searchParams.set('proximo', caminho)
    return NextResponse.redirect(destino)
  }

  if (user && ehAutenticacao) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/painel'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return resposta
}
