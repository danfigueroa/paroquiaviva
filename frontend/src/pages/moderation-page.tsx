import { useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'

export function ModerationPage() {
  const queue = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: async () => {
      const res = await api.get<{ items: unknown[] }>('/moderation/queue')
      return res.data
    }
  })

  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Fila de Moderação</h1>
      <pre className="mt-4 rounded-md bg-slate-900 p-4 text-xs text-white">{JSON.stringify(queue.data, null, 2)}</pre>
    </PageShell>
  )
}
