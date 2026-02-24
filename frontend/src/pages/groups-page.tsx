import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { TextArea } from '@/components/text-area'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

type Group = {
  id: string
  name: string
  description: string
  joinPolicy: 'OPEN' | 'REQUEST' | 'INVITE_ONLY'
}

type JoinRequest = {
  id: string
  userId: string
  requestedAt: string
}

export function GroupsPage() {
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [joinPolicy, setJoinPolicy] = useState<Group['joinPolicy']>('REQUEST')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [error, setError] = useState('')

  const groupsQuery = useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: async () => {
      const res = await api.get<{ items: Group[] }>('/groups')
      return res.data.items
    }
  })

  const createGroup = useMutation({
    mutationFn: async () => {
      await api.post('/groups', {
        name,
        description,
        joinPolicy,
        imageUrl: null
      })
    },
    onSuccess: async () => {
      setName('')
      setDescription('')
      setError('')
      await client.invalidateQueries({ queryKey: ['groups', 'mine'] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || 'Não foi possível criar grupo.')
    }
  })

  const selectedGroup = useMemo(() => {
    if (selectedGroupId) {
      return selectedGroupId
    }
    return (groupsQuery.data ?? [])[0]?.id ?? ''
  }, [groupsQuery.data, selectedGroupId])

  const requestsQuery = useQuery({
    queryKey: ['group-join-requests', selectedGroup],
    enabled: !!selectedGroup,
    queryFn: async () => {
      const res = await api.get<{ items: JoinRequest[] }>(`/groups/${selectedGroup}/join-requests`)
      return res.data.items
    }
  })

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(`/groups/${selectedGroup}/join-requests/${requestId}/approve`)
    },
    onSuccess: async () => {
      await requestsQuery.refetch()
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 3) {
      setError('O nome do grupo deve ter pelo menos 3 caracteres.')
      return
    }
    createGroup.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Rede de grupos</p>
        <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Comunidades de oração</h1>
        <p className="pv-muted mt-2 text-sm">Crie grupos, organize pedidos por comunidade e aprove novos membros quando você for admin.</p>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="pv-panel rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="pv-title text-xl font-semibold text-secondary">Meus grupos</h2>
            {selectedGroup && (
              <Link className="text-sm text-primary" to={`/groups/${selectedGroup}`}>
                Abrir gestão
              </Link>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {(groupsQuery.data ?? []).map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedGroup === group.id ? 'border-primary bg-panel' : 'border-primary bg-panel hover:border-primary'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-secondary">{group.name}</h3>
                  <span className="rounded-full border border-primary bg-panel px-2.5 py-1 text-[11px] font-semibold text-primary">{group.joinPolicy}</span>
                </div>
                <p className="pv-muted mt-2 text-sm">{group.description}</p>
              </button>
            ))}

            {!groupsQuery.isLoading && (groupsQuery.data ?? []).length === 0 && (
              <p className="pv-muted rounded-2xl border border-primary bg-panel p-4 text-sm">Você ainda não participa de grupos.</p>
            )}
          </div>
        </section>

        <section className="pv-panel rounded-3xl p-6">
          <h2 className="pv-title text-xl font-semibold text-secondary">Criar grupo</h2>
          <p className="pv-muted mt-2 text-sm">Defina um espaço próprio para pedidos e intenções da sua comunidade.</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do grupo" />
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do grupo" />
            <select
              value={joinPolicy}
              onChange={(e) => setJoinPolicy(e.target.value as Group['joinPolicy'])}
              className="h-11 w-full rounded-xl border border-primary bg-panel px-3 text-sm text-secondary"
            >
              <option value="OPEN">Aberto</option>
              <option value="REQUEST">Solicitação</option>
              <option value="INVITE_ONLY">Somente convite</option>
            </select>
            <Button className="w-full sm:w-auto" disabled={createGroup.isPending} type="submit">
              {createGroup.isPending ? 'Criando...' : 'Criar grupo'}
            </Button>
            {error && <p className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">{error}</p>}
            {groupsQuery.isError && <p className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">Não foi possível carregar seus grupos.</p>}
          </form>
        </section>
      </div>

      <section className="pv-panel mt-5 rounded-3xl p-6">
        <h2 className="pv-title text-xl font-semibold text-secondary">Solicitações pendentes</h2>
        <p className="pv-muted mt-2 text-sm">Aprovação de novos membros no grupo selecionado.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(requestsQuery.data ?? []).map((request) => (
            <article key={request.id} className="rounded-2xl border border-primary bg-panel p-4">
              <p className="text-sm text-secondary">Usuário: {request.userId}</p>
              <p className="pv-muted mt-1 text-xs">Solicitado em {new Date(request.requestedAt).toLocaleString('pt-BR')}</p>
              <Button className="mt-3 w-full sm:w-auto" onClick={() => approveRequest.mutate(request.id)}>
                Aprovar membro
              </Button>
            </article>
          ))}
          {!requestsQuery.isLoading && (requestsQuery.data ?? []).length === 0 && (
            <p className="pv-muted rounded-2xl border border-primary bg-panel p-4 text-sm sm:col-span-2">Nenhuma solicitação pendente para o grupo selecionado.</p>
          )}
          {requestsQuery.isError && (
            <p className="rounded-2xl border border-primary bg-panel p-4 text-sm text-primary sm:col-span-2">
              Você precisa ser admin do grupo para ver solicitações pendentes.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  )
}
