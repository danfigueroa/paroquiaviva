import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type NotificationType =
  | 'PRAYED'
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'GROUP_JOIN_APPROVED'
  | 'GROUP_JOIN_REQUESTED'

type SubjectType = 'PRAYER_REQUEST' | 'FRIENDSHIP' | 'GROUP'

type Actor = {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

type Notification = {
  id: string
  type: NotificationType
  subjectType: SubjectType
  subjectId: string
  actor?: Actor | null
  payload: Record<string, unknown>
  readAt?: string | null
  createdAt: string
}

type ListResponse = {
  items: Notification[]
  unreadCount: number
}

const POLL_INTERVAL_MS = 30_000

function copyFor(n: Notification): string {
  const name = n.actor?.displayName || n.actor?.username || 'Alguém'
  switch (n.type) {
    case 'PRAYED':
      return `${name} orou pelo seu pedido`
    case 'FRIEND_REQUEST_RECEIVED':
      return `${name} quer ser seu amigo`
    case 'FRIEND_REQUEST_ACCEPTED':
      return `${name} aceitou seu pedido de amizade`
    case 'GROUP_JOIN_APPROVED':
      return 'Você foi aceito em um grupo'
    case 'GROUP_JOIN_REQUESTED':
      return `${name} pediu para entrar em um grupo que você administra`
    default:
      return 'Nova notificação'
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const sec = Math.round(ms / 1000)
  if (sec < 60) return 'agora'
  const min = Math.round(sec / 60)
  if (min < 60) return `há ${min} min`
  const hr = Math.round(min / 60)
  if (hr < 24) return `há ${hr} h`
  const day = Math.round(hr / 24)
  if (day < 30) return `há ${day} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function targetPath(n: Notification): string {
  switch (n.subjectType) {
    case 'PRAYER_REQUEST':
      return `/requests/${n.subjectId}`
    case 'FRIENDSHIP':
      return '/friends'
    case 'GROUP':
      return `/groups/${n.subjectId}`
    default:
      return '/feed'
  }
}

export function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count')
      return res.data.count
    }
  })

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    enabled: open,
    queryFn: async () => {
      const res = await api.get<ListResponse>('/notifications', { params: { limit: 20 } })
      return res.data
    }
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      ])
    }
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all')
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      ])
    }
  })

  useEffect(() => {
    if (!open) return
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const unreadCount = unreadQuery.data ?? 0
  const items = listQuery.data?.items ?? []
  const badge = useMemo(() => {
    if (!unreadCount) return null
    return unreadCount > 9 ? '9+' : String(unreadCount)
  }, [unreadCount])

  function handleItemClick(n: Notification) {
    setOpen(false)
    if (!n.readAt) {
      markRead.mutate(n.id)
    }
    navigate(targetPath(n))
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        className="pv-chip relative inline-flex h-9 w-9 items-center justify-center rounded-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {badge && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-onPrimary">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-primary bg-panel shadow-[0_24px_55px_-30px_rgba(var(--shadow-rgb),0.55)]">
          <div className="flex items-center justify-between border-b border-primary/30 px-3 py-2.5">
            <p className="text-sm font-semibold text-secondary">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-[11px] font-semibold text-primary hover:text-secondary disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {listQuery.isLoading && (
              <p className="pv-muted px-3 py-6 text-center text-xs">Carregando…</p>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <p className="pv-muted px-3 py-6 text-center text-xs">Você está em dia. Nada por aqui.</p>
            )}
            {items.map((n) => {
              const initial = (n.actor?.displayName?.[0] || n.actor?.username?.[0] || '·').toUpperCase()
              const unread = !n.readAt
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-3 border-b border-primary/15 px-3 py-3 text-left transition last:border-b-0 hover:bg-primary/5 ${unread ? 'bg-primary/5' : ''}`}
                >
                  {n.actor?.avatarUrl ? (
                    <img
                      src={n.actor.avatarUrl}
                      alt={n.actor.displayName || n.actor.username}
                      className="h-9 w-9 shrink-0 rounded-full border border-primary object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary bg-bg text-xs font-bold text-primary">
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-secondary">{copyFor(n)}</p>
                    <p className="pv-muted mt-0.5 text-[11px]">{relativeTime(n.createdAt)}</p>
                  </div>
                  {unread && (
                    <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
