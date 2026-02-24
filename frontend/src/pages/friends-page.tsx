import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

type UserSummary = {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
}

type Friend = {
  userId: string
  username: string
  displayName: string
  connectedAt: string
}

type FriendRequest = {
  id: string
  fromUserId: string
  username: string
  displayName: string
  requestedAt: string
}

export function FriendsPage() {
  const client = useQueryClient()
  const [query, setQuery] = useState('')

  const friendsQuery = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get<{ items: Friend[] }>('/friends')
      return res.data.items
    }
  })

  const requestsQuery = useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const res = await api.get<{ items: FriendRequest[] }>('/friends/requests')
      return res.data.items
    }
  })

  const searchQuery = useQuery({
    queryKey: ['friend-search', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const res = await api.get<{ items: UserSummary[] }>('/users/search', {
        params: { q: query }
      })
      return res.data.items
    }
  })

  const sendRequest = useMutation({
    mutationFn: async (targetUsername: string) => {
      await api.post('/friends/requests', { targetUsername })
    },
    onSuccess: async () => {
      await searchQuery.refetch()
      await requestsQuery.refetch()
    }
  })

  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(`/friends/requests/${requestId}/accept`)
    },
    onSuccess: async () => {
      await requestsQuery.refetch()
      await friendsQuery.refetch()
    }
  })

  function onSearch(e: FormEvent) {
    e.preventDefault()
    searchQuery.refetch()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Rede de amigos</p>
        <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Conectar pessoas da comunidade</h1>
        <p className="pv-muted mt-2 text-sm">Busque usuários pelo nome dentro do sistema e envie solicitações de amizade.</p>

        <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={onSearch}>
          <Input onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por @username ou nome" value={query} />
          <Button className="w-full sm:w-auto" type="submit">Buscar</Button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(searchQuery.data ?? []).map((user) => (
            <article key={user.userId} className="rounded-2xl border border-primary bg-panel p-4">
              <p className="text-sm font-semibold text-secondary">{user.displayName}</p>
              <p className="pv-muted mt-1 text-xs">@{user.username}</p>
              <Button className="mt-3 w-full sm:w-auto" disabled={sendRequest.isPending} onClick={() => sendRequest.mutate(user.username)}>
                Adicionar amigo
              </Button>
            </article>
          ))}
          {query.trim().length >= 2 && !searchQuery.isLoading && (searchQuery.data ?? []).length === 0 && (
            <p className="pv-muted rounded-2xl border border-primary bg-panel p-4 text-sm sm:col-span-2">Nenhum usuário encontrado para este nome.</p>
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="pv-panel rounded-3xl p-6">
          <h2 className="pv-title text-xl font-semibold text-secondary">Solicitações recebidas</h2>
          <div className="mt-4 space-y-3">
            {(requestsQuery.data ?? []).map((request) => (
              <article key={request.id} className="rounded-2xl border border-primary bg-panel p-4">
                <p className="text-sm text-secondary">{request.displayName}</p>
                <p className="pv-muted mt-1 text-xs">@{request.username}</p>
                <p className="pv-muted mt-1 text-xs">Recebida em {new Date(request.requestedAt).toLocaleString('pt-BR')}</p>
                <Button className="mt-3 w-full sm:w-auto" disabled={acceptRequest.isPending} onClick={() => acceptRequest.mutate(request.id)}>
                  Aceitar amizade
                </Button>
              </article>
            ))}
            {!requestsQuery.isLoading && (requestsQuery.data ?? []).length === 0 && (
              <p className="pv-muted rounded-2xl border border-primary bg-panel p-4 text-sm">Nenhuma solicitação pendente.</p>
            )}
          </div>
        </section>

        <section className="pv-panel rounded-3xl p-6">
          <h2 className="pv-title text-xl font-semibold text-secondary">Meus amigos</h2>
          <div className="mt-4 space-y-3">
            {(friendsQuery.data ?? []).map((friend) => (
              <article key={friend.userId} className="rounded-2xl border border-primary bg-panel p-4">
                <p className="text-sm font-semibold text-secondary">{friend.displayName}</p>
                <p className="pv-muted mt-1 text-xs">@{friend.username}</p>
                <p className="pv-muted mt-1 text-xs">Conectado em {new Date(friend.connectedAt).toLocaleDateString('pt-BR')}</p>
              </article>
            ))}
            {!friendsQuery.isLoading && (friendsQuery.data ?? []).length === 0 && (
              <p className="pv-muted rounded-2xl border border-primary bg-panel p-4 text-sm">Você ainda não possui amigos adicionados.</p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
