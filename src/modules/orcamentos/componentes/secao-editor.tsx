import { cn } from '@/lib/utils'

/**
 * Cabeçalho numerado das seções do editor.
 *
 * ===========================================================================
 * A HIERARQUIA É O PONTO DESTA TELA
 * ===========================================================================
 * O editor tem dois grupos de campos que não valem a mesma coisa:
 *
 *   - o que o prestador PRECISA preencher: cliente e itens. Sem isso não há
 *     orçamento, e é aqui que ele gasta os 3 minutos;
 *   - o que já vem pronto do modelo: escopo, exclusões, garantia, condições.
 *     Bom texto, escrito para ele, que na maioria das vezes ele não vai
 *     tocar.
 *
 * Antes os dois grupos apareciam do mesmo jeito — cinco textareas altas
 * empurravam cliente e itens para longe e faziam a tela parecer um
 * formulário de cartório. O segundo grupo agora vem dobrado em linhas de
 * resumo, e o selo diz de qual grupo a seção é.
 * ===========================================================================
 */
export function CabecalhoSecao({
  numero,
  titulo,
  selo,
  nota,
}: {
  numero: number
  titulo: string
  /** O selo à direita: obrigatório, já pronto, ou uma nota curta. */
  selo?: { texto: string; tom: 'obrigatorio' | 'pronto' | 'discreto' }
  nota?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-tinta text-[11px] font-bold text-white">
          {numero}
        </span>
        <h2 className="flex-1 text-[15px] font-bold text-tinta">{titulo}</h2>
        {selo && <Selo {...selo} />}
      </div>
      {nota && <p className="text-xs leading-normal text-tinta-meta">{nota}</p>}
    </div>
  )
}

/**
 * O selo diz de qual GRUPO a seção é. Ele não é o assunto.
 *
 * A primeira versão era uma pílula preenchida em âmbar — o único elemento
 * colorido da seção, e por isso a primeira coisa que o olho pegava. Um
 * rótulo gritando ao lado de cada seção não cria hierarquia entre grupos:
 * cria concorrência com o conteúdo que ele deveria destacar.
 *
 * Sem preenchimento, a área de tinta cai para um quarto e a palavra continua
 * lá para quem procurar. O único elemento preenchido do cabeçalho segue
 * sendo o número da seção, que é o que ancora a leitura.
 *
 * O que de fato cobra ação não é este selo: é a barra de baixo, que diz o
 * que falta com todas as letras ("Falta escolher o cliente e incluir ao
 * menos 1 item") e só some quando o orçamento está pronto para enviar.
 */
function Selo({ texto, tom }: { texto: string; tom: 'obrigatorio' | 'pronto' | 'discreto' }) {
  if (tom === 'discreto') {
    return <span className="shrink-0 text-[11px] text-tinta-meta">{texto}</span>
  }

  return (
    <span
      className={cn(
        'shrink-0 text-[10px] font-semibold tracking-[0.07em] uppercase',
        tom === 'obrigatorio' ? 'text-atencao' : 'text-tinta-meta',
      )}
    >
      {texto}
    </span>
  )
}
