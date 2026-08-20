/**
 * O @types/qrcode não cobre o caminho interno lib/core/qrcode, que é o único
 * que devolve a matriz sem arrastar os renderizadores de servidor.
 */
declare module 'qrcode/lib/core/qrcode' {
  export function create(
    dados: string,
    opcoes?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; version?: number },
  ): {
    version: number
    modules: { size: number; data: Uint8Array }
  }
}
