/**
 * Gate: mexeu no editor ou em sessão, prova que o painel ainda hidrata.
 *
 * ===========================================================================
 * POR QUE ESTE GATE EXISTE
 * ===========================================================================
 * Hidratação quebrada não aparece em `tsc`, em `eslint`, no peso do bundle nem
 * em print de tela. O HTML fica certo, o JavaScript é baixado, e o app
 * simplesmente não responde a toque. É o defeito mais caro do projeto porque é
 * o único que passa por todas as outras redes.
 *
 * `verificar:hidratacao` pega — mas só se alguém rodar. Comentário no README
 * pedindo para rodar é exatamente o que este projeto já decidiu que não
 * funciona. Então: quem empurra mudança em editor, auth ou sessão precisa de um
 * carimbo, e o carimbo só é escrito quando as seis rodadas passam.
 * ===========================================================================
 *
 * O que NÃO é: não roda o teste sozinho. Rodar exige servidor de pé e cria
 * conta descartável no banco — decisão de quem está empurrando, não de um hook
 * silencioso. O gate só recusa avançar sem a prova.
 *
 * Uso: node scripts/exige-hidratacao.mjs   (chamado pelo .githooks/pre-push)
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

/** Onde uma mudança pode matar a hidratação do painel ou a sessão. */
const SENSIVEIS = [
  /^src\/modules\/orcamentos\/componentes\//,
  /^src\/app\/\(painel\)\//,
  /^src\/modules\/auth\//,
  /^src\/app\/auth\//,
  /^src\/lib\/supabase\//,
  /^src\/componentes\/layout\//,
  /^src\/componentes\/ui\//,
  /^src\/proxy\.ts$/,
  /^src\/app\/layout\.tsx$/,
]

const sh = (cmd) =>
  execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()

let alterados = []
try {
  // O que vai subir neste push. Sem upstream (branch nova), olha o último commit.
  const base = (() => {
    try {
      return sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}')
    } catch {
      return 'HEAD~1'
    }
  })()
  alterados = sh(`git diff --name-only ${base}...HEAD`).split('\n').filter(Boolean)
} catch {
  process.exit(0) // sem histórico para comparar: não é hora de barrar ninguém
}

const tocados = alterados.filter((a) => SENSIVEIS.some((r) => r.test(a)))
if (tocados.length === 0) {
  console.log('  hidratação: nada sensível neste push')
  process.exit(0)
}

const cabecote = sh('git rev-parse HEAD')

if (!existsSync('.hidratacao-ok')) {
  console.error('\n  Este push mexe em editor/sessão e não há prova de hidratação.\n')
  for (const a of tocados) console.error(`    ${a}`)
  console.error('\n  Rode, com o servidor de pé:')
  console.error('    BASE=https://app.fechaobra.online npm run verificar:hidratacao\n')
  process.exit(1)
}

const carimbo = JSON.parse(readFileSync('.hidratacao-ok', 'utf8'))

/*
  O carimbo tem que ser DESTE commit. Verde de ontem prova que ontem hidratava —
  e o que se quer saber é se o código que está subindo agora hidrata.
*/
if (carimbo.commit !== cabecote) {
  console.error('\n  A prova de hidratação é de outro commit.\n')
  console.error(`    carimbo: ${String(carimbo.commit).slice(0, 12)} (${carimbo.em})`)
  console.error(`    subindo: ${cabecote.slice(0, 12)}`)
  console.error('\n  Rode de novo depois de commitar:')
  console.error('    BASE=https://app.fechaobra.online npm run verificar:hidratacao\n')
  process.exit(1)
}

console.log(
  `  hidratação: ${carimbo.rodadas} rodadas verdes em ${carimbo.commit.slice(0, 12)} contra ${carimbo.base}`,
)
