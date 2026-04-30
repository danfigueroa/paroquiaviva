import { Link } from 'react-router-dom'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type AvatarUser = {
  displayName?: string | null
  username?: string | null
  avatarUrl?: string | null
}

type AvatarProps = {
  user: AvatarUser
  size?: AvatarSize
  className?: string
  linkToProfile?: boolean
  ariaLabel?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-2xl'
}

function initialOf(user: AvatarUser): string {
  const source = user.displayName || user.username || ''
  return (source[0] || 'U').toUpperCase()
}

export function Avatar({ user, size = 'sm', className, linkToProfile = false, ariaLabel }: AvatarProps) {
  const sizing = sizeClasses[size]
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary ${sizing}`
  const merged = className ? `${base} ${className}` : base
  const content = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.displayName || user.username || ''}
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-bg font-bold text-primary">
      {initialOf(user)}
    </span>
  )

  if (linkToProfile && user.username) {
    return (
      <Link
        to={`/u/${user.username}`}
        className={merged}
        aria-label={ariaLabel || `Ver perfil de ${user.displayName || user.username}`}
      >
        {content}
      </Link>
    )
  }
  return <span className={merged}>{content}</span>
}
