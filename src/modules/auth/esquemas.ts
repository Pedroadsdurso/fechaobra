import { z } from 'zod'

export const esquemaCadastro = z.object({
  nomeEmpresa: z
    .string()
    .trim()
    .min(2, 'Informe o nome da sua empresa ou como você se apresenta.')
    .max(120, 'Nome muito longo.'),
  email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
  senha: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(72, 'A senha pode ter no máximo 72 caracteres.'),
})

export const esquemaLogin = z.object({
  email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
  senha: z.string().min(1, 'Informe sua senha.'),
})

export type DadosCadastro = z.infer<typeof esquemaCadastro>
export type DadosLogin = z.infer<typeof esquemaLogin>
