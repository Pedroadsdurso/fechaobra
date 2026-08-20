import type { OrcamentoDocumento } from './tipos'

/**
 * Mocks do documento — Fase 1.
 *
 * Desenhados para QUEBRAR o layout de propósito: 26 itens forçam a tabela a
 * atravessar a quebra de página, o nome da empresa é longo demais para uma
 * linha, várias descrições ocupam duas linhas dentro da célula e há valor na
 * casa dos R$ 187 mil para conferir o alinhamento da coluna.
 *
 * Os textos de escopo, exclusões, garantia e condições são os do seed real
 * (supabase/migrations/0002_seed_textos.sql, tipo_servico = 'reforma_completa'),
 * copiados verbatim — nada de texto inventado só para o mock.
 */

const TEXTO_ESCOPO = "Execução da reforma completa do imóvel ou dos ambientes descritos neste orçamento, com coordenação de todas as etapas e das equipes envolvidas. Inclui o planejamento do cronograma por etapa e a definição da ordem de execução, começando pela demolição e pela remoção dos revestimentos e das instalações a serem substituídos, com proteção das áreas que permanecem. Em seguida, execução das alterações de alvenaria e drywall conforme o layout aprovado, passagem das novas instalações elétricas e hidráulicas com teste antes do fechamento, impermeabilização das áreas molhadas com teste de estanqueidade, contrapiso e regularização, assentamento de pisos e revestimentos, tratamento de superfícies, massa, selador e pintura, instalação de louças, metais, luminárias, portas e acabamentos. Acompanhamento diário da obra, controle de qualidade em cada etapa antes de liberar a seguinte e comunicação periódica do avanço ao cliente. Entrega final com vistoria conjunta ambiente por ambiente, correção dos apontamentos levantados na vistoria e limpeza grossa do imóvel, pronto para a limpeza fina e a mudança."

const TEXTO_EXCLUSOES = "Não estão inclusos neste orçamento: os materiais de acabamento de escolha do cliente, como porcelanato, louças, metais, luminárias, tintas, portas e ferragens, salvo quando descritos como itens acima com marca e referência definidas; móveis planejados, eletrodomésticos, bancadas de pedra, vidros e espelhos, salvo quando orçados; o projeto de arquitetura, o projeto estrutural, o projeto elétrico e hidráulico e as respectivas responsabilidades técnicas; a aprovação de projeto em prefeitura, a documentação exigida pelo condomínio e as taxas correspondentes; a caçamba e a retirada de entulho, orçadas conforme o volume real gerado; qualquer intervenção estrutural em pilar, viga, laje e fundação, que exige projeto de engenheiro; o tratamento de patologias ocultas como cupim, infiltração antiga, fiação deteriorada e tubulação corroída, que só aparecem após a demolição; a limpeza fina pós-obra e a mudança; e a hospedagem ou a guarda de móveis do cliente durante a obra."

const TEXTO_GARANTIA = "Garantia de 12 meses sobre a mão de obra de acabamento, contados da entrega, cobrindo falhas de execução em pintura, revestimento, gesso, instalação de louças, metais e acabamentos. Garantia de 2 anos sobre as instalações elétricas e hidráulicas executadas e de 5 anos sobre a impermeabilização das áreas molhadas. Para itens que envolvam solidez e segurança da edificação, prevalece o prazo legal de 5 anos previsto no Código Civil. Materiais fornecidos por nós seguem a garantia dos respectivos fabricantes, e materiais fornecidos pelo cliente têm cobertura apenas quanto à instalação. A garantia não cobre mau uso, desgaste natural, danos por terceiros que intervenham na obra entregue, falta de manutenção preventiva, movimentação estrutural do imóvel, infiltração vinda de área comum ou de unidade vizinha, nem alterações feitas por outro profissional, que encerram a garantia sobre o trecho alterado."

const TEXTO_CONDICOES = "Pagamento dividido por etapas medidas, conforme cronograma acordado por escrito antes do início. Entrada de 30% na assinatura, para mobilização da equipe, compra do material inicial e reserva do período na agenda. Parcelas intermediárias liberadas ao final de cada etapa concluída e aprovada pelo cliente, tipicamente demolição e instalações, contrapiso e revestimentos, acabamento e pintura. Retenção de 10% do valor total pagos somente após a vistoria final e a correção de todos os apontamentos levantados. Aceitamos Pix, dinheiro, transferência bancária e cartão de crédito em até 12 vezes, com a taxa da operadora acrescida no parcelamento. Serviços não previstos, alterações de escopo solicitadas durante a obra e patologias ocultas encontradas após a demolição são documentados com fotos e orçados como aditivo, com aprovação por escrito do cliente antes da execução. O prazo total pode ser afetado por atraso na entrega de material de escolha do cliente e por decisões pendentes de definição."

