import { redirect } from 'next/navigation'

import { criarClienteServidor } from '@/lib/supabase/servidor'

export default async function Raiz() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/painel' : '/entrar')
}
