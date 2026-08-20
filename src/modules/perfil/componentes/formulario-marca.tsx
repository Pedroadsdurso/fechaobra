'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Alerta } from '@/componentes/ui/alerta'
import { Botao } from '@/componentes/ui/botao'
import { Campo } from '@/componentes/ui/campo'
import { rotuloDocumento, situacaoDocumento } from '@/lib/documento-br'
import { formatarCnpjCpf, formatarTelefone } from '@/lib/utils'
import { salvarMarca } from '@/modules/perfil/acoes'
import type { MarcaCarregada } from '@/modules/perfil/consultas'
import { ESTADO_MARCA_INICIAL } from '@/modules/perfil/estado'

import { CampoLogo } from './campo-logo'
import { PreviewMarca } from './preview-marca'
import { SeletorCor } from './seletor-cor'

function BotaoSalvar({ primeiraVez }: { primeiraVez: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Botao type="submit" tamanho="grande" larguraTotal disabled={pending}>
      {pending ? 'Salvando…' : primeiraVez ? 'Salvar e continuar' : 'Salvar alterações'}
    </Botao>
  )
}

export function FormularioMarca({ marca }: { marca: MarcaCarregada }) {
  const [estado, acao] = useActionState(salvarMarca, ESTADO_MARCA_INICIAL)

  // Estado controlado porque o preview precisa acompanhar cada tecla.
  const [campos, setCampos] = useState({
    nomeEmpresa: marca.nomeEmpresa,
    responsavel: marca.responsavel,
    telefone: marca.telefone,
    email: marca.email,
    cnpjCpf: marca.cnpjCpf,
    endereco: marca.endereco,
    corPrimaria: marca.corPrimaria,
    logoUrl: marca.logoUrl,
  })

  const mudar = (chave: keyof typeof campos) => (valor: string) =>
    setCampos((atual) => ({ ...atual, [chave]: valor }))

  const erros = estado.errosPorCampo
  const situacao = situacaoDocumento(campos.cnpjCpf)

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <form action={acao} className="flex min-w-0 flex-1 flex-col gap-5" noValidate>
        {estado.erro && <Alerta tom="erro">{estado.erro}</Alerta>}
        {estado.ok && <Alerta tom="info">Marca salva. Seus orçamentos já saem assim.</Alerta>}

        <CampoLogo urlInicial={marca.logoUrl} aoMudar={mudar('logoUrl')} />

        <Campo
          rotulo="Nome da empresa"
          name="nomeEmpresa"
          value={campos.nomeEmpresa}
          onChange={(e) => mudar('nomeEmpresa')(e.target.value)}
          autoComplete="organization"
          placeholder="Ex.: Silva Reformas"
          dica="Aparece em destaque no topo do orçamento."
          erros={erros?.nomeEmpresa}
          required
        />

        <Campo
          rotulo="Responsável"
          name="responsavel"
          value={campos.responsavel}
          onChange={(e) => mudar('responsavel')(e.target.value)}
          autoComplete="name"
          placeholder="Quem assina o orçamento"
          erros={erros?.responsavel}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Telefone"
            name="telefone"
            value={campos.telefone}
            onChange={(e) => mudar('telefone')(formatarTelefone(e.target.value))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            erros={erros?.telefone}
          />

          <div className="flex flex-col gap-1.5">
            <Campo
              rotulo="E-mail da empresa"
              name="email"
              value={campos.email}
              onChange={(e) => mudar('email')(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="contato@suaempresa.com.br"
              erros={erros?.email}
            />

            {/* Sugestão, nunca preenchimento automático: o e-mail de acesso
                costuma ser o pessoal, e ele acabaria impresso no orçamento. */}
            {!campos.email && marca.emailAcesso && (
              <button
                type="button"
                onClick={() => mudar('email')(marca.emailAcesso)}
                className="self-start text-left text-xs text-tinta-suave underline underline-offset-4 hover:text-tinta"
              >
                Usar meu e-mail de acesso ({marca.emailAcesso})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Campo
            rotulo="CNPJ ou CPF"
            name="cnpjCpf"
            value={campos.cnpjCpf}
            onChange={(e) => mudar('cnpjCpf')(formatarCnpjCpf(e.target.value))}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            dica={
              situacao === 'invalido'
                ? undefined
                : 'Documento no orçamento passa seriedade e evita pergunta depois.'
            }
            erros={erros?.cnpjCpf}
          />

          {/* Avisa, não impede: tem prestador com cadastro atípico, e travar o
              salvamento por um dígito seria pior do que deixar passar. */}
          {situacao === 'invalido' && (
            <p className="text-xs text-atencao-forte">
              Esse {rotuloDocumento(campos.cnpjCpf)} parece inválido — confira os números. Dá para
              salvar assim mesmo.
            </p>
          )}
          {situacao === 'valido' && (
            <p className="text-xs text-tinta-suave">
              {rotuloDocumento(campos.cnpjCpf)} válido.
            </p>
          )}
        </div>

        <Campo
          rotulo="Endereço"
          name="endereco"
          value={campos.endereco}
          onChange={(e) => mudar('endereco')(e.target.value)}
          autoComplete="street-address"
          placeholder="Rua, número — bairro, cidade/UF"
          erros={erros?.endereco}
        />

        <SeletorCor
          valor={campos.corPrimaria}
          aoMudar={mudar('corPrimaria')}
          erro={erros?.corPrimaria?.[0]}
        />

        <input type="hidden" name="corPrimaria" value={campos.corPrimaria} />

        {/*
          No celular o botão gruda logo acima da barra de navegação.
          O deslocamento tem que bater com a altura dela (min-h-14 = 3.5rem)
          mais a área segura do aparelho: com uma folga qualquer sobrava uma
          fresta entre as duas barras, e um pedaço de campo aparecia ali,
          parecendo layout quebrado.
        */}
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-borda bg-superficie px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <BotaoSalvar primeiraVez={marca.primeiraVez} />
        </div>
      </form>

      <div className="lg:sticky lg:top-8 lg:w-[420px] lg:shrink-0">
        <p className="mb-2 text-xs font-medium text-tinta-suave">
          Prévia do topo do seu orçamento
        </p>
        <div className="h-[260px] overflow-hidden rounded-lg border border-borda bg-fundo lg:h-[300px]">
          <PreviewMarca dados={campos} />
        </div>
        <p className="mt-2 text-xs text-tinta-suave">
          É o documento de verdade, com os mesmos componentes do PDF — só recortado no topo.
        </p>
      </div>
    </div>
  )
}
