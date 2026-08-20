import { Font } from '@react-pdf/renderer'

/**
 * Registra a família Inter em TTF.
 *
 * Por que não a Helvetica embutida do PDF: ela é Latin-1 e renderiza mal (ou
 * não renderiza) parte da acentuação, além de não ter peso médio. Com orçamento
 * cheio de "execução", "manutenção" e "impermeabilização", isso apareceria.
 *
 * @param base prefixo do caminho dos arquivos.
 *   No navegador fica vazio, e o src vira a URL pública "/fonts/Inter-*.ttf".
 *   Em script Node, passe "public" para ler do disco.
 */
let registrado = false

export function registrarFontes(base = '') {
  if (registrado) return
  registrado = true

  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${base}/fonts/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/Inter-Medium.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  })

  // Desliga a hifenização automática. O padrão do react-pdf quebra palavra no
  // fim da linha com hífen usando regra do inglês, e "im-permeabilização" num
  // orçamento passa exatamente a impressão que estamos tentando evitar.
  Font.registerHyphenationCallback((palavra) => [palavra])
}
