'use client'

import dynamic from 'next/dynamic'

/**
 * A prévia da marca, adiada.
 *
 * O conteúdo real vive em preview-marca-pesado.tsx, que importa o react-pdf
 * (449 KB gzip). Aqui fica só a casca: assim a rota /painel/marca não carrega
 * o motor de PDF antes de precisar dele.
 *
 * O tipo continua exportado daqui porque o formulário o usa — e tipo não
 * carrega código nenhum em tempo de execução.
 */
export type DadosPreview = {
  nomeEmpresa: string
  responsavel: string
  telefone: string
  email: string
  cnpjCpf: string
  endereco: string
  corPrimaria: string
  logoUrl: string
}

function Esqueleto() {
  return (
    <div className="flex h-full items-center justify-center bg-fundo">
      <p className="text-sm text-tinta-suave">Montando a prévia…</p>
    </div>
  )
}

export const PreviewMarca = dynamic(
  () => import('./preview-marca-pesado').then((m) => m.PreviewMarcaPesado),
  { ssr: false, loading: () => <Esqueleto /> },
)
