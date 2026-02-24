import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/state/session-store'
import { getSupabaseClient } from '@/lib/supabase'
import { api } from '@/lib/api'

type ProfileMini = {
  email: string
  username: string
  displayName: string
}

type SearchUser = {
  userId: string
  username: string
  displayName: string
}

type SearchGroup = {
  id: string
  name: string
  description: string
  joinPolicy: 'OPEN' | 'REQUEST' | 'INVITE_ONLY'
  isMember: boolean
}

type MyGroup = {
  id: string
  name: string
  description: string
  joinPolicy: 'OPEN' | 'REQUEST' | 'INVITE_ONLY'
}

export function PageShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const setAccessToken = useSessionStore((s) => s.setAccessToken)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchNotice, setSearchNotice] = useState('')
  const [requestedUsers, setRequestedUsers] = useState<Record<string, boolean>>({})
  const [requestedGroups, setRequestedGroups] = useState<Record<string, boolean>>({})
  const menuRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLDivElement | null>(null)
  const profileQuery = useQuery({
    queryKey: ['profile', 'shell'],
    queryFn: async () => {
      const res = await api.get<ProfileMini>('/profile')
      return res.data
    }
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  const normalizedSearch = debouncedSearchTerm.trim()
  const normalizedGroupSearch = normalizedSearch.replace(/^@+/, '').trim()
  const canSearchUsers = normalizedSearch.length >= 2 && !profileQuery.isError
  const canSearchGroups = normalizedGroupSearch.length >= 2 && !profileQuery.isError

  const usersSearchQuery = useQuery({
    queryKey: ['shell-search-users', normalizedSearch],
    enabled: canSearchUsers,
    queryFn: async () => {
      const res = await api.get<{ items: SearchUser[] }>('/users/search', {
        params: { q: normalizedSearch }
      })
      return res.data.items
    }
  })

  const groupsSearchQuery = useQuery({
    queryKey: ['shell-search-groups', normalizedGroupSearch],
    enabled: canSearchGroups,
    queryFn: async () => {
      try {
        const res = await api.get<{ items: SearchGroup[] }>('/groups/search', {
          params: { q: normalizedGroupSearch }
        })
        return res.data.items
      } catch {
        const res = await api.get<{ items: MyGroup[] }>('/groups')
        const normalized = normalizedGroupSearch.toLowerCase()
        return (res.data.items ?? [])
          .filter((group) => {
            return group.name.toLowerCase().includes(normalized) || (group.description || '').toLowerCase().includes(normalized)
          })
          .map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            joinPolicy: group.joinPolicy,
            isMember: true
          }))
      }
    }
  })

  const sendFriendRequest = useMutation({
    mutationFn: async (targetUsername: string) => {
      await api.post('/friends/requests', { targetUsername })
    },
    onSuccess: (_data, username) => {
      setRequestedUsers((prev) => ({ ...prev, [username.toLowerCase()]: true }))
      setSearchNotice('Solicitação de amizade enviada.')
    },
    onError: () => {
      setSearchNotice('Não foi possível enviar solicitação de amizade.')
    }
  })

  const requestGroupJoin = useMutation({
    mutationFn: async (groupID: string) => {
      await api.post(`/groups/${groupID}/join-requests`)
    },
    onSuccess: (_data, groupID) => {
      setRequestedGroups((prev) => ({ ...prev, [groupID]: true }))
      setSearchNotice('Solicitação para entrar no grupo enviada.')
    },
    onError: () => {
      setSearchNotice('Não foi possível solicitar entrada no grupo.')
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

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }

    if (menuOpen || searchOpen) {
      document.addEventListener('mousedown', onClickOutside)
      document.addEventListener('keydown', onKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, searchOpen])

  useEffect(() => {
    if (!searchNotice) {
      return
    }
    const timer = window.setTimeout(() => setSearchNotice(''), 2500)
    return () => window.clearTimeout(timer)
  }, [searchNotice])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 rounded-2xl border border-[#2d3a2f] bg-[#111714]/90 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="shrink-0 text-lg font-semibold text-secondary">
            Paróquia Viva
          </Link>

          <div className="relative" ref={menuRef}>
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

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="overflow-x-auto">
            <nav className="inline-flex min-w-max flex-nowrap gap-2 text-sm" aria-label="Menu principal">
              <NavLink className={({ isActive }) => navClass('pv-chip whitespace-nowrap rounded-full px-3 py-1.5', isActive)} to="/feed">Mural</NavLink>
              <NavLink className={({ isActive }) => navClass('pv-chip whitespace-nowrap rounded-full px-3 py-1.5', isActive)} to="/friends">Amigos</NavLink>
              <NavLink className={({ isActive }) => navClass('pv-chip whitespace-nowrap rounded-full px-3 py-1.5', isActive)} to="/requests/new">Novo Pedido</NavLink>
              <NavLink className={({ isActive }) => navClass('pv-chip whitespace-nowrap rounded-full px-3 py-1.5', isActive)} to="/groups">Criar Grupo</NavLink>
              <NavLink className={({ isActive }) => navClass('pv-chip whitespace-nowrap rounded-full px-3 py-1.5', isActive)} to="/moderation">Moderação</NavLink>
            </nav>
          </div>

          <div className="relative w-full" ref={searchRef}>
            <input
              className="h-10 w-full rounded-xl border border-[#2f3f34] bg-[#0f1713] px-3 text-sm text-secondary outline-none transition focus:border-[#e27d60] focus:ring-2 focus:ring-[#e27d60]/25"
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar amigos e grupos"
              value={searchTerm}
            />

            {searchOpen && (
              <div className="absolute right-0 z-30 mt-2 w-full rounded-2xl border border-[#334236] bg-[#121915] p-3 shadow-[0_24px_55px_-30px_rgba(0,0,0,0.9)]">
                {normalizedSearch.length < 2 && (
                  <p className="pv-muted text-xs">Digite pelo menos 2 caracteres para buscar amigos e grupos.</p>
                )}

                {searchNotice && (
                  <p className="mb-2 rounded-lg border border-[#2b5b41] bg-[#153123] px-2 py-1 text-xs text-[#bde7c9]">{searchNotice}</p>
                )}

                {normalizedSearch.length >= 2 && (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab19f]">Amigos</p>
                      <div className="space-y-1.5">
                        {(usersSearchQuery.data ?? []).map((user) => {
                          const alreadyRequested = requestedUsers[user.username.toLowerCase()]
                          return (
                            <div key={user.userId} className="flex items-center justify-between rounded-xl border border-[#2a3830] bg-[#141d18] px-2.5 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-secondary">{user.displayName}</p>
                                <p className="truncate text-xs text-[#b9a99b]">@{user.username}</p>
                              </div>
                              <button
                                className="pv-chip shrink-0 rounded-full px-2.5 py-1 text-xs disabled:opacity-50"
                                disabled={alreadyRequested || sendFriendRequest.isPending}
                                onClick={() => sendFriendRequest.mutate(user.username)}
                                type="button"
                              >
                                {alreadyRequested ? 'Enviado' : 'Adicionar'}
                              </button>
                            </div>
                          )
                        })}
                        {usersSearchQuery.isSuccess && (usersSearchQuery.data ?? []).length === 0 && (
                          <p className="pv-muted text-xs">Nenhum amigo encontrado.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab19f]">Grupos</p>
                      <div className="space-y-1.5">
                        {(groupsSearchQuery.data ?? []).map((group) => {
                          const alreadyRequested = requestedGroups[group.id]
                          return (
                            <div key={group.id} className="flex items-center justify-between rounded-xl border border-[#2a3830] bg-[#141d18] px-2.5 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-secondary">{group.name}</p>
                                <p className="truncate text-xs text-[#b9a99b]">{group.joinPolicy}</p>
                              </div>
                              <button
                                className="pv-chip shrink-0 rounded-full px-2.5 py-1 text-xs disabled:opacity-50"
                                disabled={group.isMember || alreadyRequested || requestGroupJoin.isPending}
                                onClick={() => requestGroupJoin.mutate(group.id)}
                                type="button"
                              >
                                {group.isMember ? 'No grupo' : alreadyRequested ? 'Solicitado' : 'Entrar'}
                              </button>
                            </div>
                          )
                        })}
                        {groupsSearchQuery.isSuccess && (groupsSearchQuery.data ?? []).length === 0 && (
                          <p className="pv-muted text-xs">Nenhum grupo encontrado.</p>
                        )}
                        {groupsSearchQuery.isError && (
                          <p className="rounded-lg border border-[#6b3f35] bg-[#261714] px-2 py-1 text-xs text-[#ffb7a3]">Não foi possível buscar grupos agora.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
