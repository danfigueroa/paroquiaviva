import { useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'

type QueueItem = {
  id?: string
  reason?: string
  status?: string
}

export function ModerationPage() {
  const queue = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: async () => {
      const res = await api.get<{ items: QueueItem[] }>('/moderation/queue')
      return res.data.items
    }
  })

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Governança</p>
        <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Fila de moderação</h1>
        <p className="pv-muted mt-2 text-sm">Acompanhe os itens pendentes e mantenha um ambiente seguro para a comunidade.</p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        {(queue.data ?? []).map((item, index) => (
          <article key={item.id || index} className="pv-panel rounded-2xl p-4">
            <p className="text-sm font-semibold text-secondary">Item {item.id || index + 1}</p>
            <p className="pv-muted mt-2 text-sm">Motivo: {item.reason || 'Sem motivo detalhado'}</p>
            <p className="mt-2 text-xs text-[#9cb39b]">Status: {item.status || 'PENDING'}</p>
          </article>
        ))}
        {!queue.isLoading && (queue.data ?? []).length === 0 && (
          <p className="pv-muted rounded-2xl border border-[#2d3a2f] bg-[#121715] p-4 text-sm sm:col-span-2">Nenhum item na fila de moderação.</p>
        )}
      </section>
    </PageShell>
  )
}
