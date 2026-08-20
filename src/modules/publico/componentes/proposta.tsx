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
 */

function Secao({
  titulo,
  cor,
  children,
}: {
  titulo: string
  cor: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-borda px-5 py-6">
      <h2 className="mb-3 text-base font-semibold" style={{ color: cor }}>
        {titulo}
      </h2>
      {children}
    </section>
  )
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

  const exclusoes = emMarcadores(rascunho.textoExclusoes)

  return (
    <article className="overflow-hidden rounded-2xl border border-borda bg-superficie">
      <div className="h-1.5" style={{ backgroundColor: cor }} />

      <header className="flex items-start gap-3 px-5 pt-5 pb-4">
        {empresa.logoUrl ? (
          // URL assinada do Storage, expira. next/image tentaria revalidar um
          // host que já morreu — a tag nativa é o certo aqui.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresa.logoUrl}
            alt={empresa.nome}
            className="size-12 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
            style={{ backgroundColor: cor }}
          >
            {iniciais(empresa.nome)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-tinta">{empresa.nome}</p>
          {empresa.responsavel && (
            <p className="text-xs text-tinta-suave">{empresa.responsavel}</p>
          )}
          {empresa.cnpjCpf && (
            <p className="text-xs text-tinta-suave">CNPJ/CPF {empresa.cnpjCpf}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: cor }}>
            Orçamento
          </p>
          <p className="text-lg font-bold text-tinta">
            Nº {String(publico.numero).padStart(3, '0')}
          </p>
        </div>
      </header>

      <div className="px-5 pb-5">
        <h1 className="text-xl leading-snug font-semibold text-tinta">
          {rascunho.titulo || 'Orçamento de serviço'}
        </h1>
        {rascunho.tipoServico && (
          <p className="mt-0.5 text-sm text-tinta-suave">{rotuloDoServico(rascunho.tipoServico)}</p>
        )}

        {(cliente || rascunho.localServico) && (
          <dl className="mt-4 grid gap-3 rounded-xl bg-fundo px-4 py-3 sm:grid-cols-2">
            {cliente && (
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-tinta-suave uppercase">
                  Para
                </dt>
                <dd className="text-sm text-tinta">{cliente.nome}</dd>
              </div>
            )}
            {rascunho.localServico && (
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-tinta-suave uppercase">
                  Local do serviço
                </dt>
                <dd className="text-sm text-tinta">{rascunho.localServico}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* --- O que está incluso, ANTES do valor ------------------------- */}
      {rascunho.textoEscopo && (
        <Secao titulo="O que está incluso" cor={cor}>
          <p className="text-[15px] leading-relaxed whitespace-pre-line text-tinta-suave">
            {rascunho.textoEscopo}
          </p>
        </Secao>
      )}

      {/* --- Itens e valor ---------------------------------------------- */}
      <Secao titulo="Itens do orçamento" cor={cor}>
        <ul className="flex flex-col gap-3">
          {rascunho.itens
            .filter((i) => i.descricao.trim())
            .map((item) => (
              <li key={item.id} className="flex gap-3 border-b border-borda pb-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug text-tinta">{item.descricao}</p>
                  <p className="mt-0.5 text-xs text-tinta-suave">
                    {item.quantidade} {item.unidade} ·{' '}
                    {item.tipo === 'material' ? 'Material' : 'Mão de obra'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-tinta">
                  {formatarMoeda(totalDoItem(item))}
                </p>
              </li>
            ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-tinta-suave">
            <dt>Material</dt>
            <dd>{formatarMoeda(material)}</dd>
          </div>
          <div className="flex justify-between text-tinta-suave">
            <dt>Mão de obra</dt>
            <dd>{formatarMoeda(maoDeObra)}</dd>
          </div>
        </dl>

        <div
          className="mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-white"
          style={{ backgroundColor: cor }}
        >
          <span className="text-sm font-medium">Total</span>
          <span className="text-xl font-bold">{formatarMoeda(total)}</span>
        </div>
      </Secao>

      {/* --- Opções de contratação -------------------------------------- */}
      {pacotes.length > 1 && (
        <Secao titulo="Opções de contratação" cor={cor}>
          <ul className="flex flex-col gap-3">
            {pacotes.map((pacote) => (
              <li
                key={pacote.nivel}
                className="rounded-xl border p-4"
                style={{
                  borderColor: pacote.destaque ? cor : undefined,
                  borderWidth: pacote.destaque ? 2 : 1,
                }}
              >
                {pacote.destaque && (
                  <span
                    className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase"
                    style={{ backgroundColor: cor }}
                  >
                    Minha indicação
                  </span>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-tinta">{pacote.rotulo}</p>
                  <p className="text-lg font-bold" style={{ color: pacote.destaque ? cor : undefined }}>
                    {formatarMoeda(pacote.valor)}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-tinta-suave">{pacote.descricao}</p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* --- O que não está incluso -------------------------------------- */}
      {rascunho.textoExclusoes && (
        <Secao titulo="O que não está incluso" cor={cor}>
          {exclusoes.abertura && (
            <p className="mb-2 text-[15px] font-medium text-tinta">{exclusoes.abertura}</p>
          )}
          <ul className="flex flex-col gap-2">
            {exclusoes.itens.map((item, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-tinta-suave">
                <span style={{ color: cor }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* --- Prazo, pagamento e garantia --------------------------------- */}
      <Secao titulo="Prazo, pagamento e garantia" cor={cor}>
        <div className="flex flex-col gap-4">
          {rascunho.prazoExecucao && (
            <div>
              <p className="text-sm font-semibold text-tinta">Prazo de execução</p>
              <p className="text-[15px] text-tinta-suave">{rascunho.prazoExecucao}</p>
            </div>
          )}
          {rascunho.textoCondicoesPagamento && (
            <div>
              <p className="text-sm font-semibold text-tinta">Condições de pagamento</p>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-tinta-suave">
                {rascunho.textoCondicoesPagamento}
              </p>
            </div>
          )}
          {rascunho.textoGarantia && (
            <div>
              <p className="text-sm font-semibold text-tinta">Garantia</p>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-tinta-suave">
                {rascunho.textoGarantia}
              </p>
            </div>
          )}
          {rascunho.observacoes && (
            <p className="text-sm leading-relaxed text-tinta-suave">{rascunho.observacoes}</p>
          )}
        </div>
      </Secao>

      {rascunho.dataValidade && (
        <div className="border-t border-borda px-5 py-4 text-center">
          <p className="text-sm text-tinta-suave">
            Proposta válida até{' '}
            <span className="font-semibold text-tinta">{formatarData(rascunho.dataValidade)}</span>
          </p>
        </div>
      )}
    </article>
  )
}
