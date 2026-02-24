import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

export function RequestDetailPage() {
  const { id } = useParams()
  const pray = useMutation({
    mutationFn: async () => {
      await api.post(`/requests/${id}/pray`)
    }
  })

  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Prayer Request</h1>
      <p className="mt-2 text-sm text-slate-700">Request id: {id}</p>
      <Button className="mt-4" onClick={() => pray.mutate()} disabled={pray.isPending}>
        {pray.isPending ? 'Sending...' : 'I prayed'}
      </Button>
    </PageShell>
  )
}
