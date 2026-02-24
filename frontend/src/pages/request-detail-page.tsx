import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { TextArea } from '@/components/text-area'
import { api } from '@/lib/api'

type RequestDetail = {
  id: string
  authorId: string
  title: string
  body: string
  category: string
  visibility: 'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE'
  allowAnonymous: boolean
  prayedCount: number
  groupIds?: string[]
  prayerTypeCounts?: Record<string, number>
  myPrayerTypes?: string[]
}

type Profile = {
  id: string
}

const prayerActions = [
  { type: 'HAIL_MARY', label: 'Ave Maria' },
  { type: 'OUR_FATHER', label: 'Pai Nosso' },
  { type: 'GLORY_BE', label: 'Glória' },
  { type: 'ROSARY_DECADE', label: 'Terço' },
  { type: 'ROSARY_FULL', label: 'Rosário' }
]

export function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE'>('PUBLIC')
  const [groupIds, setGroupIDs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const requestQuery = useQuery({
    queryKey: ['request', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<RequestDetail>(`/requests/${id}`)
      return res.data
    }
  })

  const profileQuery = useQuery({
    queryKey: ['profile', 'minimal'],
    queryFn: async () => {
      const res = await api.get<Profile>('/profile')
      return res.data
    }
  })

  const groupsQuery = useQuery({
    queryKey: ['groups', 'mine', 'request-edit'],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; name: string }> }>('/groups')
      return res.data.items
    }
  })

  useEffect(() => {
    if (!requestQuery.data) {
      return
    }
    setTitle(requestQuery.data.title)
    setBody(requestQuery.data.body)
    setCategory(requestQuery.data.category)
    setVisibility(requestQuery.data.visibility)
    setGroupIDs(requestQuery.data.groupIds ?? [])
  }, [requestQuery.data])

  const canEdit = useMemo(() => {
    return !!requestQuery.data && !!profileQuery.data && requestQuery.data.authorId === profileQuery.data.id
  }, [requestQuery.data, profileQuery.data])

  const pray = useMutation({
    mutationFn: async (actionType: string) => {
      await api.post(`/requests/${id}/pray`, { actionType })
    },
    onSuccess: async () => {
      setError('')
      await requestQuery.refetch()
      await client.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || 'Não foi possível registrar oração.')
    }
  })

  const update = useMutation({
    mutationFn: async () => {
      await api.patch(`/requests/${id}`, {
        title,
        body,
        category,
        visibility,
        allowAnonymous: false,
        groupIds
      })
    },
    onSuccess: async () => {
      setError('')
      setStatus('Pedido atualizado com sucesso.')
      await requestQuery.refetch()
      await client.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (err: any) => {
      setStatus('')
      setError(err?.response?.data?.error?.message || 'Não foi possível atualizar pedido.')
    }
  })

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/requests/${id}`)
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['feed'] })
      navigate('/feed', { replace: true })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || 'Não foi possível excluir pedido.')
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    if (visibility === 'GROUP_ONLY' && groupIds.length === 0) {
      setError('Selecione ao menos um grupo para um pedido somente de grupo.')
      return
    }
    update.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Pedido de oração</p>
            <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Detalhe da intenção</h1>
          </div>
          <Link className="text-sm text-[#f2c5b6] hover:text-[#ffd8cc]" to="/feed">Voltar ao mural</Link>
        </div>

        {requestQuery.isLoading && <p className="pv-muted mt-6 text-sm">Carregando pedido...</p>}
        {requestQuery.isError && <p className="mt-6 rounded-xl border border-[#6b3f35] bg-[#261714] px-3 py-2 text-sm text-[#ffb7a3]">Não foi possível carregar o pedido.</p>}

        {requestQuery.data && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-5">
              <p className="text-lg font-semibold text-secondary">{requestQuery.data.title}</p>
              <p className="pv-muted mt-2 text-sm leading-relaxed">{requestQuery.data.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {prayerActions.map((action) => (
                  <button
                    key={action.type}
                    className={`pv-chip rounded-full px-3 py-1 text-xs ${requestQuery.data?.myPrayerTypes?.includes(action.type) ? 'pv-chip-active' : ''}`}
                    disabled={pray.isPending}
                    onClick={() => pray.mutate(action.type)}
                    type="button"
                  >
                    {action.label} ({requestQuery.data?.prayerTypeCounts?.[action.type] ?? 0})
                  </button>
                ))}
              </div>
              <p className="pv-muted mt-4 text-xs">Total de orações registradas: {requestQuery.data.prayedCount}</p>
            </article>

            {canEdit ? (
              <form className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-5" onSubmit={onSubmit}>
                <p className="text-sm font-semibold text-secondary">Editar pedido</p>
                <div className="mt-3 space-y-3">
                  <Input onChange={(e) => setTitle(e.target.value)} value={title} />
                  <TextArea className="min-h-[160px]" onChange={(e) => setBody(e.target.value)} value={body} />
                  <select className="h-11 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 text-sm text-secondary" onChange={(e) => setCategory(e.target.value)} value={category}>
                    <option value="HEALTH">Saúde</option>
                    <option value="FAMILY">Família</option>
                    <option value="WORK">Trabalho</option>
                    <option value="GRIEF">Luto</option>
                    <option value="THANKSGIVING">Ação de graças</option>
                    <option value="OTHER">Outro</option>
                  </select>
                  <select className="h-11 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 text-sm text-secondary" onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE')} value={visibility}>
                    <option value="PUBLIC">Público</option>
                    <option value="GROUP_ONLY">Somente grupo</option>
                    <option value="PRIVATE">Privado</option>
                  </select>
                  {visibility === 'GROUP_ONLY' && (
                    <div className="rounded-2xl border border-[#2d3a2f] bg-[#111714] p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9db19a]">Grupos vinculados</p>
                      <div className="space-y-2">
                        {(groupsQuery.data ?? []).map((group) => (
                          <label key={group.id} className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
                            <input
                              checked={groupIds.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGroupIDs((prev) => [...prev, group.id])
                                } else {
                                  setGroupIDs((prev) => prev.filter((v) => v !== group.id))
                                }
                              }}
                              type="checkbox"
                            />
                            <span>{group.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={update.isPending} type="submit">{update.isPending ? 'Salvando...' : 'Salvar alterações'}</Button>
                    <Button disabled={remove.isPending} onClick={() => remove.mutate()} type="button" variant="secondary">Excluir pedido</Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-5">
                <p className="pv-muted text-sm">Somente o autor pode editar ou excluir este pedido.</p>
              </div>
            )}
          </div>
        )}

        {status && <p className="mt-5 rounded-xl border border-[#365739] bg-[#17231a] px-3 py-2 text-sm text-[#b9dba8]">{status}</p>}
        {error && <p className="mt-5 rounded-xl border border-[#6b3f35] bg-[#261714] px-3 py-2 text-sm text-[#ffb7a3]">{error}</p>}
      </section>
    </PageShell>
  )
}
