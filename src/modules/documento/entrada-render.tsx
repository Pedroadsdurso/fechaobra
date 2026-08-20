/**
 * Ponto de entrada usado só pelo scripts/render-documento.mjs.
 *
 * Existe para o script conseguir montar o elemento do documento sem precisar
 * de JSX no próprio script, e para fixar `base = 'public'` — em Node as fontes
 * e as imagens vêm do disco, não de uma URL pública.
 */
import { DocumentoOrcamento } from './documento-orcamento'
import { MOCKS, type ChaveMock } from './mock'

export { MOCKS }

export function criarDocumento(chave: ChaveMock) {
  return <DocumentoOrcamento orcamento={MOCKS[chave].dados} base="public" />
}
