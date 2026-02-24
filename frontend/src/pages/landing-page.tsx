import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { PageShell } from '@/components/page-shell'

export function LandingPage() {
  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Espaço comunitário</p>
        <h1 className="pv-title mt-3 text-3xl font-bold leading-tight text-secondary sm:text-4xl">Rede social de oração para fortalecer laços e fé.</h1>
        <p className="pv-muted mt-4 max-w-2xl text-sm">Crie pedidos, acompanhe grupos, conecte amigos e viva a espiritualidade em comunidade com uma experiência moderna e acolhedora.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/auth">
            <Button className="w-full sm:w-auto">Entrar</Button>
          </Link>
          <Link to="/feed">
            <Button className="w-full sm:w-auto" variant="secondary">Abrir feed</Button>
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
