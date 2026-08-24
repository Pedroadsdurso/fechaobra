/**
 * O que sai para a IA sai por inclusão, e sai por uma porta só.
 *
 * ===========================================================================
 * POR QUE ISTO É CHECK
 * ===========================================================================
 * Montar o payload por inclusão é a decisão que impede vazamento de dado
 * pessoal para um serviço de terceiro — e é uma decisão que se desfaz sozinha
 * com o tempo. Basta alguém trocar os campos escritos à mão por um spread
 * "para simplificar", ou acrescentar um campo "só para o modelo entender
 * melhor", e o padrão vira vazar.
 *
 * Nenhuma dessas mudanças quebra teste nenhum. Nenhuma aparece no tsc. O
 * `payloadExtracao` continuaria compilando e devolvendo um objeto. Por isso a
 * verificação é comportamental: monto o payload a partir de um rascunho cheio
 * de dado sensível e conto o que sobreviveu.
 * ===========================================================================
 *
 * Uso: npm run verificar:saneamento (roda dentro do build)
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const falhas = []
const conferir = (nome, ok, detalhe) => {
  console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${nome} — ${detalhe}`)
  if (!ok) falhas.push(nome)
}

/*
  Carrega o saneamento.ts DE VERDADE, com uma única alteração: o import por
  alias `@/...`, que o Node não resolve sozinho, vira o valor literal. O resto
  do arquivo é o que está em produção — inclusive o corpo de payloadExtracao,
  que é o que interessa medir.
*/
const pasta = mkdtempSync(join(tmpdir(), 'fo-san-'))
const fonte = readFileSync('src/modules/ia/saneamento.ts', 'utf8').replace(
  /import \{ UNIDADES \} from '@\/modules\/orcamentos\/constantes'/,
  `const UNIDADES = ${JSON.stringify(
    (readFileSync('src/modules/orcamentos/constantes.ts', 'utf8').match(
      /export const UNIDADES = (\[[^\]]*\])/,
    ) ?? [])[1] ?? '[]',
  )
    .slice(1, -1)
    .replace(/\\'/g, "'")}`,
)
const caminho = join(pasta, 'saneamento.ts')
writeFileSync(caminho, fonte)

