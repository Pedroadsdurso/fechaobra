import { readFileSync } from 'node:fs'
import path from 'node:path'

import { ImageResponse } from 'next/og'

/**
 * A imagem de prévia de link DO APP — /entrar, /cadastro, /painel.
 *
 * ===========================================================================
 * NÃO PODE DESCER PARA /p/[token].
 * ===========================================================================
 * Por isso os arquivos opengraph-image ficam nos grupos (publico) e (painel),
 * e NÃO na raiz de app/: metadados descem por herança, e da raiz esta imagem
 * carimbaria a marca do FechaObra na prévia do link que o cliente final
 * recebe no WhatsApp. A prévia daquele link é do prestador. Ver logotipo.tsx.
 * ===========================================================================
 *
 * Reaproveita a Inter que já vive em public/fonts para o PDF — nenhum arquivo
 * novo. A leitura do disco acontece no BUILD, nunca em produção: é o mesmo
 * detalhe que derrubou a rota do PDF público, e aqui ele é evitado por
 * construção, com force-static em quem me chama.
 */
export const tamanhoOg = { width: 1200, height: 630 }
export const tipoOg = 'image/png'

const TINTA = '#1E2939'

const fonte = (arquivo: string) =>
  readFileSync(path.join(process.cwd(), 'public', 'fonts', arquivo))

export function imagemOgDoApp() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: TINTA,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter',
          gap: 34,
        }}
      >
        <svg width="150" height="150" viewBox="0 0 100 100" fill="none">
          <rect x="9" y="9" width="82" height="82" rx="20" stroke="#fff" strokeWidth="9" />
          <path d="M31 52 45 66 70 37" stroke="#fff" strokeWidth="11" strokeLinecap="square" />
        </svg>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: '-0.015em' }}>FechaObra</div>
        <div style={{ fontSize: 31, color: '#aab4c0', letterSpacing: '-0.005em' }}>
          Orçamento pronto em 3 minutos, com a sua cara
        </div>
      </div>
    ),
    {
      ...tamanhoOg,
      fonts: [
        { name: 'Inter', data: fonte('Inter-Regular.ttf'), weight: 400, style: 'normal' },
        { name: 'Inter', data: fonte('Inter-Bold.ttf'), weight: 700, style: 'normal' },
      ],
    },
  )
}
