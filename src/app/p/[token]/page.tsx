import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { linkWhatsApp } from '@/modules/orcamentos/mensagem-whatsapp'
import { somar } from '@/modules/orcamentos/calculos'
import { Aceite } from '@/modules/publico/componentes/aceite'
import { Proposta } from '@/modules/publico/componentes/proposta'
import { RegistrarVisualizacao } from '@/modules/publico/componentes/registrar-visualizacao'
import { carregarOrcamentoPublico } from '@/modules/publico/consultas'

/** A página é sempre dinâmica: o conteúdo muda quando o prestador edita. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const publico = await carregarOrcamentoPublico(token)

  if (!publico) return { title: 'Orçamento não encontrado' }

  // Sem valor no título nem na descrição: é o que aparece na prévia do link no
  // WhatsApp, e vale a mesma regra da mensagem — o número não pode chegar
  // antes do escopo. Ver mensagem-whatsapp.ts.
  return {
    title: `${publico.rascunho.titulo || 'Orçamento'} · ${publico.empresa.nome}`,
    description: `Orçamento nº ${String(publico.numero).padStart(3, '0')} de ${publico.empresa.nome}.`,
    robots: { index: false, follow: false },
  }
}

export default async function PaginaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const publico = await carregarOrcamentoPublico(token)

  if (!publico) notFound()

  const contatoWhatsApp = linkWhatsApp(
    publico.telefonePrestador,
    `Oi! Recebi o orçamento nº ${String(publico.numero).padStart(3, '0')} e queria falar sobre ele.`,
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-5 sm:py-10">
      <RegistrarVisualizacao token={publico.token} />

      {publico.expirado && (
        <div className="mb-4 rounded-xl border border-atencao/40 bg-atencao/10 px-4 py-4">
          <p className="text-sm font-semibold text-atencao-forte">Este orçamento venceu</p>
          <p className="mt-1 text-sm text-atencao-forte">
            O prazo de validade passou, então os valores abaixo podem não valer mais. Fale com{' '}
            {publico.nomePrestador || 'o prestador'} para receber uma proposta atualizada.
          </p>
          <a
            href={contatoWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-atencao-forte px-4 text-sm font-medium text-white"
          >
            Pedir orçamento atualizado
          </a>
        </div>
      )}

      <Proposta publico={publico} />

      <Aceite
        token={publico.token}
        total={somar(publico.rascunho.itens)}
        nomeCliente={publico.cliente?.nome ?? ''}
        enderecoCliente={publico.cliente?.endereco ?? ''}
        linkDuvida={contatoWhatsApp}
        nomePrestador={publico.nomePrestador}
        expirado={publico.expirado}
        jaAceito={publico.status === 'aceito'}
        aceitoEm={publico.respondidoEm}
      />

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={`/api/p/${publico.token}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-lg border border-borda bg-superficie text-sm font-medium text-tinta"
        >
          Ver em PDF
        </a>
      </div>

      <footer className="mt-6 px-1 pb-8 text-center">
        <p className="text-xs text-tinta-suave">
          {publico.empresa.nome}
          {publico.empresa.telefone && ` · ${publico.empresa.telefone}`}
        </p>
        <p className="mt-2 text-[11px] text-tinta-suave/70">Orçamento gerado no FechaObra</p>
      </footer>
    </main>
  )
}
