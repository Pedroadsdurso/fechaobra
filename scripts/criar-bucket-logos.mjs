/**
 * Cria o bucket privado de logos no Supabase Storage.
 *
 * Roda uma vez por projeto. Idempotente: se o bucket já existir, só confere a
 * configuração e sai.
 *
 * O bucket é PRIVADO. Nada nele é acessível por URL pública — a exibição do
 * logo passa sempre por URL assinada, gerada no servidor com validade curta.
 *
 * Uso: node scripts/criar-bucket-logos.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'logos'
const LIMITE_BYTES = 600 * 1024
const TIPOS = ['image/png', 'image/jpeg']

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.startsWith('SUA_')) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY no .env.local.')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: existentes, error: erroLista } = await admin.storage.listBuckets()
if (erroLista) {
  console.error('erro ao listar buckets:', erroLista.message)
  process.exit(1)
}

const jaExiste = existentes.some((b) => b.id === BUCKET)

if (jaExiste) {
  const { error } = await admin.storage.updateBucket(BUCKET, {
    public: false,
    fileSizeLimit: LIMITE_BYTES,
    allowedMimeTypes: TIPOS,
  })
  if (error) {
    console.error('erro ao atualizar bucket:', error.message)
    process.exit(1)
  }
  console.log(`bucket "${BUCKET}" já existia — configuração conferida`)
} else {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: LIMITE_BYTES,
    allowedMimeTypes: TIPOS,
  })
  if (error) {
    console.error('erro ao criar bucket:', error.message)
    process.exit(1)
  }
  console.log(`bucket "${BUCKET}" criado`)
}

const { data: conferencia } = await admin.storage.listBuckets()
const b = conferencia.find((x) => x.id === BUCKET)
console.log(`  público            : ${b.public}`)
console.log(`  limite por arquivo : ${(b.file_size_limit / 1024).toFixed(0)} KB`)
console.log(`  tipos aceitos      : ${(b.allowed_mime_types ?? []).join(', ')}`)
