import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'
import { Button } from '@/components/button'

type FeedItem = {
  id: string
  title: string
  body: string
  category: string
  prayedCount: number
}

type FeedScope = 'home' | 'public' | 'groups' | 'friends'

const tabs: Array<{ scope: FeedScope; label: string; endpoint: string; requiresAuth: boolean }> = [
  { scope: 'home', label: 'Principal', endpoint: '/feed/home', requiresAuth: true },
  { scope: 'groups', label: 'Grupos', endpoint: '/feed/groups', requiresAuth: true },
  { scope: 'friends', label: 'Amigos', endpoint: '/feed/friends', requiresAuth: true },
  { scope: 'public', label: 'Público', endpoint: '/feed/public', requiresAuth: false }
]

export function FeedPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawScope = searchParams.get('scope') as FeedScope | null
  const scope: FeedScope = rawScope && tabs.some((tab) => tab.scope === rawScope) ? rawScope : 'home'
  const activeTab = tabs.find((tab) => tab.scope === scope) ?? tabs[0]

  const query = useQuery({
    queryKey: ['feed', scope],
    queryFn: async () => {
      const res = await api.get<{ items: FeedItem[] }>(activeTab.endpoint)
      return res.data.items
    }
  })
  const prayMutation = useMutation({
    mutationFn: async (requestID: string) => {
      await api.post(`/requests/${requestID}/pray`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    }
  })

  const items = query.data ?? []
  const isUnauthorized = (query.error as any)?.response?.status === 401

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Feed social</p>
            <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Intenções e pedidos de oração</h1>
            <p className="pv-muted mt-2 text-sm">O feed principal mistura amigos e grupos. Público é uma aba secundária para descoberta.</p>
          </div>
          <Link to="/requests/new">
            <Button>Novo pedido</Button>
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.scope}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab.scope === scope ? 'pv-chip-active' : 'pv-chip text-[#d4c8b7]'}`}
              onClick={() => setSearchParams({ scope: tab.scope })}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-3">
        {query.isLoading && <div className="pv-panel rounded-2xl p-4 text-sm pv-muted">Carregando intenções...</div>}

        {isUnauthorized && activeTab.requiresAuth && (
          <div className="pv-panel rounded-2xl p-4 text-sm">
            <p className="text-secondary">Você precisa entrar para visualizar o feed de {activeTab.label.toLowerCase()}.</p>
          </div>
        )}

        {!query.isLoading && !isUnauthorized && items.length === 0 && (
          <div className="pv-panel rounded-2xl p-4 text-sm pv-muted">Ainda não existem pedidos neste feed.</div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="pv-panel flex h-full flex-col rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-secondary">{item.title}</h2>
                <span className="rounded-full border border-[#715647] bg-[#2b201b] px-3 py-1 text-xs font-semibold text-[#f0c7b8]">{item.category}</span>
              </div>
                <p className="pv-muted mt-3 text-sm leading-relaxed">{item.body}</p>
              <div className="mt-auto flex items-center justify-between pt-5">
                <p className="text-xs text-[#98ab90]">Orações registradas: {item.prayedCount}</p>
                <Button disabled={prayMutation.isPending} onClick={() => prayMutation.mutate(item.id)}>
                  Eu orei
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
