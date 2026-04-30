import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { PrayerAction } from '@/lib/traditions'
import { Avatar } from '@/components/avatar'

export type FeedCardItem = {
  id: string
  authorId: string
  authorUsername?: string
  authorDisplayName?: string
  authorAvatarUrl?: string | null
  title: string
  body: string
  category: string
  visibility: 'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE'
  groupIds?: string[]
  groupNames?: string[]
  createdAt: string
  prayedCount: number
  prayerTypeCounts?: Record<string, number>
}

type PrayerHit = { requestID: string; actionType: string; fxID: number } | null

type FeedCardProps = {
  item: FeedCardItem
  viewerId?: string
  prayerActions: PrayerAction[]
  onPray: (requestID: string, actionType: string) => void
  isPrayPending: boolean
  lastPrayerHit: PrayerHit
  groupNameById: Map<string, string>
  categoryLabel: Record<string, string>
  formatDate: (value: string) => string
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  if (diff < 0) return 'agora'
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}sem`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mês`
  const y = Math.floor(d / 365)
  return `${y}a`
}

function FeedCardComponent({
  item,
  viewerId,
  prayerActions,
  onPray,
  isPrayPending,
  lastPrayerHit,
  groupNameById,
  categoryLabel,
  formatDate
}: FeedCardProps) {
  const primaryGroupName =
    item.groupNames?.[0] || (item.groupIds?.[0] ? groupNameById.get(item.groupIds[0]) : undefined)
  const extraGroupsCount = Math.max((item.groupNames?.length ?? 0) - 1, 0)
  const isHit = lastPrayerHit?.requestID === item.id
  const isOwner = viewerId === item.authorId
  const fullDate = formatDate(item.createdAt)
  const authorUser = {
    displayName: item.authorDisplayName,
    username: item.authorUsername,
    avatarUrl: item.authorAvatarUrl
  }

  return (
    <article className={`pv-feed-row group relative flex gap-3 py-4 ${isHit ? 'pv-card-hit' : ''}`}>
      <Avatar user={authorUser} size="md" linkToProfile={!!item.authorUsername} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {item.authorUsername ? (
            <Link to={`/u/${item.authorUsername}`} className="max-w-[55%] truncate font-semibold text-secondary hover:text-primary">
              {item.authorDisplayName || 'Membro'}
            </Link>
          ) : (
            <span className="max-w-[55%] truncate font-semibold text-secondary">
              {item.authorDisplayName || 'Membro'}
            </span>
          )}
          <span className="truncate text-xs text-primary/80">@{item.authorUsername || 'usuario'}</span>
          <span className="text-xs text-primary/50" aria-hidden>·</span>
          <time className="text-xs text-primary/70" dateTime={item.createdAt} title={fullDate}>
            {relativeTime(item.createdAt)}
          </time>
          <span className="text-xs text-primary/50" aria-hidden>·</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-primary">
            {categoryLabel[item.category] || item.category}
          </span>
          {item.visibility === 'GROUP_ONLY' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-panel px-2 py-0.5 text-[10px] font-semibold text-primary">
              <span aria-hidden>👥</span>
              <span className="max-w-[10rem] truncate">{primaryGroupName || 'Grupo'}</span>
              {extraGroupsCount > 0 && <span className="text-primary/70">+{extraGroupsCount}</span>}
            </span>
          )}
          {isOwner && (
            <Link
              to={`/requests/${item.id}`}
              className="ml-auto text-[11px] text-primary/70 hover:text-primary"
              aria-label="Editar pedido"
            >
              Editar
            </Link>
          )}
        </div>

        <Link to={`/requests/${item.id}`} className="mt-1 block">
          <h3 className="text-[15px] font-semibold leading-snug text-secondary group-hover:text-primary">
            {item.title}
          </h3>
          <p className="pv-feed-body pv-muted mt-1 text-[15px] leading-relaxed">{item.body}</p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {prayerActions.map((action) => {
            const count = item.prayerTypeCounts?.[action.type] ?? 0
            const activeFx = isHit && lastPrayerHit?.actionType === action.type
            return (
              <span
                key={`${item.id}-${action.type}`}
                className={`relative inline-flex ${activeFx ? 'pv-prayer-chip-hit' : ''}`}
              >
                {activeFx && (
                  <span className="pv-prayer-fx" aria-hidden>
                    <span className="pv-prayer-fx-ring" />
                    <span className="pv-prayer-fx-emoji">{action.emoji}</span>
                    <span className="pv-prayer-fx-spark pv-prayer-fx-spark-a" />
                    <span className="pv-prayer-fx-spark pv-prayer-fx-spark-b" />
                    <span className="pv-prayer-fx-spark pv-prayer-fx-spark-c" />
                  </span>
                )}
                <button
                  type="button"
                  disabled={isPrayPending}
                  onClick={() => onPray(item.id, action.type)}
                  aria-label={`${action.label} (${count})`}
                  className="pv-action-btn inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-panel/50 px-2.5 py-1 text-xs font-medium text-muted transition hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-60"
                >
                  <span aria-hidden>{action.emoji}</span>
                  <span>{action.label}</span>
                  {count > 0 && <span className="tabular-nums text-primary">{count}</span>}
                </button>
              </span>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export const FeedCard = memo(FeedCardComponent)
