import type { Metadata } from 'next'
import Link from 'next/link'

import { IconeOrcamentos } from '@/componentes/layout/icones'
import { Botao } from '@/componentes/ui/botao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Painel' }

export default async function PaginaPainel() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome_empresa, proximo_numero')
    .eq('user_id', user!.id)
    .maybeSingle()

  const nomeEmpresa = perfil?.nome_empresa?.trim()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tinta sm:text-2xl">
          {nomeEmpresa ? `Olá, ${nomeEmpresa}` : 'Bem-vindo ao FechaObra'}
        </h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Seus orçamentos aparecem aqui assim que você criar o primeiro.
        </p>
      </div>

      {/* Estado vazio — as telas de orçamento entram na Fase 1. */}
      <div className="flex flex-col items-center rounded-xl border border-dashed border-borda bg-superficie px-6 py-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-fundo text-tinta-suave">
          <IconeOrcamentos className="size-6" />
        </div>

        <h2 className="text-base font-semibold text-tinta">Nenhum orçamento ainda</h2>
        <p className="mt-1 max-w-sm text-sm text-tinta-suave">
          Em breve você vai montar um orçamento em 3 minutos, baixar o PDF e mandar o link para o
          cliente aceitar pelo celular.
        </p>

        <div className="mt-5">
          <Botao tamanho="grande" disabled>
            Novo orçamento
          </Botao>
          <p className="mt-2 text-xs text-tinta-suave">Disponível na próxima atualização</p>

          {/* Atalho temporário da Fase 1: sai quando o editor entrar. */}
          <Link
            href="/painel/documento-teste"
            className="mt-4 inline-block text-sm font-medium text-tinta underline underline-offset-4"
          >
            Ver o motor do documento
          </Link>
        </div>
      </div>

      <p className="text-xs text-tinta-suave">
        Seu próximo orçamento será o número{' '}
        <span className="font-medium text-tinta">
          {String(perfil?.proximo_numero ?? 1).padStart(3, '0')}
        </span>
        .
      </p>
    </div>
  )
}
