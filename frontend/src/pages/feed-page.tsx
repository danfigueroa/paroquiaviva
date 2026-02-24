import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  visibility: 'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE'
  groupNames?: string[]
  createdAt: string
  prayedCount: number
  prayerTypeCounts?: Record<string, number>
}

type FeedScope = 'home' | 'public' | 'groups' | 'friends'
type ProfileMini = { id: string }
type FeedPagination = { page: number; pageSize: number; total: number; totalPages: number }
type FeedResponse = { items: FeedItem[]; pagination: FeedPagination }

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

const visibilityLabel: Record<FeedItem['visibility'], string> = {
  PUBLIC: 'Público',
  GROUP_ONLY: 'Grupo',
  PRIVATE: 'Só amigos'
}

const feedPageSize = 10

function formatPostDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function FeedPage() {
  const queryClient = useQueryClient()
  const [lastPrayerHit, setLastPrayerHit] = useState<{ requestID: string; actionType: string; fxID: number } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const rawScope = searchParams.get('scope') as FeedScope | null
  const scope: FeedScope = rawScope && tabs.some((tab) => tab.scope === rawScope) ? rawScope : 'home'
  const rawPage = Number.parseInt(searchParams.get('page') || '1', 10)
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const activeTab = tabs.find((tab) => tab.scope === scope) ?? tabs[0]

  const fetchFeed = async (targetScope: FeedScope, targetPage: number) => {
    const targetTab = tabs.find((tab) => tab.scope === targetScope) ?? tabs[0]
    const targetOffset = (targetPage - 1) * feedPageSize
    const res = await api.get<FeedResponse>(targetTab.endpoint, {
      params: { limit: feedPageSize, offset: targetOffset }
    })
    return res.data
  }

  const query = useQuery({
    queryKey: ['feed', scope, page],
    queryFn: async () => fetchFeed(scope, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000
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

  const feedData = query.data
  const items = feedData?.items ?? []
  const totalPages = Math.max(feedData?.pagination?.totalPages ?? 1, 1)
  const isUnauthorized = (query.error as any)?.response?.status === 401

  useEffect(() => {
    if (!lastPrayerHit) {
      return
    }
    const timer = window.setTimeout(() => setLastPrayerHit(null), 900)
    return () => window.clearTimeout(timer)
  }, [lastPrayerHit])

  useEffect(() => {
    const canPrefetchProtectedTabs = Boolean(profileQuery.data?.id)
    for (const tab of tabs) {
      if (tab.scope === scope) {
        continue
      }
      if (tab.requiresAuth && !canPrefetchProtectedTabs) {
        continue
      }
      queryClient.prefetchQuery({
        queryKey: ['feed', tab.scope, page],
        queryFn: () => fetchFeed(tab.scope, page),
        staleTime: 30_000
      })
    }
  }, [scope, page, profileQuery.data?.id, queryClient])

  useEffect(() => {
    if (isUnauthorized) {
      return
    }
    if (query.isLoading) {
      return
    }
    if (feedData && page >= totalPages) {
      return
    }
    const nextPage = page + 1
    queryClient.prefetchQuery({
      queryKey: ['feed', scope, nextPage],
      queryFn: () => fetchFeed(scope, nextPage),
      staleTime: 30_000
    })
  }, [scope, page, totalPages, isUnauthorized, query.isLoading, feedData, queryClient])

  const changeScope = (nextScope: FeedScope) => {
    setSearchParams({ scope: nextScope, page: '1' })
  }

  const goToPage = (target: number) => {
    const nextPage = Math.min(Math.max(target, 1), totalPages)
    setSearchParams({ scope, page: String(nextPage) })
  }

  const paginationStart = Math.max(1, page - 2)
  const paginationEnd = Math.min(totalPages, paginationStart + 4)
  const pageNumbers = Array.from({ length: paginationEnd - paginationStart + 1 }, (_, idx) => paginationStart + idx)

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Feed social</p>
            <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Intenções e pedidos de oração</h1>
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
              onClick={() => changeScope(tab.scope)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 w-full space-y-3">
        {query.isLoading && <div className="pv-panel rounded-2xl p-4 text-sm pv-muted">Carregando intenções...</div>}
        {query.isFetching && !query.isLoading && <div className="text-xs text-[#9fb3a7]">Atualizando feed...</div>}

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3f2a24] text-lg font-bold text-[#f4d6cb]">
                    {(item.authorDisplayName?.[0] || item.authorUsername?.[0] || 'U').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <Link className="block break-words text-3xl font-semibold leading-tight text-secondary hover:text-[#f0c7b8] sm:text-[34px]" to={`/requests/${item.id}`}>{item.title}</Link>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-semibold text-secondary">{item.authorDisplayName || 'Membro'}</p>
                      <p className="truncate text-xs text-[#c4ad9d]">@{item.authorUsername || 'usuario'}</p>
                      <span className="text-xs text-[#9fb3a7]">•</span>
                      <p className="truncate text-xs text-[#9fb3a7]">{formatPostDate(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:shrink-0 sm:self-auto sm:justify-end">
                  <span className="rounded-xl border border-[#9f5e49] bg-gradient-to-r from-[#6b3d31] to-[#9f5e49] px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-[#ffe4db]">
                    {categoryLabel[item.category] || item.category}
                  </span>
                  <span className="rounded-xl border border-[#2d4f3a] bg-[#183122] px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-[#b8dbbf]">
                    {visibilityLabel[item.visibility]}
                  </span>
                  {item.groupNames?.map((groupName) => (
                    <span key={`${item.id}-${groupName}`} className="inline-flex items-center gap-1 rounded-xl border border-[#1f5a3c] bg-[#103422] px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#c8f1d5]">
                      <span aria-hidden>👥</span>
                      <span>{groupName}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="sm:pl-[72px]">
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

        {!isUnauthorized && !query.isLoading && items.length > 0 && (
          <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-[#254036] bg-[#0f1b16]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#9fb3a7]">Página {page} de {totalPages}</p>
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              <button
                className="pv-chip rounded-full px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page <= 1 || query.isFetching}
                onClick={() => goToPage(1)}
                type="button"
              >
                Primeira
              </button>
              <button
                className="pv-chip rounded-full px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page <= 1 || query.isFetching}
                onClick={() => goToPage(page - 1)}
                type="button"
              >
                Anterior
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${pageNumber === page ? 'pv-chip-active' : 'pv-chip'}`}
                  disabled={query.isFetching}
                  onClick={() => goToPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              <button
                className="pv-chip rounded-full px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= totalPages || query.isFetching}
                onClick={() => goToPage(page + 1)}
                type="button"
              >
                Próxima
              </button>
            </div>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  )
}
