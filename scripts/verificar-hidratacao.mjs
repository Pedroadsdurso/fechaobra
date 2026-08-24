/**
 * Verifica que as rotas do painel HIDRATAM e RESPONDEM A CLIQUE.
 *
 * ===========================================================================
 * POR QUE ISTO EXISTE
 * ===========================================================================
 * Nasceu de um susto: durante um refino visual eu concluí que o painel tinha
 * perdido a interatividade em produção. Estava errado — eu media dentro de um
 * navegador que tinha ficado num estado inválido, com extensão carregada e o
 * documento adulterado por mim, e repeti a "confirmação" no mesmo navegador
 * estragado. O app estava íntegro o tempo todo.
 *
 * Mas o susto expôs um buraco real: eu não tinha COMO responder a pergunta
 * "o painel responde a clique?" sem abrir o navegador na mão. Hidratação
 * quebrada é invisível para tudo o que já rodava aqui:
 *
 *   - o `tsc` passa: o código está correto, ele só não executa;
 *   - o `eslint` passa: não há nada de errado com o texto do programa;
 *   - o build passa e gera HTML perfeito — o servidor renderiza tudo;
 *   - o peso do bundle não muda: os arquivos são baixados, só não montam;
 *   - o print da tela fica IDÊNTICO ao de uma página que funciona.
 *
 * Nenhuma verificação de aparência pega isso. Só clicar pega.
 *
 * Duas lições viraram regra aqui dentro:
 *   1. o teste sobe o PRÓPRIO Chrome, com perfil temporário e sem extensões,
 *      porque o instrumento contaminado foi o que me enganou;
 *   2. anomalia impossível é motivo para suspeitar do instrumento, não para
 *      tratar como dado.
 * ===========================================================================
 *
 * Como funciona: sobe um Chrome headless com depuração remota e fala CDP por
 * WebSocket — que o Node 22 tem embutido. Nenhuma dependência nova.
 *
 * As provas rodam no MUNDO DA PÁGINA (Runtime.evaluate), não num mundo
 * isolado de extensão. Isso importa: as chaves __react* que o React põe nos
 * nós do DOM são invisíveis de fora do mundo da página, e eu já me enganei
 * com isso durante a investigação.
 *
 * A conta é DESCARTÁVEL: o teste cria a dele no começo e apaga no fim, com
 * os dados que gerou. Conta permanente vira lixo no banco e, quando houver
 * cliente pagante, vira ruído na contagem de usuários. A limpeza roda em
 * `finally`, então acontece mesmo quando uma prova falha.
 *
 * De quebra, criar a conta pela interface exercita o cadastro de verdade —
 * se o cadastro quebrar, o teste também acusa.
 *
 * Rode ANTES E DEPOIS de todo deploy. As duas leituras respondem perguntas
 * diferentes: antes diz se o problema já existia, depois diz se foi você que
 * o criou. Sem as duas, um alarme não distingue regressão de defeito antigo —
 * foi exatamente essa informação que faltou no susto acima.
 *
 * Uso:
 *   npm run verificar:hidratacao
 *   BASE=https://fechaobraa.vercel.app npm run verificar:hidratacao
 *
 * Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no
 * ambiente (o script npm carrega .env.local). A chave de serviço só é usada
 * para APAGAR a conta no fim — criar é pela tela, como um usuário faria.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createClient } from '@supabase/supabase-js'

const BASE = process.env.BASE || 'http://localhost:3000'
const PORTA = 9333

/** Conta descartável desta execução. */
const EMAIL = `teste-hidratacao-${Date.now()}@fechaobra.test`
const SENHA = 'HidratacaoDescartavel#2026'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/**
 * As rotas e o que provar em cada uma.
 *
 * `prova` roda no navegador. Devolve { ok, detalhe }. Tem que depender de
 * ESTADO do React: um clique que muda algo. Verificar que o elemento existe
 * não serve — ele existe no HTML do servidor mesmo sem hidratar.
 */
