/**
 * A mensagem que vai junto com o link, no WhatsApp.
 *
 * ===========================================================================
 * NÃO ADICIONE O VALOR DO ORÇAMENTO AQUI.
 * ===========================================================================
 *
 * Parece uma melhoria óbvia — "já manda o valor, o cliente quer saber" — e é
 * o contrário do que o produto inteiro tenta fazer.
 *
 * O escopo, as exclusões e a garantia existem para justificar o preço. Se o
 * número chega antes deles, o cliente reage ao preço sem ter visto o que o
 * sustenta, e o link vira só confirmação de uma decisão já tomada. Pior: na
 * prévia da notificação do celular, quase sempre só o começo da mensagem
 * aparece — o valor seria literalmente a primeira coisa que ele lê, no
 * elevador, sem contexto nenhum.
 *
 * O link existe para que o número chegue acompanhado. Mantenha assim.
 *
 * ---------------------------------------------------------------------------
 * Outras duas regras, pelo mesmo motivo de credibilidade:
 *
 * SEM EMOJI e SEM LINGUAGEM DE SISTEMA. Este público manda mensagem seca e
 * direta. "Prezado cliente, segue em anexo", "✅ Orçamento disponível" ou
 * qualquer coisa que soe a automação derruba na hora a credibilidade que o
 * documento levou três páginas para construir. A mensagem tem que parecer
 * digitada pelo prestador, porque é ele quem está mandando.
 */

import type { MotivoDuvida } from '@/modules/publico/motivos'

export type DadosMensagem = {
  /** Primeiro nome do cliente. Vazio quando não há cliente. */
  primeiroNomeCliente: string
  /** Quem assina: o responsável, ou o nome da empresa se não houver. */
  assinante: string
  nomeEmpresa: string
  /** Título do orçamento, em minúscula no meio da frase. */
  titulo: string
  url: string
}

/**
 * Como a pessoa se apresenta numa conversa: "José Antônio", não "José Antônio
 * da Silva". Nome completo no WhatsApp soa a formulário.
 *
 * Pega o primeiro nome e junta o segundo quando ele não é partícula — sem
 * isso, "Maria de Souza" viraria "Maria de".
 */
const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])

export function nomeDeTratamento(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  if (partes.length === 1) return partes[0]

  const segundo = partes[1]
  return PARTICULAS.has(segundo.toLowerCase()) ? partes[0] : `${partes[0]} ${segundo}`
}

/**
 * "Reforma de banheiro social" -> "reforma de banheiro social"
 * Só a primeira letra: nomes próprios no meio do título continuam maiúsculos.
 */
function minusculaInicial(texto: string) {
  const limpo = texto.trim()
  if (!limpo) return ''
  return limpo.charAt(0).toLowerCase() + limpo.slice(1)
}

export function montarMensagem(dados: DadosMensagem) {
  const saudacao = dados.primeiroNomeCliente ? `Oi, ${dados.primeiroNomeCliente}!` : 'Oi!'

  // "Aqui é o José Antônio, da Andrade Elétrica" soa como pessoa.
  // "Aqui é a Andrade Elétrica" soa como empresa disparando mensagem.
  const apresentacao =
    dados.assinante && dados.assinante !== dados.nomeEmpresa
      ? `Aqui é o ${dados.assinante}, da ${dados.nomeEmpresa}.`
      : `Aqui é da ${dados.nomeEmpresa}.`

  const assunto = dados.titulo
    ? `Segue o orçamento da ${minusculaInicial(dados.titulo)}:`
    : 'Segue o orçamento que combinamos:'

  return [
    `${saudacao} ${apresentacao}`,
    assunto,
    '',
    dados.url,
    '',
    'Qualquer dúvida, me chama.',
  ].join('\n')
}

/**
 * A mensagem que o CLIENTE manda quando toca em "Tenho uma dúvida".
 *
 * ===========================================================================
 * PRIMEIRA PESSOA DO CLIENTE, NÃO DO PRESTADOR
 * ===========================================================================
 * Todas as outras mensagens deste arquivo são escritas pelo prestador. Esta
 * não: quem toca no botão é o cliente, e o WhatsApp vai abrir com a mensagem
 * já digitada NA CAIXA DELE. "Segue o orçamento" ou "posso explicar qualquer
 * ponto" sairiam da boca errada.
 *
 * Tom de quem escreve no WhatsApp, não de quem preenche formulário. "Queria
 * falar sobre o valor", não "gostaria de esclarecer questões referentes ao
 * investimento". Valem as mesmas regras do resto do arquivo: sem emoji, sem
 * linguagem de sistema, e sem o valor do orçamento.
 * ===========================================================================
 *
 * POR QUE ISTO EXISTE: antes, os cinco caminhos mandavam a mesma frase
 * genérica. O motivo ficava registrado no banco e não chegava na conversa — o
 * prestador recebia "queria falar sobre ele" e tinha que perguntar o que já
 * havia sido respondido. O melhor do fluxo se perdia no último metro.
 */
