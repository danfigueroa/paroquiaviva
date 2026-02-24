import { useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'

type FeedItem = {
  id: string
  title: string
  body: string
  category: string
  prayedCount: number
}

export function FeedPage() {
  const query = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await api.get<{ items: FeedItem[] }>('/feed')
      return res.data.items
    }
  })

  return (
    <PageShell>
      <h1 className="mb-4 text-xl font-semibold">Mural Público</h1>
      <div className="space-y-3">
        {(query.data ?? []).map((item) => (
          <article key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-700">{item.body}</p>
            <p className="mt-2 text-xs text-slate-500">{item.category} • Orou {item.prayedCount}</p>
          </article>
        ))}
      </div>
    </PageShell>
  )
}
