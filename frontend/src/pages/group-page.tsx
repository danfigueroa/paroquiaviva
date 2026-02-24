import { useParams } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/button'

type JoinRequest = {
  id: string
  userId: string
  requestedAt: string
}

export function GroupPage() {
  const { id } = useParams()

  const requests = useQuery({
    queryKey: ['group', id, 'join-requests'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ items: JoinRequest[] }>(`/groups/${id}/join-requests`)
      return res.data.items
    }
  })

  const approve = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(`/groups/${id}/join-requests/${requestId}/approve`)
    },
    onSuccess: async () => {
      await requests.refetch()
    }
  })

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Administração</p>
        <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Gestão de membros do grupo</h1>
        <p className="pv-muted mt-2 text-sm">Grupo selecionado: {id}</p>
      </section>

      <section className="pv-panel mt-5 rounded-3xl p-6">
        <h2 className="pv-title text-xl font-semibold text-secondary">Solicitações pendentes</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(requests.data ?? []).map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-4">
              <p className="text-sm text-secondary">Usuário: {item.userId}</p>
              <p className="pv-muted mt-1 text-xs">{new Date(item.requestedAt).toLocaleString('pt-BR')}</p>
              <Button className="mt-3 w-full sm:w-auto" disabled={approve.isPending} onClick={() => approve.mutate(item.id)}>
                Aprovar membro
              </Button>
            </article>
          ))}
          {!requests.isLoading && (requests.data ?? []).length === 0 && (
            <p className="pv-muted rounded-2xl border border-[#2d3a2f] bg-[#121715] p-4 text-sm sm:col-span-2">Não há solicitações pendentes.</p>
          )}
        </div>
      </section>
    </PageShell>
  )
}