export function mensagemDeDuvida(numero: number, motivo: MotivoDuvida | 'generico', texto = '') {
  const ref = `nº ${String(numero).padStart(3, '0')}`
  const abertura = `Oi! Recebi o orçamento ${ref}.`

  switch (motivo) {
    case 'preco':
      return `${abertura} Queria falar sobre o valor.`
    case 'prazo':
      return `${abertura} Queria falar sobre o prazo.`
    case 'escopo':
      return `${abertura} Fiquei com dúvida sobre o que está incluso.`
    case 'outro': {
      /*
        O texto vai como o cliente escreveu — sem maiúscula forçada, sem ponto
        final acrescentado. Corrigir a frase dele faria a mensagem parecer
        gerada, que é exatamente o que este arquivo inteiro evita.

        Só o espaço em branco é normalizado: quebra de linha no meio de um
        texto de 200 caracteres vira uma mensagem esquisita no WhatsApp.
      */
      const limpo = texto.replace(/\s+/g, ' ').trim()
      return limpo ? `${abertura} ${limpo}` : `${abertura} Queria falar sobre ele.`
    }
    // "Só quero falar": a pessoa escolheu não dizer. Inventar um assunto aqui
    // seria colocar palavra na boca dela.
    default:
      return `Oi! Recebi o orçamento ${ref} e queria falar sobre ele.`
  }
}

/**
 * Link do WhatsApp.
 *
 * Sem telefone do cliente, abre o WhatsApp sem destinatário para o prestador
 * escolher o contato na hora. Desabilitar o botão seria contradizer a decisão
 * de cliente mínimo: o cadastro pode ter só o nome, e mesmo assim o envio
 * precisa acontecer.
 */
export function linkWhatsApp(telefone: string, mensagem: string) {
  const digitos = telefone.replace(/\D/g, '')
  const texto = encodeURIComponent(mensagem)

  if (!digitos) return `https://wa.me/?text=${texto}`

  // wa.me exige código do país. Números brasileiros vêm com 10 ou 11 dígitos.
  const completo = digitos.length <= 11 ? `55${digitos}` : digitos
  return `https://wa.me/${completo}?text=${texto}`
}

/**
 * Mensagens de acompanhamento, para o prestador cobrar retorno sem pensar no
 * que escrever.
 *
 * Valem as mesmas regras da mensagem de envio: sem emoji, sem linguagem de
 * sistema, sem valor no corpo. E sem cobrança: "e aí, vai fechar?" queima a
 * relação. O texto oferece ajuda, que é o que de fato destrava — a maior parte
 * do silêncio é dúvida não respondida, não desinteresse.
 */
export type TipoAcompanhamento = 'aceito' | 'visualizado-parado' | 'enviado-nao-aberto' | 'vencendo'

export function mensagemDeAcompanhamento(
  tipo: TipoAcompanhamento,
  primeiroNomeCliente: string,
  numero: number,
) {
  const oi = primeiroNomeCliente ? `Oi, ${primeiroNomeCliente}!` : 'Oi!'
  const ref = `nº ${String(numero).padStart(3, '0')}`

  switch (tipo) {
    case 'aceito':
      return `${oi} Recebi seu aceite do orçamento ${ref}. Já posso reservar a data — qual semana fica melhor para começar?`
    case 'visualizado-parado':
      return `${oi} Vi que você abriu o orçamento ${ref}. Ficou alguma dúvida sobre o que está incluso ou sobre o prazo? Posso explicar qualquer ponto.`
    case 'enviado-nao-aberto':
      return `${oi} Te mandei o orçamento ${ref} por aqui. Confere se o link chegou direitinho — às vezes se perde no meio das mensagens.`
    case 'vencendo':
      return `${oi} O orçamento ${ref} está chegando no fim do prazo. Se precisar de mais tempo para decidir, eu atualizo as datas sem problema.`
  }
}
