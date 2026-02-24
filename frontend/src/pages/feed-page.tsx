import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'
import { Button } from '@/components/button'

type FeedItem = {
  id: string
  authorId: string
  authorUsername?: string
  authorDisplayName?: string
  title: string
  body: string
  category: string
  prayedCount: number
  prayerTypeCounts?: Record<string, number>
}

type FeedScope = 'home' | 'public' | 'groups' | 'friends'
type ProfileMini = { id: string }

const tabs: Array<{ scope: FeedScope; label: string; endpoint: string; requiresAuth: boolean }> = [
  { scope: 'home', label: 'Principal', endpoint: '/feed/home', requiresAuth: true },
  { scope: 'groups', label: 'Grupos', endpoint: '/feed/groups', requiresAuth: true },
  { scope: 'friends', label: 'Amigos', endpoint: '/feed/friends', requiresAuth: true },
  { scope: 'public', label: 'Público', endpoint: '/feed/public', requiresAuth: false }
]

const prayerActions = [
  { type: 'HAIL_MARY', emoji: '🙏', label: 'Ave Maria' },
  { type: 'OUR_FATHER', emoji: '✝️', label: 'Pai Nosso' },
  { type: 'GLORY_BE', emoji: '✨', label: 'Glória' },
  { type: 'ROSARY_DECADE', emoji: '📿', label: 'Terço' },
  { type: 'ROSARY_FULL', emoji: '🕊️', label: 'Rosário' }
]

const categoryLabel: Record<string, string> = {
  HEALTH: 'Saúde',
  FAMILY: 'Família',
  WORK: 'Trabalho',
  GRIEF: 'Luto',
  THANKSGIVING: 'Ação de graças',
  OTHER: 'Outros'
}

export function FeedPage() {
  const queryClient = useQueryClient()
  const [lastPrayerHit, setLastPrayerHit] = useState<{ requestID: string; actionType: string; fxID: number } | null>(null)
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
  const profileQuery = useQuery({
    queryKey: ['profile', 'feed'],
    queryFn: async () => {
      const res = await api.get<ProfileMini>('/profile')
      return res.data
    }
  })
  const prayMutation = useMutation({
    mutationFn: async ({ requestID, actionType }: { requestID: string; actionType: string }) => {
      await api.post(`/requests/${requestID}/pray`, { actionType })
    },
    onSuccess: async (_data, variables) => {
      setLastPrayerHit({ requestID: variables.requestID, actionType: variables.actionType, fxID: Date.now() })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    }
  })

  useEffect(() => {
    if (!lastPrayerHit) {
      return
    }
    const timer = window.setTimeout(() => setLastPrayerHit(null), 900)
    return () => window.clearTimeout(timer)
  }, [lastPrayerHit])

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

      <section className="mt-5 w-full space-y-3">
        {query.isLoading && <div className="pv-panel rounded-2xl p-4 text-sm pv-muted">Carregando intenções...</div>}

        {isUnauthorized && activeTab.requiresAuth && (
          <div className="pv-panel rounded-2xl p-4 text-sm">
            <p className="text-secondary">Você precisa entrar para visualizar o feed de {activeTab.label.toLowerCase()}.</p>
          </div>
        )}

        {!query.isLoading && !isUnauthorized && items.length === 0 && (
          <div className="pv-panel rounded-2xl p-4 text-sm pv-muted">Ainda não existem pedidos neste feed.</div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className={`pv-panel rounded-2xl p-5 ${lastPrayerHit?.requestID === item.id ? 'pv-card-hit' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3f2a24] text-lg font-bold text-[#f4d6cb]">
                    {(item.authorDisplayName?.[0] || item.authorUsername?.[0] || 'U').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <Link className="block text-[31px] font-semibold leading-tight text-secondary hover:text-[#f0c7b8] sm:text-[34px]" to={`/requests/${item.id}`}>{item.title}</Link>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-semibold text-secondary">{item.authorDisplayName || 'Membro'}</p>
                      <p className="truncate text-xs text-[#c4ad9d]">@{item.authorUsername || 'usuario'}</p>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-xl border border-[#9f5e49] bg-gradient-to-r from-[#6b3d31] to-[#9f5e49] px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-[#ffe4db]">
                  {categoryLabel[item.category] || item.category}
                </span>
              </div>

              <div className="pl-[72px]">
                <p className="pv-muted mt-2 text-base leading-relaxed">{item.body}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#25352c] pt-4">
                <p className={`text-xs text-[#98ab90] ${lastPrayerHit?.requestID === item.id ? 'pv-count-hit' : ''}`}>Orações registradas: {item.prayedCount}</p>
                {profileQuery.data?.id === item.authorId && (
                  <Link className="text-xs text-[#f2c5b6] hover:text-[#ffd8cc]" to={`/requests/${item.id}`}>Editar pedido</Link>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {prayerActions.map((action) => (
                  <span key={`${item.id}-${action.type}`} className={lastPrayerHit?.requestID === item.id && lastPrayerHit?.actionType === action.type ? 'pv-prayer-chip-hit relative inline-flex rounded-full' : 'relative inline-flex rounded-full'}>
                  {lastPrayerHit?.requestID === item.id && lastPrayerHit?.actionType === action.type && (
                    <span className="pv-prayer-fx" key={`${item.id}-${action.type}-${lastPrayerHit.fxID}`}>
                      <span className="pv-prayer-fx-ring" />
                      <span className="pv-prayer-fx-emoji">{action.emoji}</span>
                      <span className="pv-prayer-fx-spark pv-prayer-fx-spark-a" />
                      <span className="pv-prayer-fx-spark pv-prayer-fx-spark-b" />
                      <span className="pv-prayer-fx-spark pv-prayer-fx-spark-c" />
                    </span>
                  )}
                  <button
                    className="pv-chip rounded-full px-3 py-1 text-xs"
                    disabled={prayMutation.isPending}
                    onClick={() => prayMutation.mutate({ requestID: item.id, actionType: action.type })}
                    type="button"
                  >
                    {action.emoji} {action.label} ({item.prayerTypeCounts?.[action.type] ?? 0})
                  </button>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