/** 26 itens: 12 de material, 14 de mão de obra. */
const ITENS: OrcamentoDocumento['itens'] = [
  // ---- Material ----
  { descricao: 'Porcelanato acetinado retificado 90x90 cm, linha premium, para sala, circulação e dormitórios, incluindo 12% de perda para recortes', quantidade: 96, unidade: 'm²', valorUnitario: 189.9, tipo: 'material' },
  { descricao: 'Argamassa colante AC-III flexível para porcelanato de grande formato, saco de 20 kg', quantidade: 42, unidade: 'sc', valorUnitario: 38.5, tipo: 'material' },
  { descricao: 'Rejunte epóxi para áreas molhadas, resistente a mofo e a produto de limpeza, cor a definir com o cliente', quantidade: 14, unidade: 'kg', valorUnitario: 92.4, tipo: 'material' },
  { descricao: 'Tinta acrílica premium acetinada, lavável, baixo odor, para paredes internas — galão de 18 litros', quantidade: 8, unidade: 'lt', valorUnitario: 489.9, tipo: 'material' },
  { descricao: 'Massa corrida PVA para nivelamento de paredes internas, balde de 25 kg', quantidade: 16, unidade: 'un', valorUnitario: 78.0, tipo: 'material' },
  { descricao: 'Placa de drywall standard 12,5 mm e perfis de aço galvanizado para fechamento das paredes novas do lavabo e da suíte', quantidade: 58, unidade: 'm²', valorUnitario: 74.3, tipo: 'material' },
  { descricao: 'Cabo flexível 2,5 mm² antichama, rolo de 100 m, para os circuitos de tomadas de uso geral', quantidade: 9, unidade: 'un', valorUnitario: 289.0, tipo: 'material' },
  { descricao: 'Quadro de distribuição de embutir para 24 disjuntores, com barramento e dispositivo DR de 40 A', quantidade: 1, unidade: 'un', valorUnitario: 1240.0, tipo: 'material' },
  { descricao: 'Tubulação de PVC soldável e conexões para a rede de água fria dos dois banheiros e da cozinha', quantidade: 1, unidade: 'vb', valorUnitario: 2870.0, tipo: 'material' },
  { descricao: 'Manta asfáltica aluminizada 3 mm com reforço de poliéster para impermeabilização dos boxes e da área de serviço', quantidade: 28, unidade: 'm²', valorUnitario: 96.5, tipo: 'material' },
  { descricao: 'Louças e metais: duas bacias com caixa acoplada, duas cubas de apoio, três misturadores monocomando e acessórios', quantidade: 1, unidade: 'vb', valorUnitario: 8940.0, tipo: 'material' },
  { descricao: 'Porta de madeira maciça com batente, dobradiças e fechadura, acabamento em laca branca', quantidade: 7, unidade: 'un', valorUnitario: 1180.0, tipo: 'material' },

  // ---- Mão de obra ----
  { descricao: 'Demolição de revestimentos, remoção de louças e metais existentes e retirada das instalações a serem substituídas, com proteção das áreas que permanecem', quantidade: 1, unidade: 'vb', valorUnitario: 6800.0, tipo: 'mao_de_obra' },
  { descricao: 'Remoção e bota-fora do entulho gerado na demolição, com organização em ponto único e carregamento de caçamba', quantidade: 4, unidade: 'un', valorUnitario: 620.0, tipo: 'mao_de_obra' },
  { descricao: 'Execução das alterações de alvenaria conforme o layout aprovado, incluindo vergas e contravergas sobre os novos vãos', quantidade: 34, unidade: 'm²', valorUnitario: 148.0, tipo: 'mao_de_obra' },
  { descricao: 'Montagem de estrutura e fechamento em drywall, com reforço interno nos pontos de fixação de armário e televisão', quantidade: 58, unidade: 'm²', valorUnitario: 96.0, tipo: 'mao_de_obra' },
  { descricao: 'Instalação elétrica completa: abertura de rasgos, passagem de eletrodutos, cabeamento dimensionado por circuito e montagem do quadro identificado', quantidade: 1, unidade: 'vb', valorUnitario: 16900.0, tipo: 'mao_de_obra' },
  { descricao: 'Instalação hidráulica de água fria, água quente e esgoto dos dois banheiros e da cozinha, com teste de estanqueidade antes do fechamento', quantidade: 1, unidade: 'vb', valorUnitario: 13200.0, tipo: 'mao_de_obra' },
  { descricao: 'Impermeabilização das áreas molhadas com manta asfáltica, meia cana nos encontros e teste de lâmina de água por 72 horas', quantidade: 28, unidade: 'm²', valorUnitario: 178.0, tipo: 'mao_de_obra' },
  { descricao: 'Execução de contrapiso e regularização com caimento correto para os ralos', quantidade: 96, unidade: 'm²', valorUnitario: 68.0, tipo: 'mao_de_obra' },
  { descricao: 'Assentamento de porcelanato de grande formato com dupla colagem, paginação definida com o cliente e juntas alinhadas', quantidade: 96, unidade: 'm²', valorUnitario: 145.0, tipo: 'mao_de_obra' },
  { descricao: 'Assentamento de revestimento de parede nos banheiros e na cozinha, com recortes em serra e arremates de canto', quantidade: 62, unidade: 'm²', valorUnitario: 105.0, tipo: 'mao_de_obra' },
  { descricao: 'Rejuntamento de piso e parede com limpeza do excesso e acabamento das juntas de canto e de dilatação', quantidade: 158, unidade: 'm²', valorUnitario: 26.0, tipo: 'mao_de_obra' },
  { descricao: 'Preparação de superfícies, massa corrida, lixamento, fundo selador e duas demãos de tinta acrílica em todos os ambientes', quantidade: 268, unidade: 'm²', valorUnitario: 68.0, tipo: 'mao_de_obra' },
  { descricao: 'Instalação de louças, metais, acessórios, luminárias, portas e acabamentos finais', quantidade: 1, unidade: 'vb', valorUnitario: 7400.0, tipo: 'mao_de_obra' },
  { descricao: 'Coordenação de obra, cronograma por etapa, controle de qualidade a cada liberação e vistoria final ambiente por ambiente', quantidade: 1, unidade: 'vb', valorUnitario: 18565.4, tipo: 'mao_de_obra' },
]