const ROTAS = [
  {
    caminho: '/painel',
    prova: `(() => {
      const link = [...document.querySelectorAll('a')].find(a => /Orçamentos/.test(a.textContent))
      return { ok: !!link && temReact(link), detalhe: 'navegação do painel montada' }
    })()`,
  },
  {
    caminho: '/painel/clientes',
    prova: `(async () => {
      const b = [...document.querySelectorAll('button')].find(x => /Novo cliente/.test(x.textContent))
      if (!b) return { ok: false, detalhe: 'botão "Novo cliente" não existe nem no HTML' }
      if (!temReact(b)) return { ok: false, detalhe: 'botão existe no HTML mas o React não o montou' }
      b.click()
      await esperar(() => [...document.querySelectorAll('dialog')].some(d => d.open))
      const abriu = [...document.querySelectorAll('dialog')].some(d => d.open)
      return { ok: abriu, detalhe: abriu ? 'diálogo abriu no clique' : 'clicou e o diálogo não abriu' }
    })()`,
  },
  {
    caminho: '/painel/orcamentos',
    prova: `(async () => {
      const campo = document.querySelector('input[type=search]')
      if (!campo) return { ok: false, detalhe: 'campo de busca ausente' }
      if (!temReact(campo)) return { ok: false, detalhe: 'campo existe mas o React não o montou' }
      // Escopo em <main>: o <li> solto contava a navegação lateral, e o teste
      // passava pelo motivo errado — filtrar a lista some com cartões, não
      // com itens de menu.
      const contar = () => document.querySelectorAll('main li').length
      const antes = contar()
      if (antes === 0) return { ok: false, detalhe: 'a lista chegou vazia — nada para filtrar' }
      digitar(campo, 'zzzznaoexistezzz')
      await esperar(() => contar() !== antes)
      const depois = contar()
      return {
        ok: depois < antes,
        detalhe: 'busca filtrou os cartões: ' + antes + ' -> ' + depois,
      }
    })()`,
  },
  {
    caminho: '/painel/marca',
    prova: `(async () => {
      const campo = [...document.querySelectorAll('input')].find(e => /empresa|nome/i.test(e.name || ''))
      if (!campo) return { ok: false, detalhe: 'campo do nome da empresa ausente' }
      if (!temReact(campo)) return { ok: false, detalhe: 'campo existe mas o React não o montou' }
      const antes = campo.value
      digitar(campo, antes + 'X')
      await esperar(() => campo.value === antes + 'X')
      const mudou = campo.value === antes + 'X'
      digitar(campo, antes)
      return { ok: mudou, detalhe: mudou ? 'campo controlado respondeu' : 'campo não aceitou digitação' }
    })()`,
  },
  {
    caminho: 'PRIMEIRO_ORCAMENTO',
    prova: `(async () => {
      const b = [...document.querySelectorAll('button')].find(x => /Adicionar item/.test(x.textContent))
      if (!b) return { ok: false, detalhe: 'botão "Adicionar item" ausente' }
      if (!temReact(b)) return { ok: false, detalhe: 'botão existe mas o React não o montou' }
      const antes = document.querySelectorAll('input[placeholder*="Descrição"]').length
      b.click()
      await esperar(() => document.querySelectorAll('input[placeholder*="Descrição"]').length > antes)
      const depois = document.querySelectorAll('input[placeholder*="Descrição"]').length
      return {
        ok: depois > antes,
        detalhe: 'adicionar item criou linha: ' + antes + ' -> ' + depois,
      }
    })()`,
  },
]

/** Utilidades injetadas na página antes de cada prova. */
const AJUDANTES = `
  window.temReact = (el) => !!el && Object.keys(el).some(k => k.startsWith('__react'));
  window.esperar = async (cond, ms = 4000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) { if (cond()) return true; await new Promise(r => setTimeout(r, 80)) }
    return false;
  };
  window.digitar = (el, valor) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`

// ---------------------------------------------------------------------------

let proximoId = 1
function conversar(ws) {
  const pendentes = new Map()
  ws.addEventListener('message', (evento) => {
    const msg = JSON.parse(evento.data)
    const p = pendentes.get(msg.id)
    if (p) {
      pendentes.delete(msg.id)
      if (msg.error) p.rejeitar(new Error(msg.error.message))
      else p.resolver(msg.result)
    }
  })
  return (metodo, params = {}) =>
    new Promise((resolver, rejeitar) => {
      const id = proximoId++
      pendentes.set(id, { resolver, rejeitar })
      ws.send(JSON.stringify({ id, method: metodo, params }))
    })
}

