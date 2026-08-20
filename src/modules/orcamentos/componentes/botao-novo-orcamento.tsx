import { Botao } from '@/componentes/ui/botao'

import { criarRascunho } from '../acoes'

/**
 * Criar orçamento é POST, não GET.
 *
 * Com um <Link href="/painel/orcamentos/novo"> o Next dispararia o prefetch ao
 * passar o mouse — e como aquela rota criava a linha, um rascunho nasceria (e
 * um número seria queimado) sem ninguém ter clicado. Formulário com server
 * action põe a criação onde ela pertence: no envio.
 */
export function BotaoNovoOrcamento({ rotulo = 'Novo orçamento' }: { rotulo?: string }) {
  return (
    <form action={criarRascunho}>
      <Botao type="submit" tamanho="grande">
        {rotulo}
      </Botao>
    </form>
  )
}
