'use client'

import { Dialogo } from '@/componentes/ui/dialogo'

/**
 * O que este recurso faz, para quem ainda não o tem.
 *
 * ===========================================================================
 * VISÍVEL E BLOQUEADO, NÃO INVISÍVEL
 * ===========================================================================
 * Antes o botão simplesmente não existia sem o recurso. Quem não sabe que
 * existe não compra — e esconder também tirava do prestador a chance de
 * descobrir a ferramenta no momento em que ela resolveria o problema dele:
 * parado na frente do campo de escopo, sem saber o que escrever.
 *
 * O que NÃO fazemos, e não é descuido: nada de banner, nada de "faça upgrade"
 * repetido em cada tela, nada de contador piscando. Um cadeado no botão, e a
 * explicação só quando a pessoa tocar. Quem já tem o recurso nunca vê nada
 * disto — a interface dele é a de sempre.
 *
 * A oferta acontece uma vez, no lugar certo, e sai da frente.
 * ===========================================================================
 *
 * Esta folha abre NO CLIENTE, antes de qualquer chamada ao servidor: o
 * navegador já sabe que o recurso está bloqueado, então a Server Action nunca
 * é chamada e a resposta é imediata. Isso não substitui o `exigirRecurso`, que
 * continua lançando no servidor — o `verificar:acesso` provou que dá para
 * montar a chamada na mão, e esconder botão nunca foi tranca.
 */
export function DialogoBloqueado({
  aberto,
  aoFechar,
  titulo,
  oQueFaz,
  checkout,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  /** Duas ou três linhas. Se precisar de mais, o recurso não está claro. */
  oQueFaz: string
  /** Vazio enquanto o produto não existe na Cakto. */
  checkout: string
}) {
  return (
    <Dialogo aberto={aberto} aoFechar={aoFechar} titulo={titulo}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-tinta-leitura">{oQueFaz}</p>

        {checkout ? (
          <>
            {/*
              Âncora de verdade, sem target="_blank": mesma regra dos links de
              WhatsApp. E o e-mail já vai no link — ver checkoutDoRecurso.
            */}
            <a
              href={checkout}
              rel="noopener"
              className="fo-toque flex min-h-13 items-center justify-center rounded-xl bg-marca text-base font-semibold text-white"
            >
              Ver como liberar
            </a>
            <p className="text-center text-xs leading-relaxed text-tinta-meta">
              O checkout abre com o e-mail desta conta preenchido. Comprar com outro e-mail deixa o
              recurso sem chegar aqui.
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-fundo px-3 py-2.5 text-sm text-tinta-meta">
            Ainda não está à venda. Em breve.
          </p>
        )}

        <button
          type="button"
          onClick={aoFechar}
          className="min-h-11 text-sm text-tinta-suave underline underline-offset-4"
        >
          Agora não
        </button>
      </div>
    </Dialogo>
  )
}
