import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { PageShell } from '@/components/page-shell'

export function LandingPage() {
  return (
    <PageShell>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Pedidos de oração para sua comunidade paroquial</h1>
        <p className="mt-3 text-sm text-slate-700">Compartilhe pedidos, apoie outras pessoas e modere com segurança.</p>
        <div className="mt-5 flex gap-3">
          <Link to="/auth">
            <Button>Entrar</Button>
          </Link>
          <Link to="/feed">
            <Button variant="secondary">Abrir mural</Button>
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