/**
 * Mock 1 — o caso completo: logo, fotos, os 3 pacotes, 26 itens.
 */
export const MOCK_COMPLETO: OrcamentoDocumento = {
  numero: 47,
  titulo: 'Reforma completa de apartamento de 96 m²',
  tipoServicoRotulo: 'Reforma completa',
  localServico: 'Rua Doutor Rafael de Barros, 209, apto 112 — Paraíso, São Paulo/SP',
  dataEmissao: '2026-08-19',
  dataValidade: '2026-09-18',
  validadeDias: 30,
  prazoExecucao: '75 dias corridos a partir da liberação do imóvel',
  empresa: {
    nome: 'Construtora e Reformas Silva & Filhos Ltda ME',
    responsavel: 'José Antônio da Silva',
    telefone: '(11) 98765-4321',
    email: 'contato@silvaefilhos.com.br',
    cnpjCpf: '11.222.333/0001-81',
    endereco: 'Rua das Palmeiras, 1.482 — Vila Madalena, São Paulo/SP',
    logoUrl: '/mock/logo.png',
  },
  cliente: {
    nome: 'Mariana Figueiredo Albuquerque',
    telefone: '(11) 97412-8890',
    email: 'mariana.albuquerque@email.com.br',
    endereco: 'Rua Doutor Rafael de Barros, 209, apto 112 — Paraíso, São Paulo/SP',
  },
  itens: ITENS,
  pacotes: [
    {
      nome: 'essencial',
      rotulo: 'Essencial',
      resumo: 'O necessário para o imóvel ficar pronto e funcionando.',
      inclui: [
        'Instalações elétricas e hidráulicas novas',
        'Impermeabilização das áreas molhadas',
        'Piso e revestimento nos ambientes principais',
        'Pintura completa',
      ],
      valor: 142900.0,
    },
    {
      nome: 'recomendado',
      rotulo: 'Recomendado',
      resumo: 'O escopo deste orçamento. Melhor relação entre custo e resultado.',
      inclui: [
        'Tudo do Essencial',
        'Porcelanato de grande formato com dupla colagem',
        'Alterações de alvenaria e drywall do novo layout',
        'Louças e metais de linha superior',
        'Coordenação de obra com cronograma por etapa',
      ],
      valor: 187450.0,
    },
    {
      nome: 'completo',
      rotulo: 'Completo',
      resumo: 'Entrega pronta para morar, sem pendência nenhuma.',
      inclui: [
        'Tudo do Recomendado',
        'Marcenaria planejada de cozinha e dormitórios',
        'Automação de iluminação e persianas',
        'Ar-condicionado nos três ambientes',
        'Limpeza fina pós-obra',
      ],
      valor: 268300.0,
    },
  ],
  fotos: [
    { url: '/mock/obra-1.png', legenda: 'Apartamento em Perdizes — 88 m², entrega em 2025' },
    { url: '/mock/obra-2.png', legenda: 'Cozinha e área de serviço — Pinheiros, 2025' },
    { url: '/mock/obra-3.png', legenda: 'Banheiro suíte com impermeabilização — Moema, 2026' },
    { url: '/mock/obra-4.png', legenda: 'Sala integrada após pintura — Vila Mariana, 2026' },
  ],
  textoEscopo: TEXTO_ESCOPO,
  textoExclusoes: TEXTO_EXCLUSOES,
  textoGarantia: TEXTO_GARANTIA,
  textoCondicoesPagamento: TEXTO_CONDICOES,
  observacoes:
    'O prazo considera o imóvel desocupado e sem mobília. Alterações de escopo durante a obra são documentadas com foto e aprovadas por escrito antes da execução.',
}

