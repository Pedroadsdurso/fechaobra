import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { listarClientes } from '@/modules/clientes/consultas'
import { checkoutDoRecurso } from '@/modules/acesso/produtos'
import { temRecurso } from '@/modules/acesso/recursos'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { carregarMarca } from '@/modules/perfil/consultas'
import { urlBase } from '@/lib/url-base'
import { EditorOrcamento } from '@/modules/orcamentos/componentes/editor-orcamento'
import { carregarOrcamento, listarItensBiblioteca } from '@/modules/orcamentos/consultas'

export const metadata: Metadata = { title: 'Editar orçamento' }

export default async function PaginaOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [carregado, clientes, biblioteca, marca, temIaOrcamento, temIaTextos] = await Promise.all([
    carregarOrcamento(id),
    listarClientes(),
    listarItensBiblioteca(),
    carregarMarca(),
    // Decide se o botão APARECE. A tranca de verdade é o exigirRecurso na
    // Server Action — esconder botão é conveniência de interface, não guarda.
    temRecurso('ia_orcamento'),
    temRecurso('ia_textos'),
  ])

  /*
    O e-mail da conta, para o checkout já chegar preenchido. Resolvido AQUI, no
    servidor, e passado por prop: Client Component não lê sessão nem monta URL
    de configuração. Ver a regra no README.
  */
  const {
    data: { user },
  } = await (await criarClienteServidor()).auth.getUser()
  const email = user?.email ?? ''

  // O RLS já devolve vazio para orçamento de outro usuário; aqui isso vira 404.
  if (!carregado) notFound()

  return (
    <div className="flex flex-col gap-5">
      {/*
        Sem bloco de título aqui: a barra fixa do editor já mostra número e
        status, e o título do orçamento é um campo da seção 1. Repetir os três
        empurrava o primeiro campo para fora da primeira tela do celular.
      */}
      <EditorOrcamento
        inicial={carregado.rascunho}
        clientes={clientes}
        biblioteca={biblioteca}
        // Resolvida aqui, no servidor: no navegador as variáveis da Vercel
        // não existem. Ver lib/url-base.ts.
        urlBase={urlBase()}
        temIaOrcamento={temIaOrcamento}
        temIaTextos={temIaTextos}
        checkoutIaTextos={checkoutDoRecurso('ia_textos', email)}
        checkoutIaOrcamento={checkoutDoRecurso('ia_orcamento', email)}
        // A URL do logo já vem assinada daqui: o bucket é privado e o preview
        // roda no navegador, que não tem como assinar nada sozinho.
        empresa={{
          nome: marca?.nomeEmpresa?.trim() || 'Sua empresa',
          responsavel: marca?.responsavel || undefined,
          telefone: marca?.telefone || undefined,
          email: marca?.email || undefined,
          cnpjCpf: marca?.cnpjCpf || undefined,
          endereco: marca?.endereco || undefined,
          logoUrl: marca?.logoUrl || undefined,
          corPrimaria: marca?.corPrimaria,
        }}
      />
    </div>
  )
}
