/**
 * Os valores aqui espelham exatamente as constraints do banco
 * (supabase/migrations/0001_schema.sql) e as chaves do seed de textos
 * (0002_seed_textos.sql). Se mudar de um lado, mude do outro.
 */

export const NICHO_PADRAO = 'obra_reforma'

/** Os 12 tipos de serviço com texto padrão pronto no banco. */
export const TIPOS_SERVICO = [
  { valor: 'pintura', rotulo: 'Pintura' },
  { valor: 'eletrica', rotulo: 'Elétrica' },
  { valor: 'hidraulica', rotulo: 'Hidráulica' },
  { valor: 'drywall_gesso', rotulo: 'Drywall e gesso' },
  { valor: 'alvenaria', rotulo: 'Alvenaria' },
  { valor: 'piso_revestimento', rotulo: 'Piso e revestimento' },
  { valor: 'marcenaria', rotulo: 'Marcenaria' },
  { valor: 'ar_condicionado', rotulo: 'Ar-condicionado' },
  { valor: 'impermeabilizacao', rotulo: 'Impermeabilização' },
  { valor: 'telhado', rotulo: 'Telhado' },
  { valor: 'esquadrias_vidros', rotulo: 'Esquadrias e vidros' },
  { valor: 'reforma_completa', rotulo: 'Reforma completa' },
] as const

export const TIPOS_TEXTO = [
  { valor: 'escopo', rotulo: 'O que está incluso' },
  { valor: 'exclusoes', rotulo: 'O que não está incluso' },
  { valor: 'garantia', rotulo: 'Garantia' },
  { valor: 'condicoes', rotulo: 'Condições de pagamento' },
] as const

export const STATUS_ORCAMENTO = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'enviado', rotulo: 'Enviado' },
  { valor: 'visualizado', rotulo: 'Visualizado' },
  { valor: 'aceito', rotulo: 'Aceito' },
  { valor: 'recusado', rotulo: 'Recusado' },
  { valor: 'expirado', rotulo: 'Expirado' },
] as const

export const TIPOS_ITEM = [
  { valor: 'material', rotulo: 'Material' },
  { valor: 'mao_de_obra', rotulo: 'Mão de obra' },
] as const

export const PACOTES = [
  { valor: 'essencial', rotulo: 'Essencial' },
  { valor: 'recomendado', rotulo: 'Recomendado' },
  { valor: 'completo', rotulo: 'Completo' },
] as const

/** Unidades de medida usadas no dia a dia de obra. */
export const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 'sc', 'lt', 'cx', 'pç', 'h', 'dia', 'vb']

export const VALIDADE_PADRAO_DIAS = 15
