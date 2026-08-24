'use client'

import { useState } from 'react'

import { Dialogo } from '@/componentes/ui/dialogo'

import { gerarTextosDoOrcamento } from '../acoes-ia'
import type { ItemEditor, RascunhoOrcamento } from '../tipos'

type Chave = 'textoEscopo' | 'textoExclusoes' | 'textoGarantia' | 'textoCondicoesPagamento'

const CAMPOS: {
  chave: Chave
  rotulo: string
  de: 'escopo' | 'exclusoes' | 'garantia' | 'condicoes'
}[] = [
  { chave: 'textoEscopo', rotulo: 'O que está incluso', de: 'escopo' },
  { chave: 'textoExclusoes', rotulo: 'O que não está incluso', de: 'exclusoes' },
  { chave: 'textoGarantia', rotulo: 'Garantia', de: 'garantia' },
  { chave: 'textoCondicoesPagamento', rotulo: 'Condições de pagamento', de: 'condicoes' },
]

/**
 * Escrever escopo, exclusões, garantia e condições a partir dos itens.
 *
 * ===========================================================================
 * NADA É SUBSTITUÍDO SEM O PRESTADOR VER O QUE VAI PERDER
 * ===========================================================================
 * Estes quatro campos costumam já ter conteúdo — vêm dos textos padrão do
 * nicho, e muitos prestadores ajustam à mão. Sobrescrever tudo de uma vez
 * apagaria trabalho, e trabalho apagado por um botão de IA é o tipo de coisa
 * que faz a pessoa desligar o recurso e não voltar.
 *
 * Por isso cada campo tem seu próprio interruptor, e o que já está escrito
 * aparece marcado como "vai substituir". O padrão é aplicar só os campos
 * VAZIOS: é o que a pessoa quase sempre quer, e é o único caso em que não há
 * nada a perder.
 * ===========================================================================
 *
 * Os textos vêm sem valores e sem prazos numéricos — o schema não tem campo de
 * preço, e `gerar-textos.ts` neutraliza mês, ano, dia e percentual que
 * escaparem. Garantia de "12 meses" que o prestador nunca prometeu é cláusula
 * que o cliente pode cobrar depois.
 */
export function DialogoTextosIa({
  aberto,
  aoFechar,
  rascunho,
  aoAplicar,
}: {
  aberto: boolean
  aoFechar: () => void
  rascunho: RascunhoOrcamento
  aoAplicar: (mudancas: Partial<Record<Chave, string>>) => void
}) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [textos, setTextos] = useState<Record<string, string> | null>(null)
  const [ligados, setLigados] = useState<Set<Chave>>(new Set())

  const itensComDescricao = rascunho.itens.filter((i: ItemEditor) => i.descricao.trim())

  function limpar() {
    setTextos(null)
    setLigados(new Set())
    setErro('')
  }

  async function gerar() {
    setErro('')
    setGerando(true)
    try {
      const r = await gerarTextosDoOrcamento({
        tipoServico: rascunho.tipoServico,
        titulo: rascunho.titulo,
        itens: itensComDescricao.map((i) => ({ descricao: i.descricao })),
      })
      if (!r.ok) {
        setErro(r.mensagem)
        return
      }
      setTextos(r.textos as unknown as Record<string, string>)
      // Só os vazios vêm ligados: onde não há nada a perder.
      setLigados(new Set(CAMPOS.filter((c) => !rascunho[c.chave].trim()).map((c) => c.chave)))
    } catch {
      setErro('Não consegui gerar agora.')
    } finally {
      setGerando(false)
    }
  }

  function aplicar() {
    if (!textos) return
    const mudancas: Partial<Record<Chave, string>> = {}
    for (const campo of CAMPOS) {
      if (ligados.has(campo.chave) && textos[campo.de]?.trim()) {
        mudancas[campo.chave] = textos[campo.de].trim()
      }
    }
    aoAplicar(mudancas)
    limpar()
    aoFechar()
  }

  const quantos = ligados.size

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => {
        limpar()
        aoFechar()
      }}
      titulo="Escrever os textos"
      descricao={textos ? undefined : 'A partir dos itens que você já lançou.'}
    >
      {!textos && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-tinta-suave">
            {itensComDescricao.length === 0
              ? 'Inclua ao menos um item antes: sem saber o que foi contratado, o texto sai genérico — e texto genérico num orçamento é pior que campo vazio.'
              : `Vou usar os ${itensComDescricao.length} ${itensComDescricao.length === 1 ? 'item' : 'itens'} do orçamento para escrever escopo, exclusões, garantia e condições.`}
          </p>

          <p className="rounded-lg bg-fundo px-3 py-2 text-xs leading-relaxed text-tinta-meta">
            São enviados para um serviço de IA o tipo de serviço, o título e a descrição de cada
            item. Não saem quantidades, valores, nem dados do cliente ou da sua empresa.
          </p>

          {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}

          <button
            type="button"
            onClick={gerar}
            disabled={gerando || itensComDescricao.length === 0}
            className="flex min-h-13 items-center justify-center rounded-xl bg-tinta text-base font-semibold text-white disabled:opacity-50"
          >
            {gerando ? 'Escrevendo…' : 'Escrever'}
          </button>
        </div>
      )}

      {textos && (
        <div className="flex flex-col gap-3">
          <p className="rounded-lg border-l-2 border-atencao bg-atencao/10 px-3 py-2 text-xs leading-relaxed text-atencao-forte">
            <span className="font-semibold">Escrito por IA.</span> Leia antes de enviar — o cliente
            vai cobrar o que estiver aqui.
          </p>

          <ul className="flex flex-col gap-2">
            {CAMPOS.map((campo) => {
              const conteudo = textos[campo.de]?.trim() ?? ''
              if (!conteudo) return null
              const ligado = ligados.has(campo.chave)
              const jaTinha = Boolean(rascunho[campo.chave].trim())
              return (
                <li key={campo.chave} className="rounded-lg border border-borda bg-superficie">
                  <button
                    type="button"
                    onClick={() =>
                      setLigados((atual) => {
                        const proximo = new Set(atual)
                        if (proximo.has(campo.chave)) proximo.delete(campo.chave)
                        else proximo.add(campo.chave)
                        return proximo
                      })
                    }
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
                        ligado
                          ? 'border-tinta bg-tinta text-white'
                          : 'border-borda-controle text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-tinta">
                      {campo.rotulo}
                    </span>
                    {jaTinha && (
                      <span className="shrink-0 text-[11px] font-semibold text-atencao-forte">
                        vai substituir
                      </span>
                    )}
                  </button>
                  <p
                    className={`border-t border-linha px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                      ligado ? 'text-tinta-leitura' : 'text-tinta-meta opacity-60'
                    }`}
                  >
                    {conteudo}
                  </p>
                </li>
              )
            })}
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTextos(null)}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-borda-controle bg-superficie text-sm font-semibold text-tinta"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={aplicar}
              disabled={quantos === 0}
              className="flex min-h-12 flex-[2] items-center justify-center rounded-xl bg-tinta text-sm font-semibold text-white disabled:opacity-50"
            >
              {quantos === 1 ? 'Usar 1 texto' : `Usar ${quantos} textos`}
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  )
}
