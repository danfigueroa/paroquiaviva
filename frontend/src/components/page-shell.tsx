import { PropsWithChildren } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/state/session-store'
import { getSupabaseClient } from '@/lib/supabase'

export function PageShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const setAccessToken = useSessionStore((s) => s.setAccessToken)

  async function onLogout() {
    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setAccessToken(null)
    navigate('/auth', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 rounded-2xl border border-[#2d3a2f] bg-[#111714]/90 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-lg font-semibold text-secondary">
            Paróquia Viva
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/feed">Mural</Link>
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/friends">Amigos</Link>
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/requests/new">Novo Pedido</Link>
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/groups">Grupos</Link>
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/profile">Perfil</Link>
            <Link className="pv-chip rounded-full px-3 py-1.5" to="/moderation">Moderação</Link>
            <button className="pv-chip rounded-full px-3 py-1.5 text-[#f0c7b8]" onClick={onLogout} type="button">Sair</button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