/**
 * Mock 2 — o fallback: sem logo, sem fotos, sem endereço da empresa.
 * É como o documento sai para quem acabou de criar a conta e ainda não subiu
 * nada. Precisa continuar parecendo profissional.
 */
export const MOCK_SIMPLES: OrcamentoDocumento = {
  numero: 3,
  titulo: 'Reforma de banheiro social',
  tipoServicoRotulo: 'Reforma completa',
  localServico: 'Rua Coronel Bento Pires, 88 — Santo Amaro, São Paulo/SP',
  dataEmissao: '2026-08-19',
  dataValidade: '2026-09-03',
  validadeDias: 15,
  prazoExecucao: '18 dias corridos',
  empresa: {
    nome: 'Reformas Andrade',
    responsavel: 'Carlos Andrade',
    telefone: '(11) 96331-2077',
    cnpjCpf: '529.982.247-25',
  },
  cliente: {
    nome: 'Roberto Tanaka',
    telefone: '(11) 99120-4455',
  },
  itens: [
    { descricao: 'Demolição do revestimento existente e remoção das louças', quantidade: 1, unidade: 'vb', valorUnitario: 1200.0, tipo: 'mao_de_obra' },
    { descricao: 'Impermeabilização do box com argamassa polimérica', quantidade: 6, unidade: 'm²', valorUnitario: 168.0, tipo: 'mao_de_obra' },
    { descricao: 'Assentamento de revestimento de piso e parede', quantidade: 24, unidade: 'm²', valorUnitario: 98.0, tipo: 'mao_de_obra' },
    { descricao: 'Instalação de louças, metais e acessórios', quantidade: 1, unidade: 'vb', valorUnitario: 890.0, tipo: 'mao_de_obra' },
    { descricao: 'Revestimento cerâmico 30x60 cm', quantidade: 26, unidade: 'm²', valorUnitario: 62.9, tipo: 'material' },
    { descricao: 'Argamassa colante AC-II e rejunte', quantidade: 8, unidade: 'sc', valorUnitario: 34.0, tipo: 'material' },
    { descricao: 'Bacia com caixa acoplada, cuba e misturador monocomando', quantidade: 1, unidade: 'vb', valorUnitario: 2180.0, tipo: 'material' },
  ],
  pacotes: [],
  fotos: [],
  textoEscopo: TEXTO_ESCOPO,
  textoExclusoes: TEXTO_EXCLUSOES,
  textoGarantia: TEXTO_GARANTIA,
  textoCondicoesPagamento: TEXTO_CONDICOES,
}

export const MOCKS = {
  completo: { rotulo: 'Completo — logo, fotos, 26 itens, 3 pacotes', dados: MOCK_COMPLETO },
  simples: { rotulo: 'Fallback — sem logo, sem fotos, sem pacotes', dados: MOCK_SIMPLES },
} as const

export type ChaveMock = keyof typeof MOCKS
