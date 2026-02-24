import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { TextArea } from '@/components/text-area'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

export function NewRequestPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [visibility, setVisibility] = useState('GROUP_ONLY')
  const [groupIds, setGroupIDs] = useState<string[]>([])
  const [error, setError] = useState('')

  const groups = useQuery({
    queryKey: ['groups', 'mine', 'for-request'],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; name: string }> }>('/groups')
      return res.data.items
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/requests', {
        title,
        body,
        category,
        visibility,
        allowAnonymous: false,
        groupIds: visibility === 'GROUP_ONLY' ? groupIds : []
      })
    },
    onSuccess: () => {
      setError('')
      navigate(visibility === 'PUBLIC' ? '/feed?scope=public' : '/feed')
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        setError('Sua sessão expirou. Entre novamente para publicar o pedido.')
        return
      }
      if (!err?.response) {
        setError('Backend indisponível. Verifique se a API está rodando em http://localhost:8080.')
        return
      }
      setError(err?.response?.data?.error?.message || 'Não foi possível criar o pedido.')
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (visibility === 'GROUP_ONLY' && groupIds.length === 0) {
      setError('Selecione ao menos um grupo para publicar como Somente grupo.')
      return
    }
    createMutation.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Novo conteúdo</p>
        <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Criar pedido de oração</h1>
        <p className="pv-muted mt-2 text-sm">Escreva com carinho e clareza para que sua comunidade possa orar junto com você.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 lg:col-span-1">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do pedido" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 text-sm text-secondary">
              <option value="HEALTH">Saúde</option>
              <option value="FAMILY">Família</option>
              <option value="WORK">Trabalho</option>
              <option value="GRIEF">Luto</option>
              <option value="THANKSGIVING">Ação de graças</option>
              <option value="OTHER">Outro</option>
            </select>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="h-11 w-full rounded-xl border border-[#344434] bg-[#101612] px-3 text-sm text-secondary">
              <option value="GROUP_ONLY">Somente grupo</option>
              <option value="PRIVATE">Privado</option>
              <option value="PUBLIC">Público</option>
            </select>
            {visibility === 'GROUP_ONLY' && (
              <div className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#98ab90]">Grupos</p>
                <div className="space-y-2">
                  {groups.isLoading && <p className="pv-muted text-xs">Carregando seus grupos...</p>}
                  {(groups.data ?? []).map((group) => (
                    <label key={group.id} className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
                      <input
                        checked={groupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupIDs((prev) => [...prev, group.id])
                          } else {
                            setGroupIDs((prev) => prev.filter((id) => id !== group.id))
                          }
                        }}
                        type="checkbox"
                      />
                      <span>{group.name}</span>
                    </label>
                  ))}
                  {!groups.isLoading && (groups.data ?? []).length === 0 && (
                    <p className="pv-muted text-xs">Você ainda não participa de grupos. Crie ou entre em um grupo antes de publicar como GROUP_ONLY.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-1">
            <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Compartilhe seu pedido de oração" className="min-h-[190px]" />
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Publicar pedido'}
              </Button>
            </div>
            {error && <p className="rounded-xl border border-[#6b3f35] bg-[#261714] px-3 py-2 text-sm text-[#ffb7a3]">{error}</p>}
            {!error && visibility === 'PUBLIC' && <p className="pv-muted text-xs">Pedidos públicos entram em moderação antes de aparecer no feed público.</p>}
          </div>
        </form>
      </section>
    </PageShell>
  )
}
