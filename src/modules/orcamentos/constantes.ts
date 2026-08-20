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

/**
 * Rótulo e frase de partida de cada pacote.
 *
 * Quem lê isto é o cliente final decidindo quanto gastar, não o prestador. Por
 * isso cada frase diz o que aquele nível ENTREGA A MAIS — nunca o que falta no
 * nível de baixo. Cliente que sente que está sendo empurrado para cima trava;
 * cliente que entende o que ganha, decide.
 *
 * O Essencial abre dizendo que a mão de obra é a mesma nas três opções: sem
 * isso, "mais barato" é lido como "serviço pior", e a comparação inteira
 * desanda. O Recomendado justifica com durabilidade, que é o argumento que o
 * dono da obra reconhece — e não com "vale a pena investir mais".
 *
 * Tudo isso é ponto de partida editável: quem conhece o próprio cliente é o
 * prestador, e a frase dele sempre vai ser melhor que a nossa.
 */
export const PACOTES_PADRAO: Record<
  (typeof PACOTES)[number]['valor'],
  { rotulo: string; descricao: string }
> = {
  essencial: {
    rotulo: 'Essencial',
    descricao:
      'Entrega o serviço pronto e funcionando, com material de linha padrão. A mão de obra e o cuidado da execução são os mesmos das três opções.',
  },
  recomendado: {
    rotulo: 'Recomendado',
    descricao:
      'Acrescenta os pontos que mais pesam na durabilidade e no acabamento — justamente onde economizar costuma custar caro depois. É o que indico para a maioria das obras deste tipo.',
  },
  completo: {
    rotulo: 'Completo',
    descricao:
      'Resolve junto o que normalmente vira uma segunda obra meses adiante. Você passa a usar o espaço sem pendência e sem precisar me chamar de volta.',
  },
}

/** Nível que nasce em destaque. É o do meio, por ancoragem. */
export const PACOTE_DESTAQUE_PADRAO = 'recomendado' as const
