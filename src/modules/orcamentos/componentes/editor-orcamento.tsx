'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Alerta } from '@/componentes/ui/alerta'
import { Botao } from '@/componentes/ui/botao'
import { Campo } from '@/componentes/ui/campo'
import { Dialogo } from '@/componentes/ui/dialogo'
import type { EmpresaDocumento } from '@/modules/documento/tipos'
import type { Cliente } from '@/modules/clientes/tipos'

import {
  buscarTextosPadrao,
  enviarOrcamento,
  salvarItemNaBiblioteca,
  salvarRascunho,
} from '../acoes'
import {
  avisosDePacote,
  dataDeValidade,
  formatarDataCurta,
  pacotesDerivados,
  pendenciasParaFinalizar,
  usaPacotes,
} from '../calculos'
import { TIPOS_SERVICO, VALIDADE_PADRAO_DIAS } from '../constantes'
import type { ItemBiblioteca, ItemEditor, Pacote, RascunhoOrcamento } from '../tipos'

import { DialogoBiblioteca } from './dialogo-biblioteca'
import { DialogoEnvio } from './dialogo-envio'
import { EditorItens } from './editor-itens'
import { PainelPacotes } from './painel-pacotes'
import { PreviewOrcamento } from './preview-orcamento'
import { SeletorCliente } from './seletor-cliente'

const ESPERA_AUTOSAVE = 1200

function novoItem(): ItemEditor {
  return {
    id: crypto.randomUUID(),
    descricao: '',
    quantidade: '1',
    unidade: 'un',
    valorUnitario: '',
    tipo: 'mao_de_obra',
    pacote: 'essencial',
  }
}

type Salvamento = 'parado' | 'salvando' | 'salvo' | 'erro'

