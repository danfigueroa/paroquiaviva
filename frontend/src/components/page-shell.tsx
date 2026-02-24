import { PropsWithChildren, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/state/session-store'
import { getSupabaseClient } from '@/lib/supabase'
import { api } from '@/lib/api'

type ProfileMini = {
  email: string
  username: string
  displayName: string
}

export function PageShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const setAccessToken = useSessionStore((s) => s.setAccessToken)
  const [menuOpen, setMenuOpen] = useState(false)
  const profileQuery = useQuery({
    queryKey: ['profile', 'shell'],
    queryFn: async () => {
      const res = await api.get<ProfileMini>('/profile')
      return res.data
    }
  })

  const displayName = useMemo(() => {
    const profile = profileQuery.data
    if (!profile) {
      return 'Minha conta'
    }
    return profile.displayName || profile.email.split('@')[0] || 'Minha conta'
  }, [profileQuery.data])

  const username = profileQuery.data?.username ? `@${profileQuery.data.username}` : ''
  const avatarLetter = (displayName[0] || 'U').toUpperCase()

  function navClass(baseClass: string, isActive: boolean) {
    if (isActive) {
      return `${baseClass} pv-chip-active`
    }
    return baseClass
  }

  async function onLogout() {
    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setAccessToken(null)
    navigate('/auth', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 rounded-2xl border border-[#2d3a2f] bg-[#111714]/90 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-lg font-semibold text-secondary">
            Paróquia Viva
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex flex-wrap gap-2 text-sm">
            <NavLink className={({ isActive }) => navClass('pv-chip rounded-full px-3 py-1.5', isActive)} to="/feed">Mural</NavLink>
            <NavLink className={({ isActive }) => navClass('pv-chip rounded-full px-3 py-1.5', isActive)} to="/friends">Amigos</NavLink>
            <NavLink className={({ isActive }) => navClass('pv-chip rounded-full px-3 py-1.5', isActive)} to="/requests/new">Novo Pedido</NavLink>
            <NavLink className={({ isActive }) => navClass('pv-chip rounded-full px-3 py-1.5', isActive)} to="/groups">Grupos</NavLink>
            <NavLink className={({ isActive }) => navClass('pv-chip rounded-full px-3 py-1.5', isActive)} to="/moderation">Moderação</NavLink>
            </nav>

            <div className="relative">
              <button
                className="pv-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1.5"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3f2a24] text-xs font-bold text-[#f4d6cb]">{avatarLetter}</span>
                <span className="hidden max-w-[150px] truncate text-sm text-secondary sm:inline">{displayName}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[#334236] bg-[#121915] p-2 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-secondary">{displayName}</p>
                    <p className="pv-muted truncate text-xs">{username || profileQuery.data?.email || ''}</p>
                  </div>
                  <Link className="block rounded-xl px-3 py-2 text-sm text-[#e8dcca] hover:bg-[#1b2520]" onClick={() => setMenuOpen(false)} to="/profile">
                    Ver perfil
                  </Link>
                  <button
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#f0c7b8] hover:bg-[#2a1d19]"
                    onClick={onLogout}
                    type="button"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
