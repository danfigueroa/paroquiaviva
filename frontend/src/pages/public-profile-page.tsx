import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { api } from '@/lib/api'
import { prayerActionsFor, traditionLabel, type Tradition } from '@/lib/traditions'
import { categoryEmoji, categoryLabel, prayerCategoryOptions } from '@/lib/categories'

type FriendshipState = 'SELF' | 'FRIEND' | 'PENDING_OUT' | 'PENDING_IN' | 'NONE'

type PublicProfile = {
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
    bio?: string | null
    tradition: Tradition
  }
  friendshipStatus: FriendshipState
  incomingFriendRequestId?: string | null
  stats?: {
    requestsCreated: number
    prayerActionsTotal: number
    prayerActionsByType: Record<string, number>
    prayerActionsByCategory: Record<string, number>
  } | null
}

export function PublicProfilePage() {
  const { username = '' } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['profile', 'public', username.toLowerCase()],
    enabled: username.length > 0,
    queryFn: async () => {
      const res = await api.get<PublicProfile>(`/users/${username}`)
      return res.data
    },
    retry: false
  })

  const sendFriendRequest = useMutation({
    mutationFn: async () => {
      await api.post('/friends/requests', { targetUsername: username })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'public', username.toLowerCase()] })
    }
  })

  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(`/friends/requests/${requestId}/accept`)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', 'public', username.toLowerCase()] }),
        queryClient.invalidateQueries({ queryKey: ['friends'] }),
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      ])
    }
  })

  const status = profileQuery.data?.friendshipStatus
  const owner = profileQuery.data?.user
  const stats = profileQuery.data?.stats
  const prayerActions = useMemo(
    () => (owner ? prayerActionsFor(owner.tradition) : []),
    [owner]
  )

  if (profileQuery.isLoading) {
    return (
      <PageShell>
        <section className="pv-panel rounded-3xl p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <span className="pv-shimmer h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <span className="pv-shimmer block h-5 w-48 rounded" />
              <span className="pv-shimmer block h-4 w-32 rounded" />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <span className="pv-shimmer block h-4 w-full rounded" />
            <span className="pv-shimmer block h-4 w-3/4 rounded" />
          </div>
        </section>
      </PageShell>
    )
  }

  if (profileQuery.isError || !owner) {
    return (
      <PageShell>
        <section className="pv-panel rounded-3xl p-6 text-center sm:p-8">
          <h1 className="pv-title text-xl font-bold text-secondary">Perfil não encontrado</h1>
          <p className="pv-muted mt-2 text-sm">Não encontramos um usuário com esse @username.</p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => navigate('/feed')}>Voltar ao mural</Button>
          </div>
        </section>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar user={owner} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="pv-title text-2xl font-bold text-secondary sm:text-3xl">{owner.displayName}</h1>
            <p className="pv-muted mt-0.5 text-sm">@{owner.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-panel px-2.5 py-1 text-[11px] font-semibold text-primary">
                <span aria-hidden>{owner.tradition === 'EVANGELICAL' ? '🕊️' : '📿'}</span>
                {traditionLabel[owner.tradition]}
              </span>
            </div>
          </div>
          <ProfileActionButton
            status={status}
            incomingId={profileQuery.data?.incomingFriendRequestId ?? null}
            onSendFriendRequest={() => sendFriendRequest.mutate()}
            onAcceptFriendRequest={(id) => acceptFriendRequest.mutate(id)}
            sendBusy={sendFriendRequest.isPending}
            acceptBusy={acceptFriendRequest.isPending}
          />
        </div>
        {owner.bio && (
          <p className="pv-muted mt-5 whitespace-pre-line text-sm leading-relaxed text-secondary/90">{owner.bio}</p>
        )}
      </section>

      {stats ? (
        <section className="pv-panel mt-5 rounded-3xl p-6 sm:p-7">
          <h2 className="pv-title text-xl font-bold text-secondary">Atividade de oração</h2>
          <p className="pv-muted mt-1 text-sm">
            {status === 'SELF' ? 'Estes números aparecem para amigos.' : `Visível porque vocês são amigos.`}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatCard label="Pedidos criados" value={stats.requestsCreated} />
            <StatCard label="Orações registradas" value={stats.prayerActionsTotal} />
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Por tipo de oração</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {prayerActions.map((action) => {
                const count = stats.prayerActionsByType[action.type] ?? 0
                if (count === 0) return null
                return (
                  <div key={action.type} className="flex items-center justify-between rounded-2xl border border-primary/40 bg-panel px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-secondary">
                      <span aria-hidden>{action.emoji}</span>
                      {action.label}
                    </span>
                    <span className="tabular-nums text-sm font-semibold text-primary">{count}</span>
                  </div>
                )
              })}
            </div>
            {prayerActions.every((a) => (stats.prayerActionsByType[a.type] ?? 0) === 0) && (
              <p className="pv-muted mt-2 text-xs">Sem orações registradas ainda.</p>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Por categoria de pedido</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {prayerCategoryOptions.map((option) => {
                const count = stats.prayerActionsByCategory[option.value] ?? 0
                if (count === 0) return null
                return (
                  <div key={option.value} className="flex items-center justify-between rounded-2xl border border-primary/40 bg-panel px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-secondary">
                      <span aria-hidden>{option.emoji}</span>
                      {option.label}
                    </span>
                    <span className="tabular-nums text-sm font-semibold text-primary">{count}</span>
                  </div>
                )
              })}
              {Object.keys(stats.prayerActionsByCategory).length === 0 && (
                <p className="pv-muted text-xs sm:col-span-2">Ainda não há categorias contabilizadas.</p>
              )}
            </div>
            {/* Render any unknown category fallback (defensive) */}
            <UnknownCategoriesList byCategory={stats.prayerActionsByCategory} />
          </div>
        </section>
      ) : status !== 'SELF' && (
        <section className="pv-panel mt-5 rounded-3xl p-6 sm:p-7">
          <p className="text-sm text-secondary">
            🔒 Estatísticas de oração ficam visíveis para amigos.
          </p>
          <p className="pv-muted mt-1 text-sm">
            Quando vocês forem amigos, você verá quantos pedidos {owner.displayName} criou e como ela tem orado pela comunidade.
          </p>
        </section>
      )}
    </PageShell>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-primary bg-panel p-5">
      <p className="pv-muted text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className="pv-title mt-1 text-3xl font-bold text-primary">{value}</p>
    </div>
  )
}

function UnknownCategoriesList({ byCategory }: { byCategory: Record<string, number> }) {
  const known = new Set(prayerCategoryOptions.map((o) => o.value))
  const unknown = Object.entries(byCategory).filter(([k]) => !known.has(k as never))
  if (unknown.length === 0) return null
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {unknown.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between rounded-2xl border border-primary/40 bg-panel px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-secondary">
            <span aria-hidden>{categoryEmoji(k)}</span>
            {categoryLabel(k)}
          </span>
          <span className="tabular-nums text-sm font-semibold text-primary">{v}</span>
        </div>
      ))}
    </div>
  )
}

