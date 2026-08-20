/**
 * Gera src/lib/tipos-banco.ts a partir do schema do Supabase remoto.
 *
 * Chamada 100% remota (API do Supabase) — não precisa de Docker nem de
 * Supabase local. Lê SUPABASE_PROJECT_ID do .env.local.
 *
 * Uso: npm run tipos
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const DESTINO = 'src/lib/tipos-banco.ts'

function lerEnvLocal() {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((linha) => linha.trim() && !linha.trim().startsWith('#'))
        .map((linha) => {
          const separador = linha.indexOf('=')
          return [linha.slice(0, separador).trim(), linha.slice(separador + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = lerEnvLocal()
const projectId = process.env.SUPABASE_PROJECT_ID || env.SUPABASE_PROJECT_ID

if (!projectId || projectId === 'SEU_PROJECT_ID_AQUI') {
  console.error(
    '\n  Falta o SUPABASE_PROJECT_ID no .env.local.\n' +
      '  É a referência do projeto — o subdomínio da sua NEXT_PUBLIC_SUPABASE_URL.\n' +
      '  Ex.: https://abcdefghijklmnop.supabase.co  ->  abcdefghijklmnop\n',
  )
  process.exit(1)
}

console.log(`  Gerando tipos do projeto ${projectId}...`)

const saida = execFileSync(
  'npx',
  ['--yes', 'supabase@latest', 'gen', 'types', 'typescript', '--project-id', projectId],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
)

writeFileSync(DESTINO, saida)
console.log(`  Tipos escritos em ${DESTINO}`)
