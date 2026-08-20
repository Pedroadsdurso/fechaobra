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
  { rotulo: 'Orçamentos', href: '/orcamentos', icone: IconeOrcamentos, emBreve: true },
  { rotulo: 'Clientes', href: '/clientes', icone: IconeClientes, emBreve: true },
  { rotulo: 'Biblioteca', href: '/biblioteca', icone: IconeBiblioteca, emBreve: true },
  { rotulo: 'Ajustes', href: '/configuracoes', icone: IconeConfiguracoes, emBreve: true },
]
