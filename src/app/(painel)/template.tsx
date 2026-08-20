/**
 * Transição entre rotas do painel.
 *
 * template.tsx (e não layout.tsx) porque o template é REMONTADO a cada
 * navegação — é isso que faz a animação tocar de novo. O layout persiste, e
 * por isso a barra lateral e a navegação inferior, que vivem nele, ficam
 * paradas: só o conteúdo entra.
 *
 * 180ms e 6px. O suficiente para o olho registrar que algo mudou, curto o
 * bastante para não somar espera percebida ao tempo de rede.
 */
export default function TemplatePainel({ children }: { children: React.ReactNode }) {
  return <div className="fo-rota">{children}</div>
}
