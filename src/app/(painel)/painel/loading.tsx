import { Esqueleto, EsqueletoTitulo } from '@/componentes/ui/esqueleto'

export default function Carregando() {
  return (
    <div className="flex flex-col gap-5">
      <EsqueletoTitulo />
      <Esqueleto className="h-20 w-full rounded-xl" />
      <Esqueleto className="h-64 w-full rounded-xl" />
    </div>
  )
}
