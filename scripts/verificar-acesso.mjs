/**
 * Verifica que o gate de acesso barra a CHAMADA DIRETA da Server Action.
 *
 * ===========================================================================
 * AFIRME SOBRE O MECANISMO, NÃO SOBRE O RESULTADO
 * ===========================================================================
 * A regra que este arquivo existe para lembrar, e que nasceu de um teste meu
 * que quase passou por engano.
 *
 * Ao testar "compra aprovada depois de reembolso não reativa o acesso", eu
 * afirmei só sobre o resultado: status continua 'revogada'. Ficou verde. Mas
 * a razão estava errada — quem barrou foi a IDEMPOTÊNCIA (aquele pedido já
 * tinha sido processado), não a guarda de revogado. A guarda nunca rodou.
 *
 * O caso só apareceu porque uma segunda afirmação olhava o caminho:
 * `processado === false`, que a idempotência não produz. Sem ela, o teste
 * teria ficado verde para sempre enquanto a guarda apodrecia — e o dia em que
 * a idempotência mudasse de lugar, o acesso voltaria sozinho para quem pediu
 * o dinheiro de volta.
 *
 * Então: toda prova aqui verifica COMO, não só O QUÊ. E quando existe um
 * caminho alternativo que produziria o mesmo resultado, o teste o desliga
 * para isolar o que quer medir.
 * ===========================================================================
 *
 * Por que sessão de navegador de verdade: /entrar e /cadastro são Server
 * Actions, não formulários POST clássicos. A primeira versão deste teste
 * mandava POST com URLSearchParams, nunca criava sessão, e devolvia quatro
 * "ok" que na verdade descreviam a página de login. Teste verde sobre a tela
 * errada é pior que teste nenhum.
 *
 * Uso: npm run verificar:acesso
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createClient } from '@supabase/supabase-js'

const BASE = process.env.BASE || 'http://localhost:3000'
const PORTA = 9338
const SENHA = 'GateDescartavel#2026'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const marca = Date.now()
const LIBERADA = `gate-lib-${marca}@fechaobra.test`
const BLOQUEADA = `gate-sem-${marca}@fechaobra.test`
/*
  A conta do terceiro caso: comprou o FechaObra e MAIS NADA.

  É o cliente mais comum que vai existir — quem passou pelo checkout sem
  marcar nenhuma caixinha. Até agora nenhum teste cobria essa conta, e foi
  exatamente por isso que "a IA está aberta para quem não pagou o bump" não
  teve como ser respondido sem alguém abrir o banco na mão.
*/
const SO_VITALICIO = `gate-ia-${marca}@fechaobra.test`

/** O `d` do IconeCadeado. É por ele que se conta cadeado no HTML. */
const CADEADO = 'M8 10.5V7.5a4 4 0 0 1 8 0v3'

/*
  As duas ações de IA se identificam sozinhas.

  Não há como saber, de fora, qual `$ACTION_ID_…` do HTML é qual função — e
  chutar seria montar um teste que fica verde sobre a ação errada. Mas as duas
  recusam entrada inválida com uma frase própria, ANTES de falar com o Gemini.
  Então: manda-se um corpo propositalmente inválido para cada id com a conta
  que TEM o recurso, e quem responder a frase é a função procurada.

  De quebra, nenhuma chamada deste teste chega ao Gemini — não gasta cota nem
  depende de rede externa para ficar verde.
*/
const ACOES_IA = [
  {
    nome: 'extrairItensDoTexto',
    recurso: 'ia_orcamento',
    // descricao com menos de 10 caracteres: recusada na validação.
    corpo: JSON.stringify([{ tipoServico: 'pintura', descricao: 'curto' }]),
    frase: 'Escreva um pouco mais sobre o serviço',
  },
  {
    nome: 'gerarTextosDoOrcamento',
    recurso: 'ia_textos',
    // itens vazio: recusado na validação.
    corpo: JSON.stringify([{ tipoServico: 'pintura', titulo: 'Teste', itens: [] }]),
    frase: 'Inclua ao menos um item',
  },
]

const falhas = []
const conferir = (nome, passou, detalhe) => {
  console.log(`  ${passou ? 'ok   ' : 'FALHA'} ${nome} — ${detalhe}`)
  if (!passou) falhas.push(nome)
}

let proximoId = 1
function conversar(ws) {
  const p = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    const x = p.get(m.id)
    if (x) {
      p.delete(m.id)
      if (m.error) x.rej(new Error(m.error.message))
      else x.res(m.result)
    }
  })
  return (metodo, params = {}) =>
    new Promise((res, rej) => {
      const i = proximoId++
      p.set(i, { res, rej })
      ws.send(JSON.stringify({ id: i, method: metodo, params }))
    })
}

