import type { EmpresaDocumento, OrcamentoDocumento, PacoteDocumento } from '@/modules/documento/tipos'
import type { Cliente } from '@/modules/clientes/tipos'
import { dataLocalEmDias, dataLocalISO } from '@/lib/utils'

import { paraNumero, pacotesDerivados, pacotesVisiveis, usaPacotes } from './calculos'
import { TIPOS_SERVICO, VALIDADE_PADRAO_DIAS } from './constantes'
import type { RascunhoOrcamento } from './tipos'

/**
 * A única ponte entre o banco e o documento.
 *
 * O documento (src/modules/documento) não sabe que existe Supabase: ele recebe
 * um `OrcamentoDocumento` pronto e desenha. Toda tradução — nome de coluna,
 * número em texto, regra de qual pacote aparece — mora aqui. Isso é o que
 * permite mudar o schema sem tocar no PDF, e redesenhar o PDF sem tocar no
 * schema.
 *
 * É função pura: roda igual no servidor e no navegador, o que faz o preview ao
 * vivo mostrar exatamente o arquivo que vai ser baixado.
 */

function rotuloDoServico(valor: string) {
  return TIPOS_SERVICO.find((t) => t.valor === valor)?.rotulo ?? ''
}

export function paraDocumento({
  rascunho,
  cliente,
  empresa,
  urlPublica,
}: {
  rascunho: RascunhoOrcamento
  cliente: Cliente | null
  empresa: EmpresaDocumento
  /**
   * Link público do orçamento. Vira o QR do rodapé.
   *
   * Chega de fora porque quem sabe montá-la é o servidor (lê o token do banco)
   * — o adaptador continua sendo função pura, sem consultar nada.
   */
  urlPublica?: string
}): OrcamentoDocumento {
  const dias = Number(rascunho.validadeDias) || VALIDADE_PADRAO_DIAS

  const itens = rascunho.itens
    .filter((i) => i.descricao.trim())
    .map((i) => ({
      descricao: i.descricao.trim(),
      // O documento formata números; aqui eles voltam a ser números.
      quantidade: paraNumero(i.quantidade) || 1,
      unidade: i.unidade || 'un',
      valorUnitario: paraNumero(i.valorUnitario),
      tipo: i.tipo,
    }))

  // Pacotes só entram quando há comparação real a fazer: itens espalhados em
  // mais de um nível E níveis com valores distintos. Um nível que repete o
  // valor do anterior é ruído — some antes de chegar ao papel.
  const pacotes: PacoteDocumento[] = usaPacotes(rascunho.itens)
    ? pacotesVisiveis(pacotesDerivados(rascunho.itens, rascunho.pacotes))
        .filter((p) => p.valor > 0)
        .map((p) => ({
          nome: p.nivel,
          rotulo: p.rotulo,
          resumo: p.descricao,
          inclui: p.inclui,
          valor: p.valor,
          destaque: p.destaque,
        }))
    : []

  return {
    numero: rascunho.numero,
    titulo: rascunho.titulo.trim() || 'Orçamento de serviço',
    tipoServicoRotulo: rotuloDoServico(rascunho.tipoServico),
    localServico: rascunho.localServico.trim() || undefined,
    dataEmissao: dataLocalISO(),
    dataValidade: rascunho.dataValidade || dataLocalEmDias(dias),
    validadeDias: dias,
    prazoExecucao: rascunho.prazoExecucao.trim() || undefined,
    empresa,
    cliente: cliente
      ? {
          nome: cliente.nome,
          telefone: cliente.telefone || undefined,
          email: cliente.email || undefined,
          endereco: cliente.endereco || undefined,
        }
      : { nome: 'Cliente a definir' },
    itens,
    pacotes,
    // Galeria de trabalhos anteriores não tem armazenamento ainda: o schema
    // não tem tabela de fotos e o bucket só guarda logo. Fica para depois; o
    // bloco do documento já some sozinho com a lista vazia.
    fotos: [],
    textoEscopo: rascunho.textoEscopo,
    textoExclusoes: rascunho.textoExclusoes,
    textoGarantia: rascunho.textoGarantia,
    textoCondicoesPagamento: rascunho.textoCondicoesPagamento,
    observacoes: rascunho.observacoes.trim() || undefined,
    urlPublica,
  }
}
