import { useParams } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'

export function GroupPage() {
  const { id } = useParams()
  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Group Feed</h1>
      <p className="mt-2 text-sm text-slate-600">Group id: {id}</p>
    </PageShell>
  )
}
