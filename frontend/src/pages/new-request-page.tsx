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
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">New Prayer Request</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your prayer request" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
            <option value="HEALTH">HEALTH</option>
            <option value="FAMILY">FAMILY</option>
            <option value="WORK">WORK</option>
            <option value="GRIEF">GRIEF</option>
            <option value="THANKSGIVING">THANKSGIVING</option>
            <option value="OTHER">OTHER</option>
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
            <option value="GROUP_ONLY">GROUP_ONLY</option>
            <option value="PRIVATE">PRIVATE</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
          <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create request'}</Button>
        </form>
      </section>
    </PageShell>
  )
}
