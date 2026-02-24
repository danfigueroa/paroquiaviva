import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { TextArea } from '@/components/text-area'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

export function NewRequestPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [visibility, setVisibility] = useState('GROUP_ONLY')

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/requests', {
        title,
        body,
        category,
        visibility,
        allowAnonymous: false,
        groupIds: []
      })
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
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
          </div>

          <div className="space-y-4 lg:col-span-1">
            <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Compartilhe seu pedido de oração" className="min-h-[190px]" />
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Publicar pedido'}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </PageShell>
  )
}
