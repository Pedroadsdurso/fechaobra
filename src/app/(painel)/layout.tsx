import { redirect } from 'next/navigation'

import { AppShell } from '@/componentes/layout/app-shell'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // O proxy já barra quem não está logado. Esta checagem é a segunda tranca:
  // se o matcher mudar um dia, nenhum dado vaza por descuido.
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome_empresa')
    .eq('user_id', user.id)
    .maybeSingle()

  const nomeEmpresa = perfil?.nome_empresa?.trim() || 'Minha empresa'

  return (
    <AppShell nomeEmpresa={nomeEmpresa} email={user.email ?? ''}>
      {children}
    </AppShell>
  )
}
