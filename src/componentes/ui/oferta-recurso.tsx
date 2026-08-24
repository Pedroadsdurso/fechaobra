/**
 * O caminho de compra de um módulo, onde quer que ele precise aparecer.
 *
 * Nasceu dentro do `DialogoBloqueado` e saiu de lá quando surgiu o segundo
 * lugar que precisa dele: as folhas de IA, quando a Server Action responde
 * `sem_recurso`. São dois momentos diferentes da mesma pessoa —
 *
 *   - o cadeado: ela nunca teve o módulo, e toca no botão para saber o que é;
 *   - a recusa: ela TINHA (a tela abriu com o botão livre) e perdeu no meio do
 *     caminho, quase sempre por reembolso do bump processado agora há pouco.
 *
 * — e a saída dos dois é a mesma frase e o mesmo link. Duplicar isso seria
 * garantir que um dos dois fique com o texto velho depois da primeira revisão.
 */
export function OfertaRecurso({ checkout }: { checkout: string }) {
  /*
    Sem link não há oferta a fazer: hoje só os recursos previstos, que não têm
    produto na Cakto. Ver `linkCheckout` em lib/cakto/produtos.ts — se isto
    aparecer no cadeado da IA, o defeito é catálogo, não interface.
  */
  if (!checkout) {
    return (
      <p className="rounded-lg bg-fundo px-3 py-2.5 text-sm text-tinta-meta">
        Ainda não está à venda. Em breve.
      </p>
    )
  }

  return (
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
  )
}
