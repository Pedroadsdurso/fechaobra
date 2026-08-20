import type { SVGProps } from 'react'

import {
  IconeBiblioteca,
  IconeClientes,
  IconeConfiguracoes,
  IconeOrcamentos,
  IconePainel,
} from './icones'

export type ItemNavegacao = {
  rotulo: string
  href: string
  icone: (props: SVGProps<SVGSVGElement>) => React.ReactElement
  /** Fase 1: aparece na navegação, mas ainda não leva a lugar nenhum. */
  emBreve?: boolean
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { rotulo: 'Painel', href: '/painel', icone: IconePainel },
  { rotulo: 'Orçamentos', href: '/painel/orcamentos', icone: IconeOrcamentos },
  { rotulo: 'Clientes', href: '/painel/clientes', icone: IconeClientes },
  { rotulo: 'Biblioteca', href: '/biblioteca', icone: IconeBiblioteca, emBreve: true },
  { rotulo: 'Marca', href: '/painel/marca', icone: IconeConfiguracoes },
]

/**
 * Qual item deve aparecer como ativo para um caminho.
 *
 * Comparar com `startsWith` item a item acenderia "Painel" e "Marca" ao mesmo
 * tempo em /painel/marca, porque um é prefixo do outro. Vence sempre o href
 * mais longo que casa.
 */
export function hrefAtivo(caminho: string): string | null {
  const candidatos = ITENS_NAVEGACAO.filter(
    (item) => !item.emBreve && (caminho === item.href || caminho.startsWith(`${item.href}/`)),
  )

  if (candidatos.length === 0) return null

  return candidatos.reduce((maisLongo, item) =>
    item.href.length > maisLongo.href.length ? item : maisLongo,
  ).href
}
