import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { listarClientes } from '@/modules/clientes/consultas'
import { carregarMarca } from '@/modules/perfil/consultas'
import { urlBase } from '@/lib/url-base'
import { EditorOrcamento } from '@/modules/orcamentos/componentes/editor-orcamento'
import { carregarOrcamento, listarItensBiblioteca } from '@/modules/orcamentos/consultas'

export const metadata: Metadata = { title: 'Editar orçamento' }

export default async function PaginaOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [carregado, clientes, biblioteca, marca] = await Promise.all([
    carregarOrcamento(id),
    listarClientes(),
    listarItensBiblioteca(),
    carregarMarca(),
  ])

  // O RLS já devolve vazio para orçamento de outro usuário; aqui isso vira 404.
  if (!carregado) notFound()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium text-tinta-suave">
          Orçamento nº {String(carregado.rascunho.numero).padStart(3, '0')}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-tinta sm:text-2xl">
          {carregado.rascunho.titulo || 'Novo orçamento'}
        </h1>
      </div>

      <EditorOrcamento
        inicial={carregado.rascunho}
        clientes={clientes}
        biblioteca={biblioteca}
        // Resolvida aqui, no servidor: no navegador as variáveis da Vercel
        // não existem. Ver lib/url-base.ts.
        urlBase={urlBase()}
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
