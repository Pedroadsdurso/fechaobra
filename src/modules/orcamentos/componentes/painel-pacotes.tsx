'use client'

import { cn, formatarMoeda } from '@/lib/utils'

import { pacotesDerivados } from '../calculos'
import type { ItemEditor, Pacote, PacoteEditor } from '../tipos'

/**
 * Edição dos três níveis de contratação.
 *
 * O valor não é digitado: sai da soma acumulada dos itens marcados em cada
 * nível. O que se edita aqui é o que a soma não sabe dizer — como o nível se
 * chama e o que ele entrega a mais. Sem essa frase, três números crescentes
 * empurram o cliente para o mais barato, que é o contrário do que os pacotes
 * existem para fazer.
 */
export function PainelPacotes({
  itens,
  pacotes,
  ativo,
  aoMudar,
  aoDestacar,
}: {
  itens: ItemEditor[]
  pacotes: PacoteEditor[]
  ativo: boolean
  aoMudar: (nivel: Pacote, campo: 'rotulo' | 'descricao', valor: string) => void
  aoDestacar: (nivel: Pacote) => void
}) {
  if (!ativo) {
    return (
      <section className="rounded-xl border border-dashed border-borda bg-superficie px-4 py-3">
        <p className="text-sm font-medium text-tinta">Como funciona</p>
        <p className="mt-1 text-xs text-tinta-suave">
          Marque itens como Recomendado ou Completo e o orçamento passa a oferecer três opções lado
          a lado, cada uma com sua justificativa. Deixando tudo em Essencial, o documento imprime só
          a tabela.
        </p>
      </section>
    )
  }

  const derivados = pacotesDerivados(itens, pacotes ?? [])

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="mt-0.5 text-xs text-tinta-suave">
          O valor vem da soma dos itens de cada nível. Escreva o que o cliente ganha ao subir —
          quem conhece o cliente é você, e a sua frase vai funcionar melhor que a nossa.
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        {derivados.map((pacote) => {
          const editavel = pacotes.find((p) => p.nivel === pacote.nivel)

          return (
            <div
              key={pacote.nivel}
              className={cn(
                'flex flex-1 flex-col gap-2 rounded-xl border bg-superficie p-3',
                pacote.destaque ? 'border-marca ring-1 ring-marca/20' : 'border-borda',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  value={editavel?.rotulo ?? ''}
                  onChange={(e) => aoMudar(pacote.nivel, 'rotulo', e.target.value)}
                  aria-label={`Nome do pacote ${pacote.nivel}`}
                  className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-1 text-sm font-semibold text-tinta outline-none hover:border-borda focus:border-marca focus:bg-superficie"
                />
                <span className="shrink-0 text-sm font-semibold text-tinta">
                  {formatarMoeda(pacote.valor)}
                </span>
              </div>

              <textarea
                value={editavel?.descricao ?? ''}
                onChange={(e) => aoMudar(pacote.nivel, 'descricao', e.target.value)}
                rows={4}
                aria-label={`Descrição do pacote ${pacote.nivel}`}
                placeholder="O que este nível entrega a mais"
                className="w-full rounded-lg border border-borda bg-superficie px-2.5 py-2 text-sm leading-relaxed text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
              />

              <p className="text-xs text-tinta-suave">
                {pacote.inclui.length === 0
                  ? 'Sem itens próprios neste nível'
                  : `+${pacote.inclui.length} ${pacote.inclui.length === 1 ? 'item' : 'itens'} entram aqui`}
              </p>

              {/* Rádio, não checkbox: o banco só aceita um destaque por
                  orçamento (índice único parcial), então a interface precisa
                  deixar isso óbvio em vez de deixar marcar dois e falhar. */}
              <label className="flex items-center gap-2 text-xs text-tinta-suave">
                <input
                  type="radio"
                  name="pacote-destaque"
                  checked={pacote.destaque}
                  onChange={() => aoDestacar(pacote.nivel)}
                  className="size-4"
                />
                Destacar no documento
              </label>
            </div>
          )
        })}
      </div>
    </section>
  )
}