async function principal() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )

  const perfil = mkdtempSync(join(tmpdir(), 'fo-gate-'))
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    '--headless=new',
    '--no-first-run',
    '--disable-extensions',
    'about:blank',
  ])

  let alvo
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      alvo = (await fetch(`http://127.0.0.1:${PORTA}/json/list`).then((r) => r.json())).find(
        (t) => t.type === 'page',
      )
      if (alvo) break
    } catch {
      /* subindo */
    }
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  const cdp = conversar(ws)
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Network.enable')

  const ir = async (u) => {
    await cdp('Page.navigate', { url: u })
    await new Promise((r) => setTimeout(r, 3000))
  }
  const ev = async (e) => {
    const r = await cdp('Runtime.evaluate', {
      expression: e,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'erro')
    return r.result.value
  }
  const esperarRota = async (re, ms = 20000) => {
    const fim = Date.now() + ms
    while (Date.now() < fim) {
      await new Promise((r) => setTimeout(r, 300))
      const p = await ev('location.pathname').catch(() => null)
      if (p && re.test(p)) return p
    }
    return null
  }

  /**
   * Espera o elemento existir, em vez de dormir um tempo fixo.
   *
   * Contra localhost os 3s do `ir()` bastavam. Contra produção não: a primeira
   * carga é mais lenta, os campos ainda não estavam no DOM, o `find` devolvia
   * undefined e o setter nativo estourava com "Illegal invocation" — que
   * parece falha do produto e é falha do instrumento. Espera com condição não
   * fica lenta quando a página é rápida nem falsa quando é devagar.
   */
  const esperarElemento = async (seletor, ms = 20000) => {
    const fim = Date.now() + ms
    while (Date.now() < fim) {
      if (
        await ev(`Boolean(document.querySelector(${JSON.stringify(seletor)}))`).catch(() => false)
      ) {
        return true
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    return false
  }

  /** Cadastra pela tela e devolve o cookie de sessão (httpOnly — só via CDP). */
  async function criarSessao(email) {
    await cdp('Network.clearBrowserCookies')
    await ir(`${BASE}/cadastro`)
    if (!(await esperarElemento('input[name="senha"]'))) {
      throw new Error(`/cadastro não renderizou os campos em ${BASE}`)
    }
    await ev(
      `window.digitar=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))}`,
    )
    await ev(`(()=>{const i=[...document.querySelectorAll('input')];
      digitar(i.find(e=>e.name==='nomeEmpresa'),'Gate Teste');
      digitar(i.find(e=>e.name==='email'),${JSON.stringify(email)});
      digitar(i.find(e=>e.name==='senha'),${JSON.stringify(SENHA)});
      i[0].form.requestSubmit(); return 1})()`)
    if (!(await esperarRota(/^\/painel|^\/acesso/))) throw new Error(`cadastro de ${email} falhou`)
    const { cookies } = await cdp('Network.getCookies', { urls: [BASE] })
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  }

  const contas = {}
  try {
    console.log('\n  === GATE CONTRA CHAMADA DIRETA ===\n')

    contas.bloqueada = { email: BLOQUEADA, cookie: await criarSessao(BLOQUEADA) }
    contas.liberada = { email: LIBERADA, cookie: await criarSessao(LIBERADA) }
    contas.soVitalicio = { email: SO_VITALICIO, cookie: await criarSessao(SO_VITALICIO) }

    const { data: us } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const c of Object.values(contas)) {
      c.userId = us.users.find((u) => u.email === c.email)?.id
    }
    await admin.from('liberacoes').insert([
      {
        email: LIBERADA,
        user_id: contas.liberada.userId,
        status: 'ativa',
        pedido_id: `gate-${marca}`,
      },
      /*
        A terceira conta recebe o vitalício e NADA em recursos_liberados. É a
        diferença inteira entre ela e a `liberada`, que ganha os dois módulos
        de IA logo abaixo — e é o que torna a comparação entre as duas uma
        prova, e não uma coincidência.
      */
      {
        email: SO_VITALICIO,
        user_id: contas.soVitalicio.userId,
        status: 'ativa',
        pedido_id: `gate-ia-${marca}`,
      },
    ])
    await admin.from('recursos_liberados').insert(
      ['ia_textos', 'ia_orcamento'].map((recurso) => ({
        email: LIBERADA,
        user_id: contas.liberada.userId,
        recurso,
        status: 'ativa',
        pedido_id: `gate-${marca}`,
      })),
    )

    conferir(
      'preparo: três sessões reais',
      Object.values(contas).every((c) => c.cookie && c.userId),
      'cookies httpOnly capturados via CDP',
    )

    // ---- a interface -----------------------------------------------------
    const rLib = await fetch(`${BASE}/painel/orcamentos`, {
      headers: { cookie: contas.liberada.cookie },
      redirect: 'manual',
    })
    const html = await rLib.text()
    conferir('liberada: interface abre', rLib.status === 200, `http=${rLib.status}`)

    const rSem = await fetch(`${BASE}/painel/orcamentos`, {
      headers: { cookie: contas.bloqueada.cookie },
      redirect: 'manual',
    })
    const destino = rSem.headers.get('location') ?? ''
    conferir(
      'bloqueada: interface desvia para /acesso',
      rSem.status >= 300 && rSem.status < 400 && destino.includes('/acesso'),
      `http=${rSem.status} -> ${destino || '(sem redirect)'}`,
    )

    // ---- O QUE IMPORTA: a action sem passar pela interface ----------------
    const idAction = (html.match(/\$ACTION_ID_([a-f0-9]+)/) ?? [])[1]
    conferir(
      'id da Server Action extraído do HTML da liberada',
      Boolean(idAction),
      idAction ? idAction.slice(0, 16) + '…' : 'NÃO ACHEI — o resto não vale',
    )
    if (!idAction) throw new Error('sem id de action não há o que testar')

    const chamar = async (cookie) =>
      fetch(`${BASE}/painel/orcamentos`, {
        method: 'POST',
        headers: { cookie, 'Next-Action': idAction, 'Content-Type': 'text/plain;charset=UTF-8' },
        body: '[]',
        redirect: 'manual',
      })

    const contar = async (userId) =>
      (
        await admin
          .from('orcamentos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ).count ?? 0

    /*
      CONTROLE PRIMEIRO.

      Se a chamada não funcionar nem para quem TEM acesso, o teste seguinte
      passa por motivo nenhum — seria o mesmo erro da versão anterior, em que
      o "ataque" falhava porque a requisição era inválida, não porque o gate
      barrou. O controle prova que a requisição é boa.
    */
    const antesLib = await contar(contas.liberada.userId)
    const rCtrl = await chamar(contas.liberada.cookie)
    const depoisLib = await contar(contas.liberada.userId)
    conferir(
      'CONTROLE: a mesma chamada funciona para quem tem acesso',
      depoisLib > antesLib,
      `orçamentos ${antesLib} -> ${depoisLib}, http=${rCtrl.status}`,
    )

    const antesSem = await contar(contas.bloqueada.userId)
    const rAtaque = await chamar(contas.bloqueada.cookie)
    const corpo = await rAtaque.text()
    const depoisSem = await contar(contas.bloqueada.userId)

    conferir(
      'ATAQUE: chamada direta NÃO cria orçamento sem acesso',
      depoisSem === antesSem,
      `orçamentos ${antesSem} -> ${depoisSem}`,
    )
    conferir(
      '  a chamada falhou (algo lançou)',
      rAtaque.status >= 400,
      `http=${rAtaque.status} corpo="${corpo.slice(0, 40).replace(/\n/g, ' ')}"`,
    )

    /*
      PROVA CAUSAL — a afirmação de mecanismo de verdade.

      "http >= 400" só diz que algo lançou: um id de action inválido, uma
      sessão expirada ou um erro de banco dariam o mesmo. Para provar que foi
      O GATE, libero a MESMA conta e repito a MESMA chamada, com o MESMO
      cookie e o MESMO id de action. Se agora criar, a única variável que
      mudou foi a liberação — e o que barrava era ela.

      Sem este passo, o teste ficaria verde no dia em que o gate saísse e
      outra coisa qualquer passasse a falhar no lugar dele.
    */
    await admin.from('liberacoes').insert({
      email: BLOQUEADA,
      user_id: contas.bloqueada.userId,
      status: 'ativa',
      pedido_id: `gate-prova-${marca}`,
    })
    const rDepois = await chamar(contas.bloqueada.cookie)
    const criouDepois = await contar(contas.bloqueada.userId)
    conferir(
      '  PROVA: a MESMA chamada passa depois de liberar a MESMA conta',
      criouDepois > antesSem && rDepois.status < 400,
      `orçamentos ${antesSem} -> ${criouDepois}, http=${rDepois.status} — só a liberação mudou`,
    )
    // =====================================================================
    console.log('\n  === MÓDULO DE IA: SÓ O VITALÍCIO NÃO ABRE A IA ===\n')
    // =====================================================================
    /*
      O caso que faltava, e que deixou uma dúvida de produção sem resposta:
      a conta que comprou o FechaObra e nenhum order bump.

      As duas contas comparadas aqui são IDÊNTICAS em tudo — mesma tela, mesmo
      vitalício ativo, mesma sessão real — menos por duas linhas em
      `recursos_liberados`. Qualquer diferença de comportamento entre elas só
      pode vir dessas duas linhas.
    */
    const editorDe = async (conta) => {
      await chamar(conta.cookie) // cria um orçamento para haver o que abrir
      const { data: orcamentos } = await admin
        .from('orcamentos')
        .select('id')
        .eq('user_id', conta.userId)
        .limit(1)
      const id = orcamentos?.[0]?.id
      if (!id) throw new Error(`não consegui criar orçamento para ${conta.email}`)
      const r = await fetch(`${BASE}/painel/orcamentos/${id}`, {
        headers: { cookie: conta.cookie },
        redirect: 'manual',
      })
      return { id, status: r.status, html: await r.text() }
    }

    const editorSem = await editorDe(contas.soVitalicio)
    const editorCom = await editorDe(contas.liberada)

    conferir(
      'CONTROLE: o editor abre para as duas contas',
      editorSem.status === 200 && editorCom.status === 200,
      `só-vitalício http=${editorSem.status}, com-módulos http=${editorCom.status}`,
    )

    const cadeados = (html) => html.split(CADEADO).length - 1

    /*
      Dois cadeados, não "pelo menos um": são dois botões — "Descrever em
      texto" na seção de itens e "Escrever com IA" na de textos. Afirmar
      `> 0` deixaria passar o dia em que um dos dois perdesse a guarda, que é
      precisamente o defeito relatado.
    */
    conferir(
      'só-vitalício: os DOIS botões de IA vêm com cadeado',
      cadeados(editorSem.html) === 2,
      `${cadeados(editorSem.html)} cadeado(s) no HTML — esperado 2`,
    )
    conferir(
      '  PROVA: a mesma tela não tem cadeado para quem tem os módulos',
      cadeados(editorCom.html) === 0,
      `${cadeados(editorCom.html)} cadeado(s) — só as duas linhas de recursos_liberados mudaram`,
    )

    // ---- as ações, sem passar pela interface -----------------------------
    /*
      DE ONDE SAEM OS IDS DAS AÇÕES DO EDITOR.

      Do manifest do build, e não do HTML — medido: a página do editor não
      inlineia nenhum `$ACTION_ID_`, e os chunks do cliente também não. Só
      `/painel/orcamentos` inlineia, que é por isso que a primeira metade
      deste arquivo consegue pescar de lá.

      Isso NÃO enfraquece o teste, porque o id é só o endereço: a chamada
      continua sendo HTTP de verdade contra o BASE, com cookie de verdade, e
      cada id é confirmado pela resposta antes de virar prova. O que o
      manifest evita é chutar qual id é qual função.

      A dependência é o build local ser o mesmo que está no BASE. Se não for,
      nenhum candidato responde a frase esperada e o teste FALHA dizendo isso
      — nunca fica verde por não ter encontrado nada.
    */
    const manifest = 'server-reference-manifest.json'
    const rota = 'app/(painel)/painel/orcamentos/[id]/page'
    let ids = []
    try {
      const bruto = JSON.parse(readFileSync(join('.next', 'server', manifest), 'utf8'))
      ids = Object.entries(bruto.node ?? {})
        .filter(([, v]) => Object.keys(v.workers ?? {}).some((w) => w === rota))
        .map(([id]) => id)
    } catch {
      /* sem build local: o conferir abaixo explica */
    }
    conferir(
      'ids das ações do editor lidos do manifest do build',
      ids.length > 0,
      ids.length
        ? `${ids.length} candidato(s) em ${rota}`
        : `.next/server/${manifest} ausente ou sem a rota — rode npm run build antes`,
    )

    const chamarAcao = async (id, cookie, corpo) =>
      fetch(`${BASE}/painel/orcamentos/${editorCom.id}`, {
        method: 'POST',
        headers: { cookie, 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8' },
        body: corpo,
        redirect: 'manual',
      })

    for (const acao of ACOES_IA) {
      // Quem responder a frase de validação é a função procurada.
      let alvo = null
      for (const id of ids) {
        const r = await chamarAcao(id, contas.liberada.cookie, acao.corpo)
        if (r.status < 400 && (await r.text()).includes(acao.frase)) {
          alvo = id
          break
        }
      }

      conferir(
        `${acao.nome}: identificada pela própria validação`,
        Boolean(alvo),
        alvo ? `${alvo.slice(0, 16)}… respondeu "${acao.frase}"` : 'NÃO ACHEI — o resto não vale',
      )
      if (!alvo) continue

      const rAtaque = await chamarAcao(alvo, contas.soVitalicio.cookie, acao.corpo)
      const corpoAtaque = await rAtaque.text()

      /*
        RECUSA CONTROLADA, NÃO 500.

        Isto já foi `status >= 400`, e a mudança é o ponto. A ação devolve
        `{ ok:false, erro:'sem_recurso' }` com HTTP 200: recusa prevista não é
        erro de servidor, e um 500 aqui enche o painel de erros de ruído até
        ninguém mais olhar — que é quando o 500 de verdade passa batido.

        Afirmar `200` E o corpo, e não só um dos dois: 200 sozinho ficaria
        verde se a guarda sumisse e a IA respondesse normalmente, que é
        exatamente o defeito que este bloco existe para pegar.
      */
      conferir(
        `  ATAQUE: ${acao.nome} recusa a conta sem ${acao.recurso}`,
        rAtaque.status === 200 && corpoAtaque.includes('sem_recurso'),
        `http=${rAtaque.status}, corpo traz "sem_recurso" — recusa, não 500`,
      )
      conferir(
        `  a recusa diz qual módulo falta`,
        corpoAtaque.includes(acao.recurso),
        `resposta nomeia "${acao.recurso}" — é o que o front usa para ofertar o certo`,
      )

      /*
        AFIRME SOBRE O MECANISMO.

        `sem_recurso` no corpo já diz muito, mas não diz QUANDO a guarda
        rodou. O corpo inteiro da ação é o argumento de `comRecurso`, então a
        conta sem o módulo não pode ter chegado à validação de entrada. Se a
        frase aparecer aqui, o corpo rodou fora da guarda.
      */
      conferir(
        `  parou na guarda, antes de validar a entrada`,
        !corpoAtaque.includes(acao.frase),
        `resposta não contém "${acao.frase}" — o corpo roda dentro de comRecurso`,
      )

      /*
        PROVA CAUSAL. Libero o módulo para a MESMA conta e repito a MESMA
        chamada, com o MESMO cookie e o MESMO id. Se agora ela chega à
        validação, a única variável que mudou foi a linha em
        recursos_liberados — e o que barrava era ela.
      */
      await admin.from('recursos_liberados').insert({
        email: SO_VITALICIO,
        user_id: contas.soVitalicio.userId,
        recurso: acao.recurso,
        status: 'ativa',
        pedido_id: `gate-prova-${marca}`,
      })
      const rDepois = await chamarAcao(alvo, contas.soVitalicio.cookie, acao.corpo)
      const corpoDepois = await rDepois.text()
      /*
        Com a recusa virando 200, o status deixou de distinguir os dois casos —
        e é o corpo que distingue: antes trazia `sem_recurso` e nenhuma frase de
        validação; agora traz a frase e nenhum `sem_recurso`. As duas metades
        são afirmadas, senão a prova ficaria verde para uma resposta que fosse
        as duas coisas ao mesmo tempo.
      */
      conferir(
        `  PROVA: a MESMA chamada passa depois de liberar ${acao.recurso}`,
        rDepois.status === 200 &&
          corpoDepois.includes(acao.frase) &&
          !corpoDepois.includes('sem_recurso'),
        `http=${rDepois.status}, agora chega à validação e não recusa — só o módulo mudou`,
      )
    }
  } finally {
    ws.close()
    chrome.kill()
    try {
      rmSync(perfil, { recursive: true, force: true })
    } catch {
      /* tudo bem */
    }
    for (const c of Object.values(contas)) {
      if (!c.userId) continue
      await admin.from('orcamentos').delete().eq('user_id', c.userId)
      await admin.from('clientes').delete().eq('user_id', c.userId)
      await admin.from('liberacoes').delete().eq('email', c.email)
      // Sem esta linha o teste deixaria módulo órfão no banco a cada rodada.
      await admin.from('recursos_liberados').delete().eq('email', c.email)
      await admin.auth.admin.deleteUser(c.userId)
    }
  }

  console.log(
    `\n  ${falhas.length ? falhas.length + ' FALHA(S): ' + falhas.join(', ') : 'o gate segura a chamada direta'}\n`,
  )
  process.exit(falhas.length ? 1 : 0)
}

principal()
