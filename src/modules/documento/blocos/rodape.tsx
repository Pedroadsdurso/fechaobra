import { Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
// Importa o NÚCLEO do qrcode, não a entrada principal.
//
// `from 'qrcode'` resolve para lib/server.js, que arrasta os renderizadores de
// PNG e SVG — e com eles `stream`, `zlib` e `pngjs`. Isso quebra o bundle no
// navegador e no esbuild dos scripts. Daqui só vem a matriz de módulos, que é
// tudo o que este rodapé precisa: quem desenha é o react-pdf.
import { create as criarQr } from 'qrcode/lib/core/qrcode'

import { CORES, ESP, FONTE, TAM } from '../tema'

const s = StyleSheet.create({
  rodape: {
    position: 'absolute',
    left: ESP.paginaX,
    right: ESP.paginaX,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: CORES.linha,
    paddingTop: 8,
  },
  chamada: { flex: 1, marginLeft: 8 },
  chamadaTitulo: {
    fontSize: TAM.micro,
    fontWeight: FONTE.negrito,
    color: CORES.texto,
    marginBottom: 1,
  },
  chamadaTexto: { fontSize: 6.5, color: CORES.textoFraco, lineHeight: 1.35 },
  direita: { alignItems: 'flex-end' },
  empresa: { fontSize: 6.5, color: CORES.textoFraco, marginBottom: 1 },
  pagina: { fontSize: TAM.micro, fontWeight: FONTE.media, color: CORES.textoSuave },
})

const LADO = 30

/**
 * Matriz de um QR real, a partir da URL pública do orçamento.
 *
 * Correção de erro em nível M: o papel vai ser dobrado, guardado no bolso e
 * fotografado de lado — vale sacrificar um pouco de densidade para o código
 * continuar lendo depois de amassado.
 *
 * A geração é síncrona e determinística, então roda dentro do render sem
 * efeito colateral, igual no servidor e no navegador.
 */
function matrizDoQr(url: string): boolean[][] | null {
  try {
    const { modules } = criarQr(url, { errorCorrectionLevel: 'M' })
    const lado = modules.size

    return Array.from({ length: lado }, (_, y) =>
      Array.from({ length: lado }, (_, x) => Boolean(modules.data[y * lado + x])),
    )
  } catch {
    // URL absurdamente longa ou inválida: melhor rodapé sem QR do que documento
    // que não renderiza.
    return null
  }
}

/**
 * Marcador de lugar para quando não há URL — os mocks de desenvolvimento.
 * Tem cara de QR sem ser um: três marcadores de posição e ruído determinístico.
 */
const MODULOS_FALSOS = 21
const MATRIZ_FALSA: boolean[][] = (() => {
  const m: boolean[][] = Array.from({ length: MODULOS_FALSOS }, () =>
    Array(MODULOS_FALSOS).fill(false),
  )

  const marcador = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const borda = x === 0 || x === 6 || y === 0 || y === 6
        const centro = x >= 2 && x <= 4 && y >= 2 && y <= 4
        m[oy + y][ox + x] = borda || centro
      }
    }
  }

  marcador(0, 0)
  marcador(MODULOS_FALSOS - 7, 0)
  marcador(0, MODULOS_FALSOS - 7)

  const dentroDeMarcador = (x: number, y: number) =>
    (x < 8 && y < 8) ||
    (x >= MODULOS_FALSOS - 8 && y < 8) ||
    (x < 8 && y >= MODULOS_FALSOS - 8)

  for (let y = 0; y < MODULOS_FALSOS; y++) {
    for (let x = 0; x < MODULOS_FALSOS; x++) {
      if (dentroDeMarcador(x, y)) continue
      m[y][x] = (x * 73 + y * 151 + x * y * 17) % 7 < 3
    }
  }

  return m
})()

function Qr({ cor, url }: { cor: string; url?: string }) {
  const matriz = url ? (matrizDoQr(url) ?? MATRIZ_FALSA) : MATRIZ_FALSA
  const modulos = matriz.length

  return (
    <Svg width={LADO} height={LADO} viewBox={`0 0 ${modulos} ${modulos}`}>
      {matriz.flatMap((linha, y) =>
        linha.map((ligado, x) =>
          ligado ? (
            <Rect key={`${x}-${y}`} x={x} y={y} width={1.04} height={1.04} fill={cor} />
          ) : null,
        ),
      )}
    </Svg>
  )
}

/**
 * Rodapé fixo: repete em todas as páginas.
 * O `render` do Text recebe pageNumber e totalPages do próprio react-pdf, que
 * só sabe o total depois de paginar o documento inteiro.
 */
export function Rodape({
  nomeEmpresa,
  cor,
  urlPublica,
}: {
  nomeEmpresa: string
  cor: string
  urlPublica?: string
}) {
  return (
    <View style={s.rodape} fixed>
      <Qr cor={cor} url={urlPublica} />

      <View style={s.chamada}>
        <Text style={s.chamadaTitulo}>Aceite pelo celular</Text>
        <Text style={s.chamadaTexto}>
          Aponte a câmera para o código e responda a proposta em um toque.
        </Text>
      </View>

      <View style={s.direita}>
        <Text style={s.empresa}>{nomeEmpresa}</Text>
        <Text
          style={s.pagina}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </View>
    </View>
  )
}
