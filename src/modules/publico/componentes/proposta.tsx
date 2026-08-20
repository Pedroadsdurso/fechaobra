import { emMarcadores, formatarData } from '@/modules/documento/formatadores'
import { formatarMoeda } from '@/lib/utils'
import {
  pacotesDerivados,
  pacotesVisiveis,
  somar,
  totalDoItem,
  totalPorTipo,
  usaPacotes,
} from '@/modules/orcamentos/calculos'
import type { OrcamentoPublico } from '@/modules/publico/consultas'
import { rotuloDoServico } from '@/modules/publico/consultas'

/**
 * A proposta em HTML, para ler no celular.
 *
 * A ORDEM É DELIBERADA. Quem abre isto está decidindo gastar alguns milhares
 * de reais, no celular, provavelmente distraído. O escopo vem antes do valor
 * porque o número precisa chegar depois de a pessoa entender o que compra —
 * ao contrário de uma fatura, onde o valor é a informação principal. Exclusões
 * e garantia vêm logo depois, enquanto o preço ainda está fresco: é ali que a
 * dúvida "e se der problema?" aparece.
 *
 * ===========================================================================
 * A COR DO PRESTADOR ASSINA A ESTRUTURA, NUNCA O DINHEIRO
 * ===========================================================================
 * A cor entra na fita do topo, no selo de iniciais, na numeração das seções e
 * no selo "Minha indicação" — sinais de que o documento é dele. Ela NÃO entra
 * em valor, em total nem em texto corrido.
 *
 * O motivo é prático, não estético: a cor é escolhida pelo prestador e pode
 * ser qualquer coisa, inclusive um amarelo que some no branco. Preço ilegível
 * num orçamento é defeito grave, e não dá para testar todas as cores que os
 * prestadores vão escolher. Dinheiro é sempre tinta sobre papel.
 * ===========================================================================
 */

/**
 * Cabeçalho numerado de seção.
 *
 * O número é sequencial e calculado no render, não fixo: um orçamento sem
 * escopo ou sem pacotes não pode pular de 01 para 03.
 */
function TituloSecao({ numero, texto, cor }: { numero: number; texto: string; cor: string }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2">
      <span className="text-[11px] font-bold tabular-nums" style={{ color: cor }}>
        {String(numero).padStart(2, '0')}
      </span>
      <span className="text-xs font-bold tracking-[0.09em] text-tinta uppercase">{texto}</span>
    </h2>
  )
}

function Secao({ children }: { children: React.ReactNode }) {
  return <section className="border-t border-borda px-5 py-5">{children}</section>
}

/** Marcador quadrado: mais firme que o redondo, e some menos no celular. */
function Marcador() {
  return <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-tinta" />
}

