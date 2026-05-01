import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/input'
import { Button } from '@/components/button'
import { getSupabaseClient } from '@/lib/supabase'
import { useSessionStore } from '@/state/session-store'

type Status = 'checking' | 'ready' | 'no-session' | 'saving' | 'done'

export function AuthResetPage() {
  const navigate = useNavigate()
  const setAccessToken = useSessionStore((s) => s.setAccessToken)
  const supabase = getSupabaseClient()

  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setStatus('no-session')
      return
    }
    let active = true

    const evaluate = (token: string | null | undefined) => {
      if (!active) return
      if (token) {
        setAccessToken(token)
        setStatus('ready')
      } else {
        setStatus((prev) => (prev === 'checking' ? 'no-session' : prev))
      }
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session?.access_token))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session?.access_token)
    })

    const fallback = window.setTimeout(() => {
      if (!active) return
      setStatus((prev) => (prev === 'checking' ? 'no-session' : prev))
    }, 4000)

    return () => {
      active = false
      sub.subscription.unsubscribe()
      window.clearTimeout(fallback)
    }
  }, [setAccessToken, supabase])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Configuração do Supabase ausente.')
      return
    }
    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setStatus('saving')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setStatus('ready')
      const msg = (updateError.message || '').toLowerCase()
      if (msg.includes('password should be at least')) {
        setError('A senha precisa ter ao menos 6 caracteres.')
      } else if (msg.includes('same as the old')) {
        setError('Use uma senha diferente da anterior.')
      } else {
        setError(updateError.message || 'Não foi possível atualizar sua senha.')
      }
      return
    }
    setStatus('done')
    setTimeout(() => navigate('/feed', { replace: true }), 600)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <section className="pv-panel rounded-3xl p-7 sm:p-9">
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Creo — ir para o início">
          <img src="/creo-icon.png" alt="" className="h-10 w-10 rounded-xl shadow-sm" />
          <span className="text-xl font-bold tracking-tight text-secondary">Creo</span>
        </Link>

        <h1 className="pv-title mt-6 text-2xl font-semibold text-secondary sm:text-3xl">
          Definir nova senha
        </h1>
        <p className="pv-muted mt-2 text-sm">
          Escolha uma senha que você consiga lembrar com tranquilidade — pelo menos 6 caracteres.
        </p>

        {status === 'checking' && (
          <p role="status" className="mt-6 rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">
            Verificando seu link…
          </p>
        )}

        {status === 'no-session' && (
          <div className="mt-6 space-y-3">
            <p role="alert" className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">
              Este link não é mais válido — pode ter expirado ou já ter sido usado.
            </p>
            <Link
              to="/auth"
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-panel px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Pedir novo link de redefinição
            </Link>
          </div>
        )}

        {(status === 'ready' || status === 'saving' || status === 'done') && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Nova senha</span>
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={status !== 'ready'}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Confirmar senha</span>
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                disabled={status !== 'ready'}
              />
            </label>

            <Button className="w-full" type="submit" disabled={status !== 'ready'}>
              {status === 'saving' ? 'Salvando…' : status === 'done' ? 'Pronto!' : 'Salvar nova senha'}
            </Button>

            {error && (
              <p role="alert" className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">
                {error}
              </p>
            )}
            {status === 'done' && (
              <p role="status" className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">
                Senha atualizada. Levando você para o feed…
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  )
}
