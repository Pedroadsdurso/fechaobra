import { z } from 'zod'

import { normalizarHex } from './cores'

/** Campo de texto opcional: string vazia vira undefined, não "". */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === '' ? undefined : v))
    .optional()

export const esquemaMarca = z.object({
  nomeEmpresa: z
    .string()
    .trim()
    .min(2, 'Informe o nome da empresa.')
    .max(120, 'Nome muito longo.'),
  responsavel: textoOpcional(120),
  telefone: textoOpcional(20),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .refine((v) => v === undefined || z.email().safeParse(v).success, 'E-mail inválido.'),
  cnpjCpf: textoOpcional(20),
  endereco: textoOpcional(200),
  corPrimaria: z
    .string()
    .trim()
    .transform((v) => normalizarHex(v))
    .refine((v): v is string => v !== null, 'Cor inválida. Use um hexadecimal como #1D4ED8.'),
})

export type DadosMarca = z.infer<typeof esquemaMarca>
