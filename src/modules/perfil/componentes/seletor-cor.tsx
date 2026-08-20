'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { CORES_MARCA, ehClaraDemais, normalizarHex } from '@/modules/perfil/cores'

export function SeletorCor({
  valor,
  aoMudar,
  erro,
}: {
  valor: string
  aoMudar: (hex: string) => void
  erro?: string
}) {
  const [texto, setTexto] = useState(valor)

  function digitou(entrada: string) {
    setTexto(entrada)
    const normal = normalizarHex(entrada)
    if (normal) aoMudar(normal)
  }

  function escolheu(hex: string) {
    setTexto(hex)
    aoMudar(hex)
  }

  const invalido = texto.trim() !== '' && normalizarHex(texto) === null
  const clara = !invalido && ehClaraDemais(valor)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-tinta">Cor da marca</span>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {CORES_MARCA.map((cor) => {
          const ativa = cor.valor.toUpperCase() === valor.toUpperCase()
          return (
            <button
              key={cor.valor}
              type="button"
              title={cor.nome}
              aria-label={cor.nome}
              aria-pressed={ativa}
              onClick={() => escolheu(cor.valor)}
              className={cn(
                'flex min-h-11 items-center justify-center rounded-lg border-2 transition-all',
                ativa ? 'border-tinta' : 'border-transparent hover:border-borda',
              )}
            >
              <span
                className="size-7 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: cor.valor }}
              />
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-8 shrink-0 rounded-md ring-1 ring-black/10"
          style={{ backgroundColor: normalizarHex(texto) ?? valor }}
        />
        <input
          value={texto}
          onChange={(e) => digitou(e.target.value)}
          placeholder="#1D4ED8"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Cor em hexadecimal"
          aria-invalid={invalido || undefined}
          className={cn(
            'min-h-11 w-36 rounded-lg border bg-superficie px-3 font-mono text-base text-tinta',
            'outline-none transition-colors focus:border-marca focus:ring-2 focus:ring-marca/20',
            invalido ? 'border-perigo' : 'border-borda',
          )}
        />
      </div>

      {invalido && <p className="text-xs font-medium text-perigo">Use algo como #1D4ED8.</p>}

      {clara && (
        <p className="text-xs text-atencao-forte">
          Essa cor é clara: no documento o texto sai em branco por cima dela e pode ficar difícil de
          ler.
        </p>
      )}

      {erro && !invalido && <p className="text-xs font-medium text-perigo">{erro}</p>}
    </div>
  )
}
