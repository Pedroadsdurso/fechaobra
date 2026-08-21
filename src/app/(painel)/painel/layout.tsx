import { redirect } from "next/navigation";

import { temAcesso } from "@/modules/acesso/consultas";

/**
 * O desvio para a tela de bloqueio.
 *
 * ===========================================================================
 * ISTO É CONVENIÊNCIA DE INTERFACE, NÃO A TRANCA.
 * ===========================================================================
 * A tranca de verdade está em cada Server Action, via exigirAcesso(). Um
 * layout decide o que a pessoa VÊ; ele não impede uma requisição montada na
 * mão de chamar a ação direto. Mesma razão pela qual o gate não mora no
 * proxy.ts: roteamento não é fronteira de segurança.
 *
 * Se um dia alguém remover esta checagem, o pior que acontece é a pessoa ver
 * telas vazias. Se remover a das ações, ela cria orçamento sem ter pago.
 * ===========================================================================
 *
 * A tela mora em /acesso, FORA de /painel/*, justamente para não cair neste
 * layout — senão o desvio se morderia num laço infinito.
 */
export default async function LayoutComAcesso({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await temAcesso())) redirect("/acesso");
  return <>{children}</>;
}
