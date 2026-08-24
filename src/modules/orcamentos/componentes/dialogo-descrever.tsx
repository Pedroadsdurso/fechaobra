'use client'

import { useState } from 'react'

import { Dialogo } from '@/componentes/ui/dialogo'
import { LIMITE_DESCRICAO } from '@/modules/ia/saneamento'

import { extrairItensDoTexto } from '../acoes-ia'
import type { ItemEditor } from '../tipos'

type Sugestao = { descricao: string; quantidade: number; unidade: string }

/**
 * Descrever o serviço falando, e receber as linhas separadas.
 *
 * ===========================================================================
 * A REVISÃO NÃO É CORTESIA, É O PRODUTO
 * ===========================================================================
 * O que volta da IA NÃO entra no orçamento sozinho. Aparece numa lista, cada
 * linha com uma marca, e o prestador escolhe o que aproveita.
 *
 * Duas razões. A primeira é o aviso que o produto deve: quem lê o orçamento
 * depois é um cliente decidindo gastar dinheiro, e o prestador precisa saber
 * quais linhas ele conferiu. A segunda é mais dura: o modelo erra unidade e
 * agrupamento com frequência suficiente para que "aceitar tudo" fosse um
 * desserviço — "os dois quartos" vira "2 un" quando devia ser "2 vb".
 *
 * O passo de revisão é o que transforma um palpite em rascunho útil.
 * ===========================================================================
 *
 * E o preço nunca vem preenchido: o schema mandado ao modelo não tem campo de
 * valor. Ver `modules/ia/extrair-itens.ts`.
 */
export function DialogoDescrever({
  aberto,
  aoFechar,
  tipoServico,
  aoAdicionar,
}: {
  aberto: boolean
  aoFechar: () => void
  tipoServico: string
  aoAdicionar: (itens: ItemEditor[]) => void
}) {
  const [texto, setTexto] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null)
  const [fora, setFora] = useState<Set<number>>(new Set())

  const restantes = LIMITE_DESCRICAO - texto.length

  function limpar() {
    setTexto('')
    setSugestoes(null)
    setFora(new Set())
    setErro('')
  }

  async function gerar() {
    setErro('')
    setGerando(true)
    try {
      const resposta = await extrairItensDoTexto({ tipoServico, descricao: texto })
      if (!resposta.ok) {
        setErro(resposta.mensagem)
        return
      }
      if (resposta.itens.length === 0) {
        setErro('Não achei nenhum serviço nessa descrição. Tente detalhar mais.')
        return
      }
      setSugestoes(resposta.itens)
      setFora(new Set())
    } catch {
      // exigirRecurso lança quando a conta não tem o recurso: a interface não
      // oferece o botão, então quem chega aqui montou a requisição na mão.
      setErro('Não consegui gerar agora.')
    } finally {
      setGerando(false)
    }
  }

  function confirmar() {
    if (!sugestoes) return
    const escolhidas = sugestoes.filter((_, i) => !fora.has(i))
    aoAdicionar(
      escolhidas.map((s) => ({
        id: crypto.randomUUID(),
        descricao: s.descricao,
        quantidade: String(s.quantidade).replace('.', ','),
        unidade: s.unidade,
        // Vazio de propósito. O preço é do prestador.
        valorUnitario: '',
        // Mesmo padrão de novoItem(): o modelo não classifica material x mão de
        // obra, e chutar erraria na maioria — quem sabe é quem vai precificar.
        tipo: 'mao_de_obra' as const,
        pacote: 'essencial' as const,
      })),
    )
    limpar()
    aoFechar()
  }

  const escolhidas = sugestoes ? sugestoes.length - fora.size : 0

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => {
        limpar()
        aoFechar()
      }}
      titulo="Descrever o serviço"
      descricao={sugestoes ? undefined : 'Escreva como você falaria. Eu separo em itens.'}
    >
      {!sugestoes && (
        <div className="flex flex-col gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_DESCRICAO))}
            rows={5}
            autoFocus
            placeholder="Ex.: quebrar o piso do banheiro, assentar porcelanato uns 12m², trocar o vaso e o chuveiro"
            className="rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none focus:border-tinta focus:ring-2 focus:ring-tinta/15"
          />
          <span className="self-end text-xs text-tinta-meta">{restantes} caracteres</span>

          {/*
            O aviso vem ANTES de gerar, não depois. O campo é livre: se a pessoa
            escrever o nome ou o endereço do cliente aqui, isso vai junto — e
            ela tem que saber disso enquanto digita, não num rodapé.
          */}
          <p className="rounded-lg bg-fundo px-3 py-2 text-xs leading-relaxed text-tinta-meta">
            O texto acima e o tipo de serviço são enviados para um serviço de IA para separar os
            itens. Nada mais sai daqui — nem cliente, nem endereço, nem valores.
          </p>

          {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}

          <button
            type="button"
            onClick={gerar}
            disabled={gerando || texto.trim().length < 10}
            className="flex min-h-13 items-center justify-center rounded-xl bg-tinta text-base font-semibold text-white disabled:opacity-50"
          >
            {gerando ? 'Separando…' : 'Separar em itens'}
          </button>
        </div>
      )}

      {sugestoes && (
        <div className="flex flex-col gap-3">
          <p className="rounded-lg border-l-2 border-atencao bg-atencao/10 px-3 py-2 text-xs leading-relaxed text-atencao-forte">
            <span className="font-semibold">Sugerido por IA.</span> Confira quantidade e unidade
            antes de usar. O valor de cada item fica com você.
          </p>

          <ul className="flex flex-col gap-1.5">
            {sugestoes.map((s, i) => {
              const dentro = !fora.has(i)
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      setFora((atual) => {
                        const proximo = new Set(atual)
                        if (proximo.has(i)) proximo.delete(i)
                        else proximo.add(i)
                        return proximo
                      })
                    }
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                      dentro
                        ? 'border-borda-controle bg-superficie'
                        : 'border-linha bg-fundo opacity-55'
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
                        dentro
                          ? 'border-tinta bg-tinta text-white'
                          : 'border-borda-controle text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-tinta">{s.descricao}</span>
                    <span className="shrink-0 text-xs font-medium text-tinta-meta">
                      {String(s.quantidade).replace('.', ',')} {s.unidade}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSugestoes(null)}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-borda-controle bg-superficie text-sm font-semibold text-tinta"
            >
              Reescrever
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={escolhidas === 0}
              className="flex min-h-12 flex-[2] items-center justify-center rounded-xl bg-tinta text-sm font-semibold text-white disabled:opacity-50"
            >
              {escolhidas === 1 ? 'Adicionar 1 item' : `Adicionar ${escolhidas} itens`}
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  )
}
