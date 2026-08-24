import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'ia'
type Tamanho = 'medio' | 'grande'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-white hover:bg-marca-forte active:bg-marca-forte',
  secundario: 'bg-superficie text-tinta border border-borda hover:bg-fundo active:bg-fundo',
  fantasma: 'bg-transparent text-tinta-suave hover:bg-fundo hover:text-tinta',
  perigo: 'bg-transparent text-perigo border border-perigo/30 hover:bg-perigo/5',
  /*
    Recurso de IA. Difere do `secundario` só pela borda e pelo peso — e é de
    propósito.

    Não há cor "de IA" nesta paleta: ela é neutra mais vermelho (perigo),
    laranja (atenção, e o laranja é do CTA de envio) e verde (sucesso).
    Inventar um roxo para o recurso quebraria a identidade e leria como
    enfeite, que é do que este público desconfia.

    Então a diferença é estrutural: borda em `borda-controle` (#7d8894, contra
    #e3e6ea do secundário) e texto semibold. Separa do botão manual ao lado sem
    chegar perto do peso do primário, que é do CTA de enviar.
  */
  ia: 'bg-superficie text-tinta font-semibold border border-borda-controle hover:bg-fundo active:bg-fundo',
}

const TAMANHOS: Record<Tamanho, string> = {
  // 44px de altura mínima: alvo de toque confortável no celular, de luva, no canteiro.
  medio: 'min-h-11 px-4 text-sm',
  grande: 'min-h-12 px-5 text-base',
}

/**
 * As classes, isoladas do <button>.
 *
 * Existe porque nem todo botão pode SER um <button>: um link para o WhatsApp
 * precisa ser um <a href> de verdade. Aninhar <button> dentro de <a> é HTML
 * inválido — a especificação proíbe conteúdo interativo dentro de <a> — e o
 * comportamento fica por conta do navegador. Ver a nota em dialogo-envio.tsx.
 */
export function classesBotao({
  variante = 'primario',
  tamanho = 'medio',
  larguraTotal = false,
  className,
}: {
  variante?: Variante
  tamanho?: Tamanho
  larguraTotal?: boolean
  className?: string
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    // fo-toque troca transition-colors: além da cor, encolhe 2,5% no toque.
    // É o retorno tátil que falta no celular, onde não existe :hover.
    'fo-toque outline-none',
    'focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    larguraTotal && 'w-full',
    className,
  )
}

type Props = ComponentProps<'button'> & {
  variante?: Variante
  tamanho?: Tamanho
  larguraTotal?: boolean
}

export function Botao({
  variante = 'primario',
  tamanho = 'medio',
  larguraTotal = false,
  className,
  ...props
}: Props) {
  return (
    <button className={classesBotao({ variante, tamanho, larguraTotal, className })} {...props} />
  )
}
