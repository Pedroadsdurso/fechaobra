'use client'

import { useEffect, useRef } from 'react'

/**
 * Avisa o servidor que o orçamento foi aberto de verdade.
 *
 * Roda no navegador, depois da montagem — é justamente por isso que o robô de
 * prévia do WhatsApp não dispara o evento: ele baixa o HTML e não executa
 * JavaScript. A deduplicação de refresh e a exclusão do próprio prestador
 * ficam no servidor, onde há como conferir status e sessão.
 */
export function RegistrarVisualizacao({ token }: { token: string }) {
  const jaAvisou = useRef(false)

  useEffect(() => {
    // O StrictMode do desenvolvimento monta duas vezes; sem esta trava o POST
    // sairia em duplicata a cada abertura local.
    if (jaAvisou.current) return
    jaAvisou.current = true

    fetch(`/api/p/${token}/visualizado`, { method: 'POST', keepalive: true }).catch(() => {
      // Falhou? O cliente não pode nem saber que isto existe. O orçamento
      // continua na tela; só o prestador perde a informação de leitura.
    })
  }, [token])

  return null
}
