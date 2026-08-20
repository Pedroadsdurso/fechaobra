import Link from 'next/link'

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-tinta">FechaObra</span>
          <span className="text-center text-sm text-tinta-suave">
            Orçamento pronto em 3 minutos, com a sua cara
          </span>
        </Link>

        <div className="rounded-xl border border-borda bg-superficie p-5 shadow-sm sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
