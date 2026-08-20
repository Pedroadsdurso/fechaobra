import { Esqueleto, EsqueletoTitulo } from '@/componentes/ui/esqueleto'

export default function Carregando() {
  return (
    <div className="flex flex-col gap-5">
      <EsqueletoTitulo />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Esqueleto className="h-4 w-28" />
              <Esqueleto className="h-11 w-full" />
            </div>
          ))}
        </div>
        <Esqueleto className="h-56 w-full rounded-xl" />
      </div>
    </div>
  )
}