function iniciais(nome: string) {
  const ignorar = new Set(['e', 'de', 'da', 'do', 'dos', 'das', '&', 'ltda', 'me', 'epp'])
  return nome
    .split(/\s+/)
    .filter((p) => p && !ignorar.has(p.toLowerCase().replace(/[.,]/g, '')))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Proposta({ publico }: { publico: OrcamentoPublico }) {
  const { rascunho, empresa, cliente } = publico
  const cor = empresa.corPrimaria || '#0B3D2E'

  const material = totalPorTipo(rascunho.itens, 'material')
  const maoDeObra = totalPorTipo(rascunho.itens, 'mao_de_obra')
  const total = somar(rascunho.itens)

  const comPacotes = usaPacotes(rascunho.itens)
  const pacotes = comPacotes
    ? pacotesVisiveis(pacotesDerivados(rascunho.itens, rascunho.pacotes)).filter((p) => p.valor > 0)
    : []

  /*
    O design desenha escopo e exclusões como listas de marcadores curtos, e é
    assim que fica melhor — quando o texto É uma enumeração.
    Mas os textos padrão do seed são prosa corrida, e `emMarcadores` devolve
    um item único quando não encontra ponto-e-vírgula. Renderizar isso como
    lista produz um marcador solitário com um paredão de texto do lado, que é
    pior do que o parágrafo que havia antes.

    Então: lista quando há enumeração de verdade (2+ itens), parágrafo quando
    não há. O prestador que escreve em tópicos ganha os marcadores; o que
    escreve corrido continua legível.
  */
  const escopo = rascunho.textoEscopo ? emMarcadores(rascunho.textoEscopo) : null
  const exclusoes = rascunho.textoExclusoes ? emMarcadores(rascunho.textoExclusoes) : null
  const escopoEmLista = (escopo?.itens.length ?? 0) > 1
  const exclusoesEmLista = (exclusoes?.itens.length ?? 0) > 1

  // A numeração corre conforme as seções que de fato existem.
  let n = 0
  const proximo = () => ++n

  const numEscopo = escopo ? proximo() : 0
  const numItens = proximo()
  const numPacotes = pacotes.length > 1 ? proximo() : 0
  const numExclusoes = exclusoes ? proximo() : 0
  const numCondicoes = proximo()

  const assinatura = [empresa.responsavel, empresa.cnpjCpf && `CNPJ/CPF ${empresa.cnpjCpf}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="overflow-hidden rounded-2xl border border-borda bg-superficie">
      {/* Fita da cor do prestador: a primeira coisa que diz de quem é isto. */}
      <div className="h-[5px]" style={{ backgroundColor: cor }} />

      <header className="flex items-start gap-3 px-5 pt-5 pb-4">
        {empresa.logoUrl ? (
          // URL assinada do Storage, expira. next/image tentaria revalidar um
          // host que já morreu — a tag nativa é o certo aqui.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresa.logoUrl}
            alt={empresa.nome}
            className="size-12 shrink-0 rounded-[10px] object-contain"
          />
        ) : (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-[10px] text-[17px] font-extrabold tracking-[0.02em] text-white"
            style={{ backgroundColor: cor }}
          >
            {iniciais(empresa.nome)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug font-bold text-tinta">{empresa.nome}</p>
          {assinatura && <p className="mt-0.5 text-xs text-tinta-meta">{assinatura}</p>}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: cor }}>
            Orçamento
          </p>
          <p className="mt-px text-[19px] font-extrabold tabular-nums text-tinta">
            Nº {String(publico.numero).padStart(3, '0')}
          </p>
        </div>
      </header>

      <div className="px-5 pb-5">
        <h1 className="text-[21px] leading-tight font-bold text-pretty text-tinta">
          {rascunho.titulo || 'Orçamento de serviço'}
        </h1>
        {rascunho.tipoServico && (
          <p className="mt-1 text-[13px] text-tinta-meta">{rotuloDoServico(rascunho.tipoServico)}</p>
        )}

        {(cliente || rascunho.localServico) && (
          <dl className="mt-3.5 grid gap-3 rounded-[10px] bg-fundo px-3.5 py-3 sm:grid-cols-2">
            {cliente && (
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-tinta-meta uppercase">
                  Para
                </dt>
                <dd className="mt-0.5 text-[13.5px] font-medium text-tinta">{cliente.nome}</dd>
              </div>
            )}
            {rascunho.localServico && (
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-tinta-meta uppercase">
                  Local do serviço
                </dt>
                <dd className="mt-0.5 text-[13.5px] font-medium text-tinta">
                  {rascunho.localServico}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* --- O que está incluso, ANTES do valor ------------------------- */}
      {escopo && (
        <Secao>
          <TituloSecao numero={numEscopo} texto="O que está incluso" cor={cor} />
          {escopo.abertura && (
            <p className="mb-2.5 text-[14.5px] font-medium text-tinta">{escopo.abertura}</p>
          )}
          {escopoEmLista ? (
            <ul className="flex flex-col gap-2">
              {escopo.itens.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[14.5px] leading-normal text-tinta-leitura"
                >
                  <Marcador />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px] leading-relaxed whitespace-pre-line text-tinta-leitura">
              {rascunho.textoEscopo}
            </p>
          )}
        </Secao>
      )}

      {/* --- Itens e valor ---------------------------------------------- */}
      <Secao>
        <TituloSecao numero={numItens} texto="Itens do orçamento" cor={cor} />

        <ul>
          {rascunho.itens
            .filter((i) => i.descricao.trim())
            .map((item) => (
              <li
                key={item.id}
                className="flex gap-3 border-b border-linha py-2.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] leading-snug text-tinta">{item.descricao}</p>
                  <p className="mt-0.5 text-xs text-tinta-meta">
                    {item.quantidade} {item.unidade} ·{' '}
                    {item.tipo === 'material' ? 'Material' : 'Mão de obra'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                  {formatarMoeda(totalDoItem(item))}
                </p>
              </li>
            ))}
        </ul>

        <dl className="mt-2 flex flex-col gap-1 border-t border-borda pt-2.5 text-[13px] text-tinta-meta">
          <div className="flex justify-between">
            <dt>Material</dt>
            <dd className="tabular-nums">{formatarMoeda(material)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Mão de obra</dt>
            <dd className="tabular-nums">{formatarMoeda(maoDeObra)}</dd>
          </div>
        </dl>

        {/*
          Tinta, não a cor do prestador. Ver a nota no topo do arquivo: o total
          é a informação que não pode falhar de legibilidade em nenhuma cor.
        */}
        <div className="mt-3 flex items-center justify-between rounded-[10px] bg-tinta px-4 py-3.5 text-white">
          <div>
            <p className="text-[13px] font-semibold">Total</p>
            <p className="mt-px text-[11px] text-white/65">material e mão de obra</p>
          </div>
          <p className="text-2xl font-extrabold tabular-nums">{formatarMoeda(total)}</p>
        </div>
      </Secao>

      {/* --- Opções de contratação -------------------------------------- */}
      {pacotes.length > 1 && (
        <Secao>
          <TituloSecao numero={numPacotes} texto="Opções de contratação" cor={cor} />
          <p className="mb-3.5 text-[13px] leading-normal text-tinta-meta">
            A mão de obra é a mesma nas três opções — muda o que entra de material e acabamento.
          </p>
          <ul className="flex flex-col gap-3">
            {pacotes.map((pacote) => (
              <li
                key={pacote.nivel}
                className="relative rounded-xl px-4 py-3.5"
                style={{
                  borderColor: pacote.destaque ? cor : 'var(--color-borda-forte)',
                  borderWidth: pacote.destaque ? 2 : 1,
                }}
              >
                {pacote.destaque && (
                  <span
                    className="absolute -top-[9px] left-3.5 rounded-full px-2.5 py-[3px] text-[10px] font-extrabold tracking-[0.08em] text-white uppercase"
                    style={{ backgroundColor: cor }}
                  >
                    Minha indicação
                  </span>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-bold text-tinta">{pacote.rotulo}</p>
                  <p className="text-[17px] font-extrabold tabular-nums text-tinta">
                    {formatarMoeda(pacote.valor)}
                  </p>
                </div>
                <p className="mt-1 text-[13px] leading-normal text-tinta-meta">
                  {pacote.descricao}
                </p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* --- O que não está incluso -------------------------------------- */}
      {exclusoes && (
        <Secao>
          <TituloSecao numero={numExclusoes} texto="O que não está incluso" cor={cor} />
          {exclusoes.abertura && (
            <p className="mb-2.5 text-[14.5px] font-medium text-tinta">{exclusoes.abertura}</p>
          )}
          {exclusoesEmLista ? (
            <ul className="flex flex-col gap-2">
              {exclusoes.itens.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[14.5px] leading-normal text-tinta-leitura"
                >
                  {/* Travessão, não bolinha: o que NÃO entra não deve parecer
                      mais um item da lista do que entra. */}
                  <span aria-hidden className="shrink-0 font-semibold text-tinta-meta">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px] leading-relaxed whitespace-pre-line text-tinta-leitura">
              {rascunho.textoExclusoes}
            </p>
          )}
        </Secao>
      )}

      {/* --- Prazo, pagamento e garantia --------------------------------- */}
      <Secao>
        <TituloSecao numero={numCondicoes} texto="Prazo, pagamento e garantia" cor={cor} />
        <div className="flex flex-col gap-3.5">
          {rascunho.prazoExecucao && (
            <div>
              <p className="text-[13px] font-bold text-tinta">Prazo de execução</p>
              <p className="mt-0.5 text-sm leading-normal text-tinta-leitura">
                {rascunho.prazoExecucao}
              </p>
            </div>
          )}
          {rascunho.textoCondicoesPagamento && (
            <div>
              <p className="text-[13px] font-bold text-tinta">Condições de pagamento</p>
              <p className="mt-0.5 text-sm leading-normal whitespace-pre-line text-tinta-leitura">
                {rascunho.textoCondicoesPagamento}
              </p>
            </div>
          )}
          {rascunho.textoGarantia && (
            <div>
              <p className="text-[13px] font-bold text-tinta">Garantia</p>
              <p className="mt-0.5 text-sm leading-normal whitespace-pre-line text-tinta-leitura">
                {rascunho.textoGarantia}
              </p>
            </div>
          )}
          {rascunho.observacoes && (
            <p className="text-[13px] leading-normal text-tinta-meta">{rascunho.observacoes}</p>
          )}
        </div>
      </Secao>

      {rascunho.dataValidade && (
        <div className="border-t border-borda px-5 py-3.5 text-center">
          <p className="text-[13px] text-tinta-meta">
            Proposta válida até{' '}
            <strong className="font-bold text-tinta">{formatarData(rascunho.dataValidade)}</strong>
          </p>
        </div>
      )}
    </article>
  )
}
