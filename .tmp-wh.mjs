/* O webhook com produtos: libera por produto, revoga só o do pedido.
   Roda o código REAL de processar-cakto, importado via um servidor Next? Não —
   o módulo é server-only. Então o teste bate na ROTA do webhook, que é o
   caminho de produção inteiro: assinatura, idempotência, liberação. */
import { createClient } from '@supabase/supabase-js'
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const BASE='http://localhost:3100'
const SEGREDO=process.env.CAKTO_WEBHOOK_SECRET
if(!SEGREDO){console.log('  CAKTO_WEBHOOK_SECRET ausente no .env.local — não dá para testar a rota');process.exit(2)}
const marca=Date.now(), EMAIL=`wh-${marca}@fechaobra.test`
let falhas=[]
const conferir=(n,ok,d)=>{console.log(`  ${ok?'ok   ':'FALHA'} ${n} — ${d}`);if(!ok)falhas.push(n)}
const evento=(tipo,pedidoId,produtoId)=>({secret:SEGREDO,event:tipo,data:[{
  id:pedidoId,status:'paid',refundedAt:null,chargedbackAt:null,
  customer:{email:EMAIL,name:'WH Teste'},
  product:produtoId?{id:produtoId,name:'Teste',type:'unique',short_id:'X'}:undefined,
  offer:{id:'oferta',name:'Teste',price:47,currency:'BRL'}}]})
const mandar=(c)=>fetch(`${BASE}/api/webhook/cakto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)})
const ativos=async()=>((await admin.from('recursos_liberados').select('recurso,status,pedido_id').eq('email',EMAIL)).data??[])
  .filter(r=>r.status==='ativa').map(r=>r.recurso).sort()
const vitalicio=async()=>(await admin.from('liberacoes').select('status').eq('email',EMAIL).maybeSingle()).data?.status
try{
  // 1. vitalício de R$ 47 — produto fora do catálogo
  await mandar(evento('purchase_approved',`ped-vit-${marca}`,'PRODUTO-QUALQUER-47'))
  conferir('vitalício liberado', (await vitalicio())==='ativa', `liberacoes.status=${await vitalicio()}`)
  conferir('  e nenhum recurso concedido', (await ativos()).length===0, 'produto fora do catálogo não concede')

  // 2. order bump
  await mandar(evento('purchase_approved',`ped-bump-${marca}`,'PROD-BUMP-TESTE'))
  conferir('bump concede os quatro recursos',
    (await ativos()).join(',')==='contratos,ia_orcamento,ia_textos,recuperacao', (await ativos()).join(', '))

  // 3. upsell
  await mandar(evento('purchase_approved',`ped-audio-${marca}`,'PROD-AUDIO-TESTE'))
  conferir('upsell soma ia_audio', (await ativos()).includes('ia_audio'), (await ativos()).join(', '))

  // 4. O QUE IMPORTA: reembolso do upsell não toca no bump nem no vitalício
  await mandar(evento('refund',`ped-audio-${marca}`,'PROD-AUDIO-TESTE'))
  const depois=await ativos()
  conferir('REEMBOLSO DO UPSELL: só ia_audio caiu', !depois.includes('ia_audio'), `restaram: ${depois.join(', ')}`)
  conferir('  os quatro do bump seguem ativos',
    ['contratos','ia_orcamento','ia_textos','recuperacao'].every(r=>depois.includes(r)), depois.join(', '))
  conferir('  e o vitalício segue ativo', (await vitalicio())==='ativa', `liberacoes.status=${await vitalicio()}`)

  // 5. nada foi apagado — a linha revogada continua existindo
  const todas=(await admin.from('recursos_liberados').select('recurso,status').eq('email',EMAIL)).data??[]
  const rev=todas.find(r=>r.recurso==='ia_audio')
  conferir('nada é apagado: ia_audio continua na tabela, como revogada',
    rev?.status==='revogada', `${todas.length} linhas, ia_audio=${rev?.status}`)
} finally {
  await admin.from('recursos_liberados').delete().eq('email',EMAIL)
  await admin.from('liberacoes').delete().eq('email',EMAIL)
  await admin.from('eventos_cakto').delete().like('pedido_id',`ped-%-${marca}`)
  console.log('\n  dados de teste removidos')
}
console.log(`  ${falhas.length? falhas.length+' FALHA(S): '+falhas.join(', '):'liberação por produto e revogação cirúrgica provadas'}\n`)
process.exit(falhas.length?1:0)
