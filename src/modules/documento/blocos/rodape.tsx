import { Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'

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

const MODULOS = 21

/**
 * Matriz de um QR de mentira: três marcadores de posição reais nos cantos e
 * área de dados preenchida por um hash determinístico, para o desenho ficar
 * igual a cada renderização.
 *
 * É PLACEHOLDER. Na Fase 2, quando o link público existir, isto vira um QR
 * de verdade apontando para /p/{token_publico} — o desenho já está no lugar
 * e no tamanho certos, é só trocar a fonte da matriz.
 */
const MATRIZ: boolean[][] = (() => {
  const m: boolean[][] = Array.from({ length: MODULOS }, () => Array(MODULOS).fill(false))

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
  marcador(MODULOS - 7, 0)
  marcador(0, MODULOS - 7)

  const dentroDeMarcador = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= MODULOS - 8 && y < 8) || (x < 8 && y >= MODULOS - 8)

  for (let y = 0; y < MODULOS; y++) {
    for (let x = 0; x < MODULOS; x++) {
      if (dentroDeMarcador(x, y)) continue
      m[y][x] = ((x * 73 + y * 151 + x * y * 17) % 7) < 3
    }
  }

  return m
})()

const LADO = 30

function QrPlaceholder({ cor }: { cor: string }) {
  return (
    <Svg width={LADO} height={LADO} viewBox={`0 0 ${MODULOS} ${MODULOS}`}>
      {MATRIZ.flatMap((linha, y) =>
        linha.map((ligado, x) =>
          ligado ? (
            <Rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={cor} />
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
export function Rodape({ nomeEmpresa, cor }: { nomeEmpresa: string; cor: string }) {
  return (
    <View style={s.rodape} fixed>
      <QrPlaceholder cor={cor} />

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
