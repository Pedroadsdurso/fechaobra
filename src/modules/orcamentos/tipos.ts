import type { Tabela } from '@/lib/banco'

import type { PACOTES, STATUS_ORCAMENTO, TIPOS_ITEM } from './constantes'

export type Orcamento = Tabela<'orcamentos'>
export type ItemOrcamento = Tabela<'orcamento_itens'>
export type TextoPadrao = Tabela<'textos_padrao'>
export type EventoOrcamento = Tabela<'eventos_orcamento'>

export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number]['valor']
export type TipoItem = (typeof TIPOS_ITEM)[number]['valor']
export type Pacote = (typeof PACOTES)[number]['valor']
