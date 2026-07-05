import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { AnimeDetailModal } from '#/components/AnimeDetailModal'
import { animeDetailQueryOptions } from '#/lib/queries'

export const Route = createFileRoute('/$season/$year/$id')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(animeDetailQueryOptions(Number(params.id)))
  },
  pendingComponent: DetailPending,
  errorComponent: DetailError,
  component: DetailRoute,
})

function useCloseModal() {
  const params = Route.useParams()
  const navigate = useNavigate()
  return () =>
    navigate({
      to: '/$season/$year',
      params: { season: params.season, year: params.year },
    })
}

function DetailRoute() {
  const params = Route.useParams()
  const close = useCloseModal()
  const { data } = useSuspenseQuery(animeDetailQueryOptions(Number(params.id)))
  return <AnimeDetailModal detail={data} onClose={close} />
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm animate-fade-in"
      />
      <div className="animate-pop-in relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-zinc-900 ring-1 ring-white/10 sm:rounded-2xl">
        {children}
      </div>
    </div>
  )
}

function DetailPending() {
  const close = useCloseModal()
  return (
    <ModalShell onClose={close}>
      <div className="h-36 animate-pulse bg-zinc-800 sm:h-48" />
      <div className="px-5 pb-6 sm:px-6">
        <div className="-mt-16 flex gap-4">
          <div className="h-40 w-28 shrink-0 animate-pulse rounded-lg bg-zinc-700" />
          <div className="flex-1 space-y-2 pt-16">
            <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800/70" />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800/70" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-800/70" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-zinc-800/70" />
        </div>
      </div>
    </ModalShell>
  )
}

function DetailError({ error }: { error: Error }) {
  const close = useCloseModal()
  return (
    <ModalShell onClose={close}>
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-medium text-zinc-200">Gagal memuat detail</p>
        <p className="max-w-sm text-sm text-zinc-500">{error.message}</p>
        <button
          type="button"
          onClick={close}
          className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  )
}
