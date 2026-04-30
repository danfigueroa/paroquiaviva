import { Link } from 'react-router-dom'
import { Button } from '@/components/button'

const features = [
  {
    title: 'Pedidos de oração',
    body: 'Compartilhe intenções com sua comunidade e acompanhe quem está orando por elas em tempo real.'
  },
  {
    title: 'Grupos comunitários',
    body: 'Organize pastorais, células e movimentos com regras de entrada flexíveis e moderação simples.'
  },
  {
    title: 'Rede de amigos',
    body: 'Encontre pessoas pelo @username e mantenha-se perto de quem caminha com você na fé.'
  },
  {
    title: 'Ambiente acolhedor',
    body: 'Moderação ativa, traduções e tom respeitoso para católicos e evangélicos conviverem em paz.'
  }
]

const steps = [
  {
    title: 'Crie sua conta',
    body: 'Cadastro rápido com e-mail e senha — ou link de acesso sem senha. Escolha sua tradição.'
  },
  {
    title: 'Encontre sua comunidade',
    body: 'Conecte-se com amigos e entre em grupos abertos, sob solicitação ou apenas por convite.'
  },
  {
    title: 'Ore em comunidade',
    body: 'Publique pedidos, marque "estou orando" e acompanhe as intenções da sua rede no mural.'
  }
]

export function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between rounded-2xl border border-primary bg-panel/90 p-4 backdrop-blur">
        <Link to="/" className="flex items-center gap-3" aria-label="Creo — ir para o início">
          <img src="/creo-icon.png" alt="" className="h-14 w-14 rounded-xl shadow-sm" />
          <span className="text-3xl font-bold tracking-tight text-secondary">Creo</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="secondary">Entrar</Button>
          </Link>
          <Link to="/auth" className="hidden sm:inline-flex">
            <Button>Criar conta</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-12 sm:space-y-16">
        <section className="pv-panel rounded-3xl p-6 sm:p-10 lg:p-14">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <img src="/creo-logo.png" alt="Creo" className="h-28 w-auto sm:h-36 lg:h-44" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary sm:text-sm">
              Eu acredito. Nós conectamos. Nós crescemos.
            </p>
            <h1 className="pv-title mt-6 text-3xl font-bold leading-[1.1] text-secondary sm:text-5xl lg:text-6xl">
              A rede social que aproxima sua comunidade da fé.
            </h1>
            <p className="pv-muted mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
              Compartilhe pedidos de oração, organize grupos, conecte-se com amigos e viva a espiritualidade em
              comunidade — católica ou evangélica — em um ambiente moderno e acolhedor.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              <Link to="/auth">
                <Button className="w-full sm:w-auto">Criar conta gratuita</Button>
              </Link>
              <Link to="/auth">
                <Button className="w-full sm:w-auto" variant="secondary">Já tenho conta</Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary bg-panel px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Tradições</p>
              <p className="mt-2 text-sm font-semibold text-secondary">Católica e evangélica</p>
            </div>
            <div className="rounded-2xl border border-primary bg-panel px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Privacidade</p>
              <p className="mt-2 text-sm font-semibold text-secondary">Pedidos só para sua rede</p>
            </div>
            <div className="rounded-2xl border border-primary bg-panel px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Acesso</p>
              <p className="mt-2 text-sm font-semibold text-secondary">Web, gratuito e seguro</p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Recursos</p>
          <h2 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">
            Tudo que sua comunidade precisa em um só lugar
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={feature.title} className="pv-panel rounded-2xl p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="pv-title mt-4 text-base font-semibold text-secondary">{feature.title}</h3>
                <p className="pv-muted mt-2 text-sm leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pv-panel rounded-3xl p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Como funciona</p>
          <h2 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Comece em três passos</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-primary bg-panel p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Passo {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="pv-title mt-2 text-lg font-semibold text-secondary">{step.title}</h3>
                <p className="pv-muted mt-2 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/auth">
              <Button>Quero começar</Button>
            </Link>
          </div>
        </section>

        <section className="pv-panel rounded-3xl p-6 text-center sm:p-10">
          <p className="pv-title text-xl font-semibold leading-relaxed text-secondary sm:text-2xl">
            “Onde dois ou três estiverem reunidos em meu nome, ali estarei eu, no meio deles.”
          </p>
          <p className="pv-muted mt-3 text-sm">Mateus 18,20</p>
        </section>
      </main>

      <footer className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-primary/40 pt-6 text-xs text-primary sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} Creo — feito com fé para a comunidade.</p>
        <div className="flex gap-4">
          <Link to="/auth" className="hover:text-secondary">Entrar</Link>
          <Link to="/auth" className="hover:text-secondary">Criar conta</Link>
        </div>
      </footer>
    </div>
  )
}
