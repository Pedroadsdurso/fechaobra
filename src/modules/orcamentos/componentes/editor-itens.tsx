'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Botao } from '@/componentes/ui/botao'
import { formatarMoeda } from '@/lib/utils'
import { cn } from '@/lib/utils'

import { somar, totalDoItem, totalPorTipo } from '../calculos'
import { PACOTES, TIPOS_ITEM, UNIDADES } from '../constantes'
import type { ItemEditor, Pacote, TipoItem } from '../tipos'

const entradaBase =
  'min-h-11 w-full rounded-lg border border-borda bg-superficie px-2.5 text-base text-tinta outline-none transition-colors focus:border-marca focus:ring-2 focus:ring-marca/20'

function LinhaItem({
  item,
  indice,
  aoMudar,
  aoRemover,
  aoGuardar,
}: {
  item: ItemEditor
  indice: number
  aoMudar: (id: string, campo: keyof ItemEditor, valor: string) => void
  aoRemover: (id: string) => void
  aoGuardar: (item: ItemEditor) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border border-borda bg-superficie p-3',
        isDragging && 'z-10 opacity-90 shadow-lg',
      )}
    >
      <div className="flex items-start gap-2">
        {/* touch-none impede o navegador de rolar a página quando o dedo
            começa a arrastar pela alça — sem isso, no celular o gesto vira
            scroll e o item nunca se move. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar item ${indice + 1}`}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-tinta-suave hover:bg-fundo active:cursor-grabbing"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={item.descricao}
            onChange={(e) => aoMudar(item.id, 'descricao', e.target.value)}
            placeholder="Descrição do item ou serviço"
            aria-label={`Descrição do item ${indice + 1}`}
            className={entradaBase}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              value={item.quantidade}
              onChange={(e) => aoMudar(item.id, 'quantidade', e.target.value)}
              inputMode="decimal"
              placeholder="Qtd"
              aria-label={`Quantidade do item ${indice + 1}`}
              className={entradaBase}
            />

            <select
              value={item.unidade}
              onChange={(e) => aoMudar(item.id, 'unidade', e.target.value)}
              aria-label={`Unidade do item ${indice + 1}`}
              className={entradaBase}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <input
              value={item.valorUnitario}
              onChange={(e) => aoMudar(item.id, 'valorUnitario', e.target.value)}
              inputMode="decimal"
              placeholder="Valor unit."
              aria-label={`Valor unitário do item ${indice + 1}`}
              className={cn(entradaBase, 'col-span-2 sm:col-span-1')}
            />

            <select
              value={item.tipo}
              onChange={(e) => aoMudar(item.id, 'tipo', e.target.value as TipoItem)}
              aria-label={`Tipo do item ${indice + 1}`}
              className={cn(entradaBase, 'col-span-2 sm:col-span-1')}
            >
              {TIPOS_ITEM.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={item.pacote}
              onChange={(e) => aoMudar(item.id, 'pacote', e.target.value as Pacote)}
              aria-label={`Pacote do item ${indice + 1}`}
              className="min-h-9 rounded-lg border border-borda bg-superficie px-2 text-sm text-tinta-suave outline-none focus:border-marca"
            >
              {PACOTES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>

            <span className="text-sm font-medium text-tinta">{formatarMoeda(totalDoItem(item))}</span>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => aoGuardar(item)}
              disabled={!item.descricao.trim()}
              className="min-h-9 rounded-lg px-2 text-xs font-medium text-tinta-suave transition-colors hover:bg-fundo hover:text-tinta disabled:opacity-40"
            >
              Guardar na biblioteca
            </button>
            <button
              type="button"
              onClick={() => aoRemover(item.id)}
              aria-label={`Remover item ${indice + 1}`}
              className="min-h-9 rounded-lg px-2 text-xs font-medium text-tinta-suave transition-colors hover:bg-perigo/5 hover:text-perigo"
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

export function EditorItens({
  itens,
  aoMudar,
  aoRemover,
  aoReordenar,
  aoAdicionar,
  aoAbrirBiblioteca,
  aoGuardarNaBiblioteca,
}: {
  itens: ItemEditor[]
  aoMudar: (id: string, campo: keyof ItemEditor, valor: string) => void
  aoRemover: (id: string) => void
  aoReordenar: (itens: ItemEditor[]) => void
  aoAdicionar: () => void
  aoAbrirBiblioteca: () => void
  aoGuardarNaBiblioteca: (item: ItemEditor) => void
}) {
  // Três sensores: ponteiro (mouse), toque (celular) e teclado. O toque só
  // ativa depois de 200ms parado, senão qualquer rolagem de página viraria
  // arrasto. O teclado é o que torna a reordenação usável sem mouse.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return

    const de = itens.findIndex((i) => i.id === active.id)
    const para = itens.findIndex((i) => i.id === over.id)
    if (de === -1 || para === -1) return

    aoReordenar(arrayMove(itens, de, para))
  }

  const material = totalPorTipo(itens, 'material')
  const maoDeObra = totalPorTipo(itens, 'mao_de_obra')
  const total = somar(itens)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={aoAbrirBiblioteca}
          className="min-h-9 rounded-lg px-2 text-sm font-medium text-tinta-suave underline underline-offset-4 hover:text-tinta"
        >
          Da biblioteca
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda bg-superficie px-4 py-8 text-center text-sm text-tinta-suave">
          Nenhum item ainda. Todo orçamento precisa de pelo menos um.
        </p>
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          onDragEnd={aoSoltar}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {itens.map((item, indice) => (
                <LinhaItem
                  key={item.id}
                  item={item}
                  indice={indice}
                  aoMudar={aoMudar}
                  aoRemover={aoRemover}
                  aoGuardar={aoGuardarNaBiblioteca}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Botao type="button" variante="secundario" tamanho="grande" larguraTotal onClick={aoAdicionar}>
        Adicionar item
      </Botao>

      {itens.length > 0 && (
        <dl className="rounded-xl border border-borda bg-superficie px-4 py-3 text-sm">
          <div className="flex justify-between py-0.5">
            <dt className="text-tinta-suave">Material</dt>
            <dd className="text-tinta">{formatarMoeda(material)}</dd>
          </div>
          <div className="flex justify-between py-0.5">
            <dt className="text-tinta-suave">Mão de obra</dt>
            <dd className="text-tinta">{formatarMoeda(maoDeObra)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-borda pt-2">
            <dt className="font-medium text-tinta">Total</dt>
            <dd className="font-semibold text-tinta">{formatarMoeda(total)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