export function EditorOrcamento({
  inicial,
  clientes,
  biblioteca,
  empresa,
  urlBase,
}: {
  inicial: RascunhoOrcamento
  clientes: Cliente[]
  biblioteca: ItemBiblioteca[]
  empresa: EmpresaDocumento
  /** URL pública da aplicação, resolvida no servidor. */
  urlBase: string
}) {
  const [rascunho, setRascunho] = useState(inicial)
  const [itensBiblioteca, setItensBiblioteca] = useState(biblioteca)
  const [bibliotecaAberta, setBibliotecaAberta] = useState(false)
  const [salvamento, setSalvamento] = useState<Salvamento>('parado')
  const [aviso, setAviso] = useState('')
  const [substituirTextos, setSubstituirTextos] = useState(false)
  const [previewAberto, setPreviewAberto] = useState(false)
  const [envio, setEnvio] = useState<{ token: string; reenvio: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Assinatura do que já está gravado. Sem isso o autosave dispararia a cada
  // render e reescreveria a tabela de itens à toa.
  const salvo = useRef(JSON.stringify(inicial))

  const alterar = useCallback(<C extends keyof RascunhoOrcamento>(campo: C, valor: RascunhoOrcamento[C]) => {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
  }, [])

  // ---- autosave ------------------------------------------------------------
  useEffect(() => {
    const assinatura = JSON.stringify(rascunho)
    if (assinatura === salvo.current) return

    const relogio = setTimeout(async () => {
      setSalvamento('salvando')
      const resposta = await salvarRascunho(rascunho)

      if (!resposta.ok) {
        setSalvamento('erro')
        return
      }

      salvo.current = assinatura
      setSalvamento('salvo')
      if (resposta.dataValidade) {
        setRascunho((atual) =>
          atual.dataValidade === resposta.dataValidade
            ? atual
            : { ...atual, dataValidade: resposta.dataValidade! },
        )
      }
    }, ESPERA_AUTOSAVE)

    return () => clearTimeout(relogio)
  }, [rascunho])

  // ---- textos do seed ------------------------------------------------------
  async function escolherTipoServico(tipo: string) {
    alterar('tipoServico', tipo)
    if (!tipo) return

    const textos = await buscarTextosPadrao(tipo)
    if (!textos) return

    const temTexto =
      rascunho.textoEscopo || rascunho.textoExclusoes || rascunho.textoGarantia || rascunho.textoCondicoesPagamento

    // Não sobrescreve trabalho: se já há texto editado, só troca mediante
    // confirmação. Perder um escopo ajustado à mão seria imperdoável.
    if (temTexto && !substituirTextos) {
      setAviso(
        'Você já editou os textos. Marque “substituir textos ao trocar de serviço” se quiser trazer os modelos deste tipo.',
      )
      return
    }

    setAviso('')
    setRascunho((atual) => ({
      ...atual,
      textoEscopo: textos.escopo,
      textoExclusoes: textos.exclusoes,
      textoGarantia: textos.garantia,
      textoCondicoesPagamento: textos.condicoes,
    }))
  }

  // ---- itens ---------------------------------------------------------------
  const mudarItem = useCallback((id: string, campo: keyof ItemEditor, valor: string) => {
    setRascunho((atual) => ({
      ...atual,
      itens: atual.itens.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)),
    }))
  }, [])

  const removerItem = useCallback((id: string) => {
    setRascunho((atual) => ({ ...atual, itens: atual.itens.filter((i) => i.id !== id) }))
  }, [])

  const reordenarItens = useCallback((itens: ItemEditor[]) => {
    setRascunho((atual) => ({ ...atual, itens }))
  }, [])

  const adicionarItem = useCallback(() => {
    setRascunho((atual) => ({ ...atual, itens: [...atual.itens, novoItem()] }))
  }, [])

  async function guardarNaBiblioteca(item: ItemEditor) {
    const resposta = await salvarItemNaBiblioteca(item)
    if (!resposta.ok || !resposta.item) {
      setAviso(resposta.erro ?? 'Não consegui guardar o item.')
      return
    }

    const guardado = resposta.item
    setItensBiblioteca((atual) => [
      guardado,
      ...atual.filter((i) => i.id !== guardado.id),
    ])
    setAviso(`“${guardado.descricao}” guardado na biblioteca.`)
  }

  function usarDaBiblioteca(item: ItemBiblioteca) {
    setRascunho((atual) => ({
      ...atual,
      itens: [
        ...atual.itens,
        {
          id: crypto.randomUUID(),
          descricao: item.descricao,
          quantidade: '1',
          unidade: item.unidade,
          valorUnitario: String(item.valorUnitario).replace('.', ','),
          tipo: item.tipo,
          pacote: 'essencial',
        },
      ],
    }))
    setBibliotecaAberta(false)
  }

  // ---- pacotes -------------------------------------------------------------
  const mudarPacote = useCallback(
    (nivel: Pacote, campo: 'rotulo' | 'descricao', valor: string) => {
      setRascunho((atual) => ({
        ...atual,
        pacotes: atual.pacotes.map((p) => (p.nivel === nivel ? { ...p, [campo]: valor } : p)),
      }))
    },
    [],
  )

  const destacarPacote = useCallback((nivel: Pacote) => {
    setRascunho((atual) => ({
      ...atual,
      pacotes: atual.pacotes.map((p) => ({ ...p, destaque: p.nivel === nivel })),
    }))
  }, [])

  // ---- envio ---------------------------------------------------------------
  async function enviar() {
    setEnviando(true)
    try {
      // Força a gravação do que ainda não subiu: o cliente vai abrir o link em
      // segundos, e um item digitado há meio segundo não pode ficar de fora.
      await salvarRascunho(rascunho)
      salvo.current = JSON.stringify(rascunho)

      const resposta = await enviarOrcamento(rascunho.id)
      if (!resposta.ok || !resposta.token) {
        setAviso(resposta.erro ?? 'Não consegui enviar.')
        return
      }

      setRascunho((atual) =>
        atual.status === 'rascunho' ? { ...atual, status: 'enviado' } : atual,
      )
      setEnvio({ token: resposta.token, reenvio: Boolean(resposta.jaEstavaEnviado) })
    } finally {
      setEnviando(false)
    }
  }

  // ---- validade ------------------------------------------------------------
  const dias = Number(rascunho.validadeDias) || VALIDADE_PADRAO_DIAS
  const validadeVisivel = formatarDataCurta(dataDeValidade(dias))

  const pendencias = pendenciasParaFinalizar(rascunho.clienteId, rascunho.itens)
  const comPacotes = usaPacotes(rascunho.itens)
  const avisosPacote = comPacotes
    ? avisosDePacote(pacotesDerivados(rascunho.itens, rascunho.pacotes))
    : []
  const clienteSelecionado = clientes.find((c) => c.id === rascunho.clienteId) ?? null

  const preview = (
    <PreviewOrcamento rascunho={rascunho} cliente={clienteSelecionado} empresa={empresa} />
  )

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-6">
    <div className="flex flex-col gap-6">
      <IndicadorSalvamento estado={salvamento} />

      {aviso && <Alerta tom="info">{aviso}</Alerta>}

      <section className="flex flex-col gap-4">
        <SeletorCliente
          clientes={clientes}
          clienteId={rascunho.clienteId}
          aoSelecionar={(cliente) => {
            setRascunho((atual) => ({
              ...atual,
              clienteId: cliente?.id ?? null,
              // O endereço do cliente costuma ser o local do serviço. Preenche
              // se estiver vazio, sem sobrescrever o que a pessoa digitou.
              localServico: atual.localServico || cliente?.endereco || '',
            }))
          }}
        />

        <Campo
          rotulo="Título do orçamento"
          name="titulo"
          value={rascunho.titulo}
          onChange={(e) => alterar('titulo', e.target.value)}
          placeholder="Ex.: Reforma de banheiro social"
          dica="Aparece em destaque, logo abaixo do cabeçalho."
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipoServico" className="text-sm font-medium text-tinta">
            Tipo de serviço
          </label>
          <select
            id="tipoServico"
            value={rascunho.tipoServico}
            onChange={(e) => escolherTipoServico(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
          >
            <option value="">Escolher…</option>
            {TIPOS_SERVICO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
          <p className="text-xs text-tinta-suave">
            Escolher o tipo traz escopo, exclusões, garantia e condições prontos — todos editáveis.
          </p>

          <label className="mt-1 flex items-start gap-2 text-xs text-tinta-suave">
            <input
              type="checkbox"
              checked={substituirTextos}
              onChange={(e) => setSubstituirTextos(e.target.checked)}
              className="mt-0.5 size-4"
            />
            Substituir os textos ao trocar de serviço
          </label>
        </div>

        <Campo
          rotulo="Local do serviço"
          name="localServico"
          value={rascunho.localServico}
          onChange={(e) => alterar('localServico', e.target.value)}
          placeholder="Endereço da obra"
        />
      </section>

      <EditorItens
        itens={rascunho.itens}
        aoMudar={mudarItem}
        aoRemover={removerItem}
        aoReordenar={reordenarItens}
        aoAdicionar={adicionarItem}
        aoAbrirBiblioteca={() => setBibliotecaAberta(true)}
        aoGuardarNaBiblioteca={guardarNaBiblioteca}
      />

      <PainelPacotes
        itens={rascunho.itens}
        pacotes={rascunho.pacotes}
        ativo={comPacotes}
        aoMudar={mudarPacote}
        aoDestacar={destacarPacote}
      />

      {avisosPacote.map((texto) => (
        <Alerta key={texto} tom="aviso">
          {texto}
        </Alerta>
      ))}

      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="validadeDias" className="text-sm font-medium text-tinta">
              Validade
            </label>
            <div className="flex items-center gap-2">
              <input
                id="validadeDias"
                value={rascunho.validadeDias}
                onChange={(e) => alterar('validadeDias', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="min-h-11 w-20 rounded-lg border border-borda bg-superficie px-3 text-base text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
              />
              <span className="text-sm text-tinta-suave">dias</span>
            </div>
            <p className="text-xs text-tinta-suave">
              Vale até <span className="font-medium text-tinta">{validadeVisivel}</span>
            </p>
          </div>

          <Campo
            rotulo="Prazo de execução"
            name="prazoExecucao"
            value={rascunho.prazoExecucao}
            onChange={(e) => alterar('prazoExecucao', e.target.value)}
            placeholder="Ex.: 18 dias corridos"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-tinta">Textos do orçamento</h2>

        <AreaTexto
          rotulo="O que está incluso"
          valor={rascunho.textoEscopo}
          aoMudar={(v) => alterar('textoEscopo', v)}
        />
        <AreaTexto
          rotulo="O que não está incluso"
          valor={rascunho.textoExclusoes}
          aoMudar={(v) => alterar('textoExclusoes', v)}
        />
        <AreaTexto
          rotulo="Garantia"
          valor={rascunho.textoGarantia}
          aoMudar={(v) => alterar('textoGarantia', v)}
        />
        <AreaTexto
          rotulo="Condições de pagamento"
          valor={rascunho.textoCondicoesPagamento}
          aoMudar={(v) => alterar('textoCondicoesPagamento', v)}
        />
        <AreaTexto
          rotulo="Observações"
          valor={rascunho.observacoes}
          aoMudar={(v) => alterar('observacoes', v)}
          linhas={3}
        />
      </section>

      {/*
        A barra é fixa e fica por cima do conteúdo. Sem esta folga, o último
        campo do editor ficaria embaixo dela e não dava para digitar. O
        pb-28 do AppShell cobre só a barra de navegação, não esta.
      */}
      <div className="h-20 lg:hidden" aria-hidden />

      {/*
        UMA barra, não dois flutuantes.

        Antes havia um botão fixo de "Ver prévia" (z-30) por cima da faixa de
        envio (z-20), ambos ancorados na base. Medido em viewport de 393px:
        em toda posição de rolagem, menos o fim absoluto, a prévia cobria o
        canto direito do "Enviar orçamento" — 33% da largura do botão não
        recebia o toque, abria a prévia. No iPhone é pior: a área segura
        (~34px) levanta a prévia e a sobreposição passa a valer no fim também.

        Dois elementos fixos irmãos disputando a mesma âncora sempre voltam a
        colidir quando um deles mudar de tamanho. A correção é estrutural: os
        dois entram na MESMA linha flex. Enviar ocupa o espaço restante,
        prévia tem largura própria — não há como se sobreporem.
      */}
      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30
          border-t border-borda bg-superficie px-4 py-3
          lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:py-0
        "
      >
        {pendencias.length > 0 ? (
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-xs leading-snug text-tinta-suave lg:hidden">
              Falta {pendencias.join(' e ')}.
            </p>
            <div className="hidden flex-1 lg:block">
              <Alerta tom="aviso">
                Rascunho salvo. Para enviar falta {pendencias.join(' e ')}.
              </Alerta>
            </div>
            <BotaoPrevia aoAbrir={() => setPreviewAberto(true)} />
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            <BotaoPrevia aoAbrir={() => setPreviewAberto(true)} />
            {/*
              min-w-0 impede que o texto do botão force a linha a crescer e
              empurre a prévia para fora da tela em aparelho estreito.
            */}
            <Botao
              type="button"
              tamanho="grande"
              onClick={enviar}
              disabled={enviando}
              className="min-w-0 flex-1"
            >
              {enviando
                ? 'Preparando…'
                : rascunho.status === 'rascunho'
                  ? 'Enviar orçamento'
                  : 'Mandar de novo'}
            </Botao>
          </div>
        )}
      </div>

      <DialogoBiblioteca
        aberto={bibliotecaAberta}
        aoFechar={() => setBibliotecaAberta(false)}
        itens={itensBiblioteca}
        aoEscolher={usarDaBiblioteca}
        aoRemover={(id) => setItensBiblioteca((atual) => atual.filter((i) => i.id !== id))}
      />

      {envio && (
        <DialogoEnvio
          aberto
          aoFechar={() => setEnvio(null)}
          rascunho={rascunho}
          cliente={clienteSelecionado}
          empresa={empresa}
          token={envio.token}
          reenvio={envio.reenvio}
          urlBase={urlBase}
        />
      )}

      <Dialogo
        aberto={previewAberto}
        aoFechar={() => setPreviewAberto(false)}
        titulo={`Orçamento nº ${String(rascunho.numero).padStart(3, '0')}`}
        descricao="É o documento que o cliente recebe."
      >
        <div className="h-[70dvh]">{preview}</div>
      </Dialogo>
    </div>

      {/* Desktop: o documento acompanha a rolagem do editor. */}
      <aside className="sticky top-6 hidden h-[calc(100dvh-6rem)] lg:block">{preview}</aside>
    </div>
  )
}

/**
 * A prévia é ação secundária: no celular o PDF não cabe ao lado, então ela
 * abre em tela cheia. No desktop o documento já está fixo na coluna da
 * direita, e o botão não faz sentido — por isso `lg:hidden`.
 */
function BotaoPrevia({ aoAbrir }: { aoAbrir: () => void }) {
  return (
    <Botao
      type="button"
      variante="secundario"
      tamanho="grande"
      onClick={aoAbrir}
      className="shrink-0 lg:hidden"
    >
      Ver prévia
    </Botao>
  )
}

function AreaTexto({
  rotulo,
  valor,
  aoMudar,
  linhas = 6,
}: {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  linhas?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-tinta">{rotulo}</label>
      <textarea
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        rows={linhas}
        className="w-full rounded-lg border border-borda bg-superficie px-3 py-2.5 text-base leading-relaxed text-tinta outline-none transition-colors focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
    </div>
  )
}

function IndicadorSalvamento({ estado }: { estado: Salvamento }) {
  const texto = {
    parado: 'Tudo salvo',
    salvando: 'Salvando…',
    salvo: 'Salvo',
    erro: 'Não consegui salvar — vou tentar de novo na próxima alteração',
  }[estado]

  return (
    <p
      aria-live="polite"
      className={estado === 'erro' ? 'text-xs font-medium text-perigo' : 'text-xs text-tinta-suave'}
    >
      {texto}
    </p>
  )
}
