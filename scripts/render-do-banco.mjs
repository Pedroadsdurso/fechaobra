/**
 * Renderiza um orçamento REAL do banco em PDF, fora do navegador.
 *
 * Passa pelo mesmo adaptador e pelos mesmos componentes do documento que a
 * aplicação usa — só a origem dos dados muda (service role em vez de sessão).
 * Serve para verificar o arquivo final sem depender do download do navegador.
 *
 * Uso: node scripts/render-do-banco.mjs <id-do-orcamento> [saida.pdf]
 */
import { build } from 'esbuild'
import { readFileSync, mkdirSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const id = process.argv[2]
const saida = process.argv[3] ?? '/tmp/orcamento-do-banco.pdf'
if (!id) {
  console.error('uso: node scripts/render-do-banco.mjs <id-do-orcamento> [saida.pdf]')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: o } = await admin.from('orcamentos')
  .select('*, clientes(*)').eq('id', id).single()
const { data: itens } = await admin.from('orcamento_itens')
  .select('*').eq('orcamento_id', id).order('ordem')
const { data: pacotes } = await admin.from('orcamento_pacotes')
  .select('nivel, rotulo, descricao, destaque').eq('orcamento_id', id)
const { data: perfil } = await admin.from('perfis')
  .select('*').eq('user_id', o.user_id).single()

const rascunho = {
  id: o.id, numero: o.numero, clienteId: o.cliente_id,
  titulo: o.titulo ?? '', tipoServico: o.tipo_servico ?? '',
  localServico: o.local_servico ?? '', validadeDias: String(o.validade_dias),
  dataValidade: o.data_validade ?? '', prazoExecucao: o.prazo_execucao ?? '',
  textoEscopo: o.texto_escopo ?? '', textoExclusoes: o.texto_exclusoes ?? '',
  textoGarantia: o.texto_garantia ?? '', textoCondicoesPagamento: o.texto_condicoes_pagamento ?? '',
  observacoes: o.observacoes ?? '', status: o.status,
  itens: (itens ?? []).map((i) => ({
    id: i.id, descricao: i.descricao, quantidade: String(i.quantidade),
    unidade: i.unidade, valorUnitario: String(i.valor_unitario),
    tipo: i.tipo, pacote: i.pacote,
  })),
  pacotes: (pacotes ?? []).map((p) => ({
    nivel: p.nivel, rotulo: p.rotulo, descricao: p.descricao, destaque: p.destaque,
  })),
}

const temporario = 'node_modules/.cache/fechaobra-banco'
mkdirSync(temporario, { recursive: true })

await build({
  entryPoints: ['src/modules/orcamentos/entrada-render.tsx'],
  outfile: `${temporario}/doc.mjs`,
  bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', target: 'node22',
  external: ['react', 'react-dom', '@react-pdf/renderer'],
  alias: { '@': './src' },
  logLevel: 'warning',
})

const { renderToFile } = await import('@react-pdf/renderer')
const { criarDocumento } = await import(pathToFileURL(`${temporario}/doc.mjs`).href)

await renderToFile(criarDocumento({
  rascunho,
  cliente: o.clientes ? {
    id: o.clientes.id, nome: o.clientes.nome,
    telefone: o.clientes.telefone ?? '', email: o.clientes.email ?? '',
    endereco: o.clientes.endereco ?? '',
  } : null,
  empresa: {
    nome: perfil?.nome_empresa || 'Sua empresa',
    responsavel: perfil?.responsavel ?? undefined,
    telefone: perfil?.telefone ?? undefined,
    email: perfil?.email ?? undefined,
    cnpjCpf: perfil?.cnpj_cpf ?? undefined,
    endereco: perfil?.endereco ?? undefined,
    corPrimaria: perfil?.cor_primaria ?? undefined,
  },
}), saida)

rmSync(temporario, { recursive: true, force: true })
console.log(`orçamento nº ${String(rascunho.numero).padStart(3, '0')} -> ${saida}`)
