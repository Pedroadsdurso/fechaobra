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

function Selo({ texto, tom }: { texto: string; tom: 'obrigatorio' | 'pronto' | 'discreto' }) {
  if (tom === 'discreto') {
    return <span className="shrink-0 text-[11px] text-tinta-meta">{texto}</span>
  }

  return (
    <span
      className={cn(
        'shrink-0 rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] uppercase',
        tom === 'obrigatorio'
          ? 'bg-atencao/12 text-atencao-forte'
          : 'bg-tinta/[0.07] text-tinta-meta',
      )}
    >
      {texto}
    </span>
  )
}
