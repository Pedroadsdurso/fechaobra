import { z } from 'zod'

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === '' ? undefined : v))
    .optional()

/**
 * Só o nome é obrigatório, e de propósito.
 *
 * O prestador está no meio da obra e quer emitir o orçamento agora: obrigá-lo
 * a ter telefone, e-mail e endereço em mãos trava o fluxo pelo dado que o
 * próprio cliente vai confirmar depois, no aceite. Um caractere basta —
 * "Mariana", "Seu Zé", "Dona Cida do 302" são nomes reais de agenda de obra.
 */
export const esquemaCliente = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente.').max(140, 'Nome muito longo.'),
  telefone: textoOpcional(20),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .refine((v) => v === undefined || z.email().safeParse(v).success, 'E-mail inválido.'),
  endereco: textoOpcional(240),
})

export type DadosCliente = z.infer<typeof esquemaCliente>
