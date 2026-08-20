'use client'

import { useRef, useState, useTransition } from 'react'

import { Alerta } from '@/componentes/ui/alerta'
import { Botao } from '@/componentes/ui/botao'
import { enviarLogo, removerLogo } from '@/modules/perfil/acoes'
import { comprimirLogo, formatarTamanho, type ImagemComprimida } from '@/modules/perfil/comprimir-imagem'

export function CampoLogo({
  urlInicial,
  aoMudar,
}: {
  urlInicial: string
  /** Avisa o formulário para o preview do PDF acompanhar. */
  aoMudar: (url: string) => void
}) {
  const [url, setUrl] = useState(urlInicial)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState<ImagemComprimida | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [pendente, iniciar] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  async function selecionar(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return

    setErro('')
    setOcupado(true)

    try {
      const comprimida = await comprimirLogo(arquivo)
      setInfo(comprimida)

      const dados = new FormData()
      dados.append('logo', comprimida.arquivo)

      const resposta = await enviarLogo(dados)
      if (!resposta.ok || !resposta.url) {
        setErro(resposta.erro ?? 'Falha ao enviar.')
        return
      }

      setUrl(resposta.url)
      aoMudar(resposta.url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui processar essa imagem.')
    } finally {
      setOcupado(false)
      // Permite reenviar o mesmo arquivo depois de um erro.
      if (entrada.current) entrada.current.value = ''
    }
  }

  function remover() {
    iniciar(async () => {
      const resposta = await removerLogo()
      if (!resposta.ok) {
        setErro(resposta.erro ?? 'Falha ao remover.')
        return
      }
      setUrl('')
      setInfo(null)
      aoMudar('')
    })
  }

  const trabalhando = ocupado || pendente

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-tinta">Logo</span>

      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-borda bg-fundo">
          {url ? (
            // Imagem vinda de URL assinada do Storage, que muda a cada carga da
            // página. next/image tentaria otimizar e revalidar um host que já
            // expirou, então aqui vale a tag nativa.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo da empresa" className="size-full object-contain p-1.5" />
          ) : (
            <span className="px-2 text-center text-[11px] leading-tight text-tinta-suave">
              sem logo
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Botao
              type="button"
              variante="secundario"
              onClick={() => entrada.current?.click()}
              disabled={trabalhando}
            >
              {trabalhando ? 'Enviando…' : url ? 'Trocar' : 'Enviar logo'}
            </Botao>

            {url && !trabalhando && (
              <Botao type="button" variante="perigo" onClick={remover}>
                Remover
              </Botao>
            )}
          </div>

          <p className="text-xs text-tinta-suave">
            PNG ou JPEG. A imagem é reduzida no seu aparelho antes de subir — pode mandar a foto
            direto da galeria.
          </p>
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={selecionar}
      />

      {info && !erro && (
        <p className="text-xs text-tinta-suave">
          {info.largura}×{info.altura} px · {formatarTamanho(info.bytesOriginais)} →{' '}
          <span className="font-medium text-tinta">{formatarTamanho(info.bytesFinais)}</span>
          {info.achatada && ' · fundo transparente virou branco para caber no limite'}
        </p>
      )}

      {erro && <Alerta tom="erro">{erro}</Alerta>}
    </div>
  )
}
