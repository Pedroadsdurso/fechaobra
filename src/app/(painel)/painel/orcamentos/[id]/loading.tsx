import { Esqueleto } from '@/componentes/ui/esqueleto'

/**
 * O editor busca quatro coisas em paralelo (orçamento, clientes, biblioteca,
 * marca). O esqueleto imita a coluna de campos; a prévia do documento não
 * aparece aqui de propósito — ela carrega sob demanda e tem o próprio aviso.
 */
export default function Carregando() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-3 w-24" />
        <Esqueleto className="h-7 w-56" />
      </div>
      <Esqueleto className="h-11 w-full rounded-lg" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Esqueleto className="h-4 w-32" />
            <Esqueleto className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Esqueleto className="h-32 w-full rounded-xl" />
    </div>
  )
}
