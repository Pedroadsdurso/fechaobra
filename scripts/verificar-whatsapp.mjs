/**
 * Nenhuma âncora de wa.me pode usar target="_blank".
 *
 * ===========================================================================
 * POR QUE ISTO É CHECK E NÃO COMENTÁRIO
 * ===========================================================================
 * O achado é do dialogo-envio.tsx: o wa.me é universal link, o iOS o
 * intercepta e passa para o WhatsApp, e numa aba nova essa passagem falha com
 * frequência — sobra aba em branco e o app não abre.
 *
 * Aquilo foi corrigido num arquivo. Meses depois a página pública inteira
 * ainda estava com o mesmo defeito, inclusive o "Falar com o prestador" do
 * pós-aceite, porque a correção nunca virou regra verificável — e eu mesmo
 * reintroduzi o bug copiando uma âncora antiga ao escrever o fluxo da dúvida.
 *
 * Duas vezes o mesmo defeito, em lugares diferentes, é sinal de que o
 * comentário não segura. Isto segura.
 * ===========================================================================
 *
 * COMO DECIDE, e onde é aproximado: só olha arquivos que mexem com WhatsApp.
 * Dentro deles, uma âncora com target="_blank" só passa se o href for interno
 * — começando com "/" — que é o caso do "Ver em PDF", onde abrir noutra aba é
 * o certo: ninguém quer perder o orçamento para ler o anexo.
 *
 * O href do WhatsApp nunca é literal (vem de linkWhatsApp), então "não é
 * caminho interno" separa os dois casos sem precisar resolver a expressão.
 *
 * Uso: npm run verificar:whatsapp (roda dentro do build)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = 'src'
const PISTAS = ['wa.me', 'linkWhatsApp', 'linkDuvida', 'contatoWhatsApp']

function arquivos(dir) {
  const saida = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho))
    else if (nome.endsWith('.tsx')) saida.push(caminho)
  }
  return saida
}

const problemas = []
let examinados = 0

for (const caminho of arquivos(RAIZ)) {
  const texto = readFileSync(caminho, 'utf8')
  if (!PISTAS.some((p) => texto.includes(p))) continue
  examinados++

  /*
    Comentário não é código. Sem isto, o próprio texto que explica a regra
    ("SEM target=\"_blank\", e isso é achado medido…") era contado como
    violação — três dos quatro achados da primeira execução eram os avisos
    contra o defeito, não o defeito.
  */
  const semComentarios = texto
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '')

  const linhas = semComentarios.split('\n')
  linhas.forEach((linha, i) => {
    if (!linha.includes('target="_blank"')) return

    // Sobe até a abertura da âncora para achar o href correspondente.
    let href = null
    for (let j = i; j >= 0 && j > i - 15; j--) {
      const m = linhas[j].match(/href=\{?["'`]?([^"'`}\n]*)/)
      if (m) {
        href = m[1]
        break
      }
      if (linhas[j].includes('<a')) break
    }

    const interno = href !== null && (href.startsWith('/') || href.startsWith('#'))
    if (!interno) {
      problemas.push({ caminho, linha: i + 1, href: href ?? '(não identifiquei o href)' })
    }
  })
}

if (problemas.length) {
  console.error('\n  target="_blank" em âncora de WhatsApp — o link não abre o app no iPhone:\n')
  for (const p of problemas) {
    console.error(`    ${p.caminho}:${p.linha}  href=${p.href}`)
  }
  console.error('\n  Tire o target="_blank" e deixe rel="noopener". Ver a regra no README.\n')
  process.exit(1)
}

console.log(`whatsapp ok — ${examinados} arquivos com link de WhatsApp, nenhum abre em aba nova`)