let saneamento
try {
  saneamento = await import(caminho)
} finally {
  rmSync(pasta, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 1. O payload é montado por inclusão.
// ---------------------------------------------------------------------------
/*
  Um objeto com tudo que NUNCA pode sair. Se o payload passar a ser montado por
  spread ou varredura, estes valores aparecem no resultado e o teste cai.
*/
const SEGREDOS = {
  nomeCliente: 'Mariana Figueiredo Albuquerque',
  cpf: '529.982.247-25',
  telefone: '(11) 98472-6443',
  enderecoObra: 'Rua das Acácias, 412, Vila Mariana',
  email: 'mariana@exemplo.com',
  valorUnitario: '1250,00',
  valorTotal: '18400,00',
  nomeEmpresa: 'LDM CONSTRUTORA',
  cnpjCpf: '12.345.678/0001-90',
}

const payload = saneamento.payloadExtracao({
  ...SEGREDOS,
  tipoServico: 'pintura',
  descricao: 'pintar 40m2 de parede',
})

const chaves = Object.keys(payload).sort()
conferir(
  'payloadExtracao devolve exatamente tipoServico e descricao',
  chaves.length === 2 && chaves[0] === 'descricao' && chaves[1] === 'tipoServico',
  `chaves: ${chaves.join(', ')}`,
)

const serializado = JSON.stringify(payload)
const vazados = Object.entries(SEGREDOS).filter(([, valor]) => serializado.includes(valor))
conferir(
  'nenhum dado sensível sobreviveu',
  vazados.length === 0,
  vazados.length ? `VAZOU: ${vazados.map(([k]) => k).join(', ')}` : `payload = ${serializado}`,
)

const fora = saneamento.chavesForaDaLista(payload)
conferir('nenhuma chave fora da lista permitida', fora.length === 0, fora.join(', ') || 'nenhuma')

// ---------------------------------------------------------------------------
// 1b. O payload da Etapa A: só a DESCRIÇÃO de cada item.
// ---------------------------------------------------------------------------
/*
  O item completo do editor carrega valor unitário — a informação comercial
  mais sensível que o prestador tem. Se um dia payloadTextos passar a mandar o
  objeto inteiro "porque ajuda o modelo", é aqui que se descobre.
*/
const textos = saneamento.payloadTextos({
  ...SEGREDOS,
  tipoServico: 'pintura',
  titulo: 'Pintura do apartamento',
  itens: [
    {
      descricao: 'Pintura de parede interna',
      quantidade: '40',
      unidade: 'm²',
      valorUnitario: '38,50',
      tipo: 'mao_de_obra',
    },
    {
      descricao: 'Massa corrida',
      quantidade: '2',
      unidade: 'sc',
      valorUnitario: '129,90',
      tipo: 'material',
    },
  ],
})
const chavesT = Object.keys(textos).sort()
conferir(
  'payloadTextos devolve exatamente tipoServico, titulo e itens',
  chavesT.length === 3 && chavesT.join(',') === 'itens,tipoServico,titulo',
  `chaves: ${chavesT.join(', ')}`,
)
const serialT = JSON.stringify(textos)
conferir(
  '  os itens saem como texto puro, sem quantidade nem valor',
  textos.itens.every((i) => typeof i === 'string') && !/38,50|129,90|"40"|"2"/.test(serialT),
  serialT.slice(0, 120),
)
const vazadosT = Object.entries(SEGREDOS).filter(([, v]) => serialT.includes(v))
conferir(
  '  nenhum dado sensível sobreviveu',
  vazadosT.length === 0,
  vazadosT.length ? `VAZOU: ${vazadosT.map(([k]) => k).join(', ')}` : 'limpo',
)
conferir(
  '  nenhuma chave fora da lista permitida',
  saneamento.chavesForaDaLista(textos).length === 0,
  saneamento.chavesForaDaLista(textos).join(', ') || 'nenhuma',
)

// ---------------------------------------------------------------------------
// 2. Existe uma porta só para o Gemini.
// ---------------------------------------------------------------------------
/*
  gemini.ts concentra a chave, a cota, o registro de uso e o limite de taxa. Um
  segundo fetch para a API em qualquer outro arquivo passaria por fora dos
  quatro — e é o tipo de atalho que se escreve com a melhor das intenções,
  para "testar rápido", e fica.
*/
function arquivos(dir) {
  const saida = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho))
    else if (/\.tsx?$/.test(nome)) saida.push(caminho)
  }
  return saida
}

const portas = arquivos('src').filter((caminho) => {
  if (caminho.endsWith('src/modules/ia/gemini.ts')) return false
  return readFileSync(caminho, 'utf8').includes('generativelanguage.googleapis.com')
})
conferir(
  'só gemini.ts fala com a API do Gemini',
  portas.length === 0,
  portas.length ? portas.join(', ') : 'nenhum outro arquivo cita o endpoint',
)

// ---------------------------------------------------------------------------
// 3. A chave nunca é lida fora de gemini.ts.
// ---------------------------------------------------------------------------
const leemAChave = arquivos('src').filter(
  (caminho) =>
    !caminho.endsWith('src/modules/ia/gemini.ts') &&
    readFileSync(caminho, 'utf8').includes('GEMINI_API_KEY'),
)
conferir(
  'só gemini.ts lê GEMINI_API_KEY',
  leemAChave.length === 0,
  leemAChave.length ? leemAChave.join(', ') : 'nenhum outro arquivo cita a variável',
)

console.log(
  falhas.length
    ? `\n  ${falhas.length} FALHA(S): ${falhas.join(', ')}\n`
    : 'saneamento ok — payload por inclusão, uma porta só para a IA\n',
)
process.exit(falhas.length ? 1 : 0)
