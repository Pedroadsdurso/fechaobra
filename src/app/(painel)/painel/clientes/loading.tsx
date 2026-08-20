import { EsqueletoCartao, EsqueletoTitulo } from '@/componentes/ui/esqueleto'

export default function Carregando() {
  return (
    <div className="flex flex-col gap-5">
      <EsqueletoTitulo />
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <EsqueletoCartao key={i} />
        ))}
      </div>
    </div>
  )
}
