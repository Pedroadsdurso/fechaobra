/**
 * Ícone da página pública do orçamento — o que o CLIENTE final vê na aba.
 *
 * Existe só para SOBRESCREVER o ícone do app naquela rota. Sem ele, /p/[token]
 * herda o símbolo do FechaObra da raiz de app/, e a marca aparece na aba de
 * quem está lendo um orçamento que não é nosso. Mesma regra do rodapé, dos
 * metadados do PDF e da prévia do link: ali quem assina é o prestador.
 *
 * O desenho é uma folha de papel genérica, sem marca de ninguém. O ideal seria
 * a logo do próprio prestador, mas ela vive atrás de URL assinada no Storage e
 * exigiria geração dinâmica por token — custo alto para um ícone de 16px.
 *
 * Uso: node scripts/gerar-icone-publico.mjs
 */
import sharp from 'sharp'

const LADO = 180
const papel = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#f6f7f9"/>
  <g fill="none" stroke="#646d78" stroke-width="8" stroke-linejoin="round">
    <path d="M26 12h32l18 18v58H26z"/><path d="M56 12v22h20"/><path d="M38 54h26M38 68h18"/>
  </g>
</svg>`

await sharp(Buffer.from(papel)).png({ compressionLevel: 9, palette: true }).toFile('src/app/p/[token]/apple-icon.png')
console.log('src/app/p/[token]/apple-icon.png')
