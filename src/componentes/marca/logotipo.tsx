import { cn } from '@/lib/utils'

import { SimboloFechaObra } from './simbolo'

/**
 * O logotipo: símbolo + nome.
 *
 * ===========================================================================
 * ONDE ISTO NÃO ENTRA
 * ===========================================================================
 * Nunca no PDF e nunca na página pública /p/[token]. Ali quem assina é o
 * prestador, com a logo e a cor dele — o orçamento é dele, não nosso. Carimbo
 * de "feito com FechaObra" em documento que o cliente final lê tira do
 * prestador exatamente o que ele está pagando para ter.
 *
 * Vale para qualquer superfície que o cliente final veja, inclusive metadados
 * do arquivo e prévia de link.
 * ===========================================================================
 *
 * O nome é <span>, não SVG: fica selecionável, acessível e legível por leitor
 * de tela, e acompanha a fonte do app sem baixar nada. Só o símbolo é vetor.
 */
export function LogotipoFechaObra({
  className,
  tamanho = 'medio',
  orientacao = 'horizontal',
}: {
  className?: string
  tamanho?: 'pequeno' | 'medio' | 'grande'
  orientacao?: 'horizontal' | 'empilhado'
}) {
  const simbolo = {
    pequeno: 'size-6',
    medio: 'size-7',
    grande: 'size-12',
  }[tamanho]

  const texto = {
    pequeno: 'text-base',
    medio: 'text-lg',
    grande: 'text-2xl',
  }[tamanho]

  return (
    <span
      className={cn(
        'inline-flex text-tinta',
        orientacao === 'horizontal'
          ? 'flex-row items-center gap-2.5'
          : 'flex-col items-center gap-2.5',
        className,
      )}
    >
      <SimboloFechaObra className={cn(simbolo, 'shrink-0')} />
      {/* -0.015em é o do documento de identidade: sem isso o nome abre demais. */}
      <span className={cn('font-bold tracking-[-0.015em]', texto)}>FechaObra</span>
    </span>
  )
}
