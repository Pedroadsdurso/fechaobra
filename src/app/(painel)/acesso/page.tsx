import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Botao, classesBotao } from "@/componentes/ui/botao";
import { SimboloFechaObra } from "@/componentes/marca/simbolo";
import { acessoDoUsuario } from "@/modules/acesso/consultas";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Liberar acesso" };

/** O checkout da Cakto. Trocar aqui quando a oferta mudar. */
const LINK_COMPRA = "https://pay.cakto.com.br/";

/**
 * A tela de quem entrou mas ainda não comprou.
 *
 * Sem exagero de venda: a pessoa já criou conta, já está dentro, já sabe o
 * que quer. O trabalho aqui é dizer o preço, tirar o medo e sair da frente.
 *
 * O aviso do e-mail aparece em destaque, e não em letra miúda: e-mail
 * diferente entre compra e cadastro é a principal fonte de suporte deste
 * modelo, e o custo de explicar antes é muito menor que o de resolver depois.
 */
export default async function PaginaAcesso() {
  const acesso = await acessoDoUsuario();
  if (acesso.liberado) redirect("/painel");

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center">
      <SimboloFechaObra className="size-10 text-tinta" />

      {acesso.motivo === "revogada" ? (
        <>
          <h1 className="mt-5 text-xl font-bold text-tinta">
            Seu acesso está suspenso
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-tinta-meta">
            Registramos um reembolso ou contestação da compra feita com{" "}
            <strong className="font-semibold text-tinta">{email}</strong>. Se
            isso não procede, me chame — resolvo na mão.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-xl font-bold text-tinta">
            Falta liberar o acesso desta conta
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-tinta-meta">
            Não encontramos uma compra com o e-mail{" "}
            <strong className="font-semibold text-tinta">{email}</strong>.
          </p>
        </>
      )}

      <div className="mt-6 w-full rounded-xl border border-borda bg-superficie p-5 text-left">
        <p className="text-[15px] leading-relaxed text-tinta-leitura">
          O FechaObra monta o orçamento em 3 minutos e devolve duas coisas: um
          PDF com a sua marca para mandar no WhatsApp, e um link onde o cliente
          lê a proposta pelo celular e aceita com um toque.
        </p>

        <dl className="mt-4 flex flex-col gap-2 border-t border-linha pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-meta">Pagamento</dt>
            <dd className="font-bold tabular-nums text-tinta">
              R$ 47, uma vez só
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-meta">Acesso</dt>
            <dd className="font-semibold text-tinta">
              Vitalício, sem mensalidade
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-meta">Garantia</dt>
            <dd className="font-semibold text-tinta">
              7 dias, dinheiro de volta
            </dd>
          </div>
        </dl>
      </div>

      {/*
        O aviso do e-mail vem ANTES do botão, não depois.

        Depois do botão ninguém lê: a pessoa clica e vai. É aqui que se evita
        o caso mais caro do suporte — comprar com um e-mail e cadastrar com
        outro, e ficar sem acesso sem entender por quê.
      */}
      <div className="mt-4 w-full rounded-xl border border-atencao/30 bg-atencao/5 p-4 text-left">
        <p className="text-sm leading-relaxed text-atencao-forte">
          <strong className="font-bold">
            Use este mesmo e-mail na compra:
          </strong>{" "}
          <span className="font-mono">{email}</span>. É por ele que o acesso é
          liberado — com outro e-mail, a compra não encontra esta conta.
        </p>
      </div>

      {/* Um <a> só, sem <button> dentro. Ver a nota em dialogo-envio.tsx. */}
      <a
        href={LINK_COMPRA}
        target="_blank"
        rel="noopener noreferrer"
        className={classesBotao({
          tamanho: "grande",
          larguraTotal: true,
          className: "mt-5",
        })}
      >
        Liberar por R$ 47
      </a>

      <form action="/auth/sair" method="post" className="mt-3">
        <Botao type="submit" variante="fantasma" tamanho="medio">
          Entrar com outro e-mail
        </Botao>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-tinta-meta">
        Já comprou e continua vendo esta tela? Pode ser e-mail diferente entre a
        compra e o cadastro. Me chame que eu vinculo na hora.
      </p>
    </div>
  );
}