type ProfileActionButtonProps = {
  status: FriendshipState | undefined
  incomingId: string | null
  onSendFriendRequest: () => void
  onAcceptFriendRequest: (id: string) => void
  sendBusy: boolean
  acceptBusy: boolean
}

function ProfileActionButton({ status, incomingId, onSendFriendRequest, onAcceptFriendRequest, sendBusy, acceptBusy }: ProfileActionButtonProps) {
  if (!status) return null
  if (status === 'SELF') {
    return (
      <Link to="/profile" className="shrink-0">
        <Button type="button" variant="secondary">Editar perfil</Button>
      </Link>
    )
  }
  if (status === 'FRIEND') {
    return (
      <span className="shrink-0 rounded-full border border-primary/40 bg-panel px-3 py-1.5 text-xs font-semibold text-primary">
        ✓ Amigos
      </span>
    )
  }
  if (status === 'PENDING_OUT') {
    return (
      <Button type="button" variant="secondary" disabled className="shrink-0">Solicitação enviada</Button>
    )
  }
  if (status === 'PENDING_IN' && incomingId) {
    return (
      <Button type="button" disabled={acceptBusy} onClick={() => onAcceptFriendRequest(incomingId)} className="shrink-0">
        {acceptBusy ? 'Aceitando…' : 'Aceitar solicitação'}
      </Button>
    )
  }
  return (
    <Button type="button" disabled={sendBusy} onClick={onSendFriendRequest} className="shrink-0">
      {sendBusy ? 'Enviando…' : 'Adicionar como amigo'}
    </Button>
  )
}
