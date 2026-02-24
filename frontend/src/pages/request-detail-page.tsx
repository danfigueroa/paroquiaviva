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
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Detalhe</p>
        <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Pedido de oração</h1>
        <p className="pv-muted mt-2 text-sm">ID do pedido: {id}</p>

        <div className="mt-5 rounded-2xl border border-[#2d3a2f] bg-[#121715] p-5">
          <p className="pv-muted text-sm">Interação comunitária</p>
          <p className="mt-2 text-base text-secondary">Registre que você orou por esta intenção.</p>
          <Button className="mt-4" disabled={pray.isPending} onClick={() => pray.mutate()}>
            {pray.isPending ? 'Registrando...' : 'Eu orei'}
          </Button>
        </div>
      </section>
    </PageShell>
  )
}