async function avaliar(cdp, expressao) {
  const r = await cdp('Runtime.evaluate', {
    expression: expressao,
    awaitPromise: true,
    returnByValue: true,
  })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'erro')
  return r.result.value
}

async function irPara(cdp, url) {
  await cdp('Page.navigate', { url })
  // Espera a rede sossegar; hidratação acontece depois do load.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250))
    const pronto = await avaliar(cdp, `document.readyState === 'complete'`).catch(() => false)
    if (pronto) break
  }
  await new Promise((r) => setTimeout(r, 2500))
}

/**
 * Dispara algo que NAVEGA a página, sem esperar a resposta.
 *
 * `avaliar` usa awaitPromise: o navegador nunca devolve o resultado de uma
 * expressão cuja execução acaba num document novo, e a chamada CDP fica
 * pendurada para sempre. Foi assim que a primeira versão desta rodada travou o
 * teste por dez minutos em vez de falhar.
 */
async function disparar(cdp, expressao) {
  await cdp('Runtime.evaluate', { expression: expressao, awaitPromise: false }).catch(() => null)
}

/** Espera a rota mudar, contando do lado de fora da página. */
async function esperarRota(cdp, regex, ms = 20000) {
  const fim = Date.now() + ms
  while (Date.now() < fim) {
    await new Promise((r) => setTimeout(r, 300))
    const rota = await cdp('Runtime.evaluate', {
      expression: 'location.pathname',
      returnByValue: true,
    })
      .then((r) => r.result?.value)
      .catch(() => null)
    if (rota && regex.test(rota)) return rota
  }
  return null
}

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

/** Apaga a conta do teste e tudo o que ela gerou. */
async function limpar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) {
    console.error(`\n  NÃO CONSEGUI APAGAR ${EMAIL} — falta a chave de serviço no ambiente.`)
    console.error('  Apague à mão para não deixar lixo no banco.\n')
    return
  }

  const admin = createClient(url, chave, { auth: { persistSession: false } })
  await admin.from('liberacoes').delete().eq('email', EMAIL)
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  const conta = data?.users.find((u) => u.email === EMAIL)
  if (!conta) return

  /*
    Itens, eventos e pacotes caem por ON DELETE CASCADE quando o orçamento
    some — não preciso apagar um a um. Eu tinha escrito as três chamadas à
    mão, e uma delas apontava para `itens_orcamento`, tabela que não existe
    (o nome é `orcamento_itens`). Não quebrou nada porque a cascata já fazia
    o trabalho, mas era código errado que parecia estar cuidando de algo.
  */
  const { error: erroOrcamentos } = await admin.from('orcamentos').delete().eq('user_id', conta.id)
  const { error: erroClientes } = await admin.from('clientes').delete().eq('user_id', conta.id)
  const { error: erroConta } = await admin.auth.admin.deleteUser(conta.id)

  const falha = erroOrcamentos ?? erroClientes ?? erroConta
  if (falha) {
    console.error(`\n  NÃO CONSEGUI APAGAR ${EMAIL}: ${falha.message}`)
    console.error('  Apague à mão para não deixar lixo no banco.\n')
  }
}

