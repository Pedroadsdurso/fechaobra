import type { Metadata } from 'next'

import { SimboloFechaObra } from '@/componentes/marca/simbolo'
import Link from 'next/link'

import { BotaoNovoOrcamento } from '@/modules/orcamentos/componentes/botao-novo-orcamento'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Painel' }

export default async function PaginaPainel() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome_empresa, proximo_numero, responsavel, telefone, cnpj_cpf, logo_url')
    .eq('user_id', user!.id)
    .maybeSingle()

  const nomeEmpresa = perfil?.nome_empresa?.trim()

  // Faltando qualquer um destes, o cabeçalho do PDF sai pobre. Vale o empurrão.
  const marcaIncompleta =
    !perfil?.responsavel || !perfil?.telefone || !perfil?.cnpj_cpf || !perfil?.logo_url

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

      {marcaIncompleta && (
        <Link
          href="/painel/marca"
          className="flex items-center justify-between gap-4 rounded-xl border border-borda bg-superficie px-4 py-3.5 transition-colors hover:bg-fundo"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-tinta">Complete a sua marca</span>
            <span className="mt-0.5 block text-xs text-tinta-suave">
              Logo, telefone e documento no topo do orçamento. É o que faz o cliente confiar antes
              de ler o preço.
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-lg text-tinta-suave">
            &rsaquo;
          </span>
        </Link>
      )}

      {/* Estado vazio — as telas de orçamento entram na Fase 2, etapas C e E. */}
      <div className="flex flex-col items-center rounded-xl border border-dashed border-borda bg-superficie px-6 py-12 text-center">
        {/* O símbolo sozinho, bem apagado: preenche o vazio sem competir com
            a ação. Aqui pode — é tela do prestador, não do cliente. */}
        <SimboloFechaObra className="mb-4 size-11 text-tinta-suave/25" />

        <h2 className="text-base font-semibold text-tinta">Nenhum orçamento ainda</h2>
        <p className="mt-1 max-w-sm text-sm text-tinta-suave">
          Em breve você vai montar um orçamento em 3 minutos, baixar o PDF e mandar o link para o
          cliente aceitar pelo celular.
        </p>

        <div className="mt-5 flex flex-col items-center">
          <BotaoNovoOrcamento />

          <Link
            href="/painel/documento-teste"
            className="mt-4 text-sm font-medium text-tinta-suave underline underline-offset-4 hover:text-tinta"
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