async function principal() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Falta SUPABASE_SERVICE_ROLE_KEY — sem ela o teste deixaria a conta no banco.')
    process.exit(2)
  }

  const perfil = mkdtempSync(join(tmpdir(), 'fo-hidratacao-'))
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    '--headless=new',
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1280,900',
    /*
      SEM ESTAS TRÊS FLAGS, O TESTE MENTE.

      Medido: depois de uma troca de sessão, o Chrome headless passa a tratar
      a aba como oculta — `document.visibilityState` vira 'hidden'. O
      scheduler do React adia trabalho não urgente em página oculta, e a
      hidratação simplesmente não acontece. O sintoma é idêntico ao do defeito
      que este script existe para caçar: HTML certo, JS baixado, clique morto.

      A prova é causal: mesma sequência, mesma máquina, mudando SÓ as flags —
      sem elas visibilityState=hidden e a página não hidrata; com elas
      visibilityState=visible e hidrata em ~300ms. Em Chrome com janela, os
      mesmos passos hidratam sempre, com ou sem flag.

      Isto não afrouxa nada: só impede o navegador de desligar a aba que
      estamos medindo.
    */
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    'about:blank',
  ])
  chrome.on('error', (e) => {
    console.error('não consegui subir o Chrome:', e.message)
    process.exit(2)
  })

  let alvo
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      const lista = await fetch(`http://127.0.0.1:${PORTA}/json/list`).then((r) => r.json())
      alvo = lista.find((t) => t.type === 'page')
      if (alvo) break
    } catch {
      /* ainda subindo */
    }
  }
  if (!alvo) {
    console.error('Chrome não respondeu na porta de depuração.')
    chrome.kill()
    process.exit(2)
  }

  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  const cdp = conversar(ws)
  await cdp('Page.enable')
  await cdp('Runtime.enable')

  const falhas = []
  try {
    // ---- cria a conta descartável pela própria tela ----
    await irPara(cdp, `${BASE}/cadastro`)
    await avaliar(cdp, AJUDANTES)
    const criou = await avaliar(
      cdp,
      `(async () => {
        const i = [...document.querySelectorAll('input')];
        const nome = i.find(e => e.name === 'nomeEmpresa');
        const email = i.find(e => e.name === 'email');
        const senha = i.find(e => e.name === 'senha');
        if (!nome || !email || !senha) return 'formulário de cadastro não encontrado';
        if (!temReact(email)) return 'o próprio /cadastro não hidratou';
        digitar(nome, 'Teste de Hidratação');
        digitar(email, ${JSON.stringify(EMAIL)});
        digitar(senha, ${JSON.stringify(SENHA)});
        nome.form.requestSubmit();
        await esperar(() => location.pathname.startsWith('/painel'), 20000);
        return location.pathname.startsWith('/painel') ? 'ok' : 'não entrou: ' + location.pathname;
      })()`,
    )
    if (criou !== 'ok') {
      console.error(`\n  não consegui criar a conta de teste — ${criou}\n`)
      falhas.push({ caminho: '/cadastro', detalhe: criou })
    }

    /*
      A conta descartável nasce SEM liberação e cairia em /acesso, e o teste
      mediria a tela de bloqueio achando que mediu o painel.

      A liberação é inserida com service role, como o webhook faria. Isto não
      afrouxa o gate: ele foi provado à parte em verificar:acesso, com prova
      causal. Aqui a liberação é pré-condição do que se quer medir, não o
      objeto da medição.
    */
    const { data: contas } = await adminSupabase().auth.admin.listUsers({ perPage: 1000 })
    const conta = contas?.users.find((u) => u.email === EMAIL)
    if (conta) {
      await adminSupabase()
        .from('liberacoes')
        .insert({ email: EMAIL, user_id: conta.id, status: 'ativa', pedido_id: 'teste-hidratacao' })
    }

    // ---- cria um orçamento, para a rota do editor ter o que abrir ----
    await irPara(cdp, `${BASE}/painel/orcamentos`)
    await avaliar(cdp, AJUDANTES)
    await avaliar(
      cdp,
      `(async () => {
        const f = [...document.querySelectorAll('form')].find(x => /Criar orçamento|Novo orçamento/i.test(x.textContent));
        if (f) { f.requestSubmit(); await esperar(() => /\\/painel\\/orcamentos\\/[0-9a-f-]{36}/.test(location.pathname), 20000) }
        return location.pathname;
      })()`,
    )

    await irPara(cdp, `${BASE}/painel/orcamentos`)
    const href = await avaliar(
      cdp,
      `(document.querySelector('a[href*="/painel/orcamentos/"]') || {}).getAttribute
         ? document.querySelector('a[href*="/painel/orcamentos/"]').getAttribute('href') : ''`,
    )

    console.log(`\n  hidratação — ${BASE}\n`)

    for (const rota of ROTAS) {
      const caminho = rota.caminho === 'PRIMEIRO_ORCAMENTO' ? href : rota.caminho
      if (!caminho) {
        console.log('  ?  (sem orçamento para testar o editor)')
        continue
      }

      await irPara(cdp, `${BASE}${caminho}`)
      await avaliar(cdp, AJUDANTES)

      let r
      try {
        r = await avaliar(cdp, rota.prova)
      } catch (e) {
        r = { ok: false, detalhe: 'a prova lançou: ' + e.message.split('\n')[0] }
      }

      console.log(`  ${r.ok ? 'ok  ' : 'FALHA'} ${caminho.padEnd(38)} ${r.detalhe}`)
      if (!r.ok) falhas.push({ caminho, detalhe: r.detalhe })
    }

    /*
      ================================================================
      A RODADA DA SEGUNDA SESSÃO
      ================================================================
      Tudo acima roda numa sessão só, recém-aberta. É o caminho feliz e não
      cobre o que o usuário faz de verdade: sair da conta e entrar de novo,
      ou trocar de conta, no mesmo navegador.

      Esse cenário chegou a parecer quebrado numa investigação — e era o
      instrumento (ver o bloco das flags acima). Mas a lição fica: se um dia
      quebrar de verdade, o editor fica morto e a pessoa acha que o app
      acabou. As rodadas acima não pegariam, porque cada uma nasce num
      navegador novo.

      Sai pelo MESMO botão que o usuário usa — um form POST para /auth/sair —
      e entra de novo pela tela de login, no mesmo Chrome, com o mesmo perfil.
      ================================================================
    */
    if (href) {
      /*
        O MESMO botão do usuário: um form POST para /auth/sair, que responde
        303 para /entrar. É navegação de documento, então vai por `disparar`.
      */
      await disparar(cdp, `document.querySelector('[aria-label="Sair da conta"]')?.click()`)
      const saiu = await esperarRota(cdp, /^\/entrar/)

      if (!saiu) {
        falhas.push({ caminho: 'sair da conta', detalhe: 'o botão de sair não levou a /entrar' })
      } else {
        await irPara(cdp, `${BASE}/entrar`)
        await avaliar(cdp, AJUDANTES)
        await disparar(
          cdp,
          `(() => {
            const i = [...document.querySelectorAll('input')];
            digitar(i.find(e => e.name === 'email'), ${JSON.stringify(EMAIL)});
            digitar(i.find(e => e.name === 'senha'), ${JSON.stringify(SENHA)});
            i[0].form.requestSubmit();
          })()`,
        )
        const voltou = await esperarRota(cdp, /^\/painel/)
        if (!voltou) {
          falhas.push({
            caminho: 'entrar de novo',
            detalhe: 'o login na segunda sessão não completou',
          })
        }
      }

      await irPara(cdp, `${BASE}${href}`)
      await avaliar(cdp, AJUDANTES)
      let r2
      try {
        r2 = await avaliar(cdp, ROTAS[ROTAS.length - 1].prova)
      } catch (e) {
        r2 = { ok: false, detalhe: 'a prova lançou: ' + e.message.split('\n')[0] }
      }
      const rotulo = 'editor após sair e entrar de novo'
      console.log(`  ${r2.ok ? 'ok  ' : 'FALHA'} ${rotulo.padEnd(38)} ${r2.detalhe}`)
      if (!r2.ok) falhas.push({ caminho: rotulo, detalhe: r2.detalhe })
    }
  } finally {
    ws.close()
    chrome.kill()
    try {
      rmSync(perfil, { recursive: true, force: true })
    } catch {
      /* tudo bem */
    }
    // Roda mesmo quando uma prova falha: a conta não pode sobreviver ao teste.
    await limpar()
  }

  if (falhas.length) {
    console.error(`\n  ${falhas.length} rota(s) sem hidratar. O painel não responde a clique.\n`)
    console.error('  Isto não aparece em print, no tsc, no lint nem no peso do bundle.')
    console.error('  O HTML está certo e o JavaScript foi baixado — ele só não montou.\n')
    process.exit(1)
  }

  console.log('\n  todas as rotas hidratam e respondem a clique\n')
}

principal()
