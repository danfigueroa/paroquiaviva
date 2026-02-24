import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@/components/input'
import { Button } from '@/components/button'
import { getSupabaseClient } from '@/lib/supabase'
import { useSessionStore } from '@/state/session-store'

type AuthMode = 'signin' | 'signup'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAccessToken = useSessionStore((s) => s.setAccessToken)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('signin')
  const [isLoading, setIsLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const supabase = getSupabaseClient()

  const nextPath = searchParams.get('next') || '/feed'

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      if (!supabase) {
        return
      }
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token ?? null
      if (token && isMounted) {
        setAccessToken(token)
        navigate(nextPath, { replace: true })
      }
    }

    bootstrapSession()
    return () => {
      isMounted = false
    }
  }, [navigate, nextPath, setAccessToken, supabase])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    try {
      if (!supabase) {
        setError('Configuração do Supabase ausente no frontend.')
        return
      }
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })
        if (signUpError) {
          setError(signUpError.message)
          return
        }
        setInfo('Conta criada. Verifique seu e-mail para confirmar o cadastro.')
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) {
        setError(signInError.message)
        return
      }

      const token = data.session?.access_token
      if (!token) {
        setError('Não foi possível iniciar sessão.')
        return
      }

      setAccessToken(token)
      navigate(nextPath, { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  async function onPasswordlessEmail() {
    setError('')
    setInfo('')
    if (!email) {
      setError('Informe seu e-mail para receber o link de acesso.')
      return
    }
    if (!supabase) {
      setError('Configuração do Supabase ausente no frontend.')
      return
    }

    setIsLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      })
      if (otpError) {
        setError(otpError.message)
        return
      }
      setInfo('Enviamos um e-mail com link de acesso único.')
    } finally {
      setIsLoading(false)
    }
  }

  async function onResetPassword() {
    setError('')
    setInfo('')
    if (!email) {
      setError('Informe seu e-mail para redefinir a senha.')
      return
    }
    if (!supabase) {
      setError('Configuração do Supabase ausente no frontend.')
      return
    }

    setIsLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setInfo('E-mail de redefinição enviado com sucesso.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-stretch">
      <section className="pv-panel flex h-full flex-col justify-between rounded-3xl p-8 sm:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a9b99f]">Paróquia Viva</p>
          <h1 className="pv-title mt-5 text-3xl font-bold leading-[1.08] text-secondary sm:text-4xl lg:text-[46px]">Conecte sua comunidade em uma rede de oração viva.</h1>
          <p className="pv-muted mt-5 max-w-md text-base leading-relaxed">Compartilhe intenções, acompanhe pedidos de amigos e grupos, e fortaleça os laços da sua paróquia em um ambiente acolhedor.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#2b3f2a] bg-[#162316] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#97ad8d]">Fluxo</p>
            <p className="mt-2 text-sm font-semibold text-secondary">Rápido</p>
          </div>
          <div className="rounded-2xl border border-[#5b4a3b] bg-[#2a1e1a] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d9b7aa]">Acesso</p>
            <p className="mt-2 text-sm font-semibold text-[#f3d4c8]">Seguro</p>
          </div>
          <div className="rounded-2xl border border-[#314033] bg-[#1a201c] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9eb09a]">Leitura</p>
            <p className="mt-2 text-sm font-semibold text-secondary">Confortável</p>
          </div>
        </div>
      </section>

      <section className="pv-panel flex h-full flex-col rounded-3xl p-8 sm:p-10">
        <div className="inline-flex w-fit rounded-full border border-[#334436] bg-[#121915] p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'signin' ? 'bg-secondary text-[#20241f]' : 'text-[#d4c8b7]'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'signup' ? 'bg-secondary text-[#20241f]' : 'text-[#d4c8b7]'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <h2 className="pv-title mt-6 text-2xl font-semibold text-secondary sm:text-3xl">{mode === 'signin' ? 'Acessar conta' : 'Criar conta'}</h2>
        <p className="pv-muted mt-2 text-sm">Entre com e-mail e senha ou use acesso sem senha por e-mail.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" type="password" />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" disabled={isLoading} type="submit">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</Button>
            <Button className="w-full sm:w-auto" disabled={isLoading} onClick={onPasswordlessEmail} type="button" variant="secondary">Acesso sem senha</Button>
          </div>
        </form>

        {error && <p className="mt-4 rounded-xl border border-[#6b3f35] bg-[#261714] px-3 py-2 text-sm text-[#ffb7a3]">{error}</p>}
        {info && <p className="mt-4 rounded-xl border border-[#365739] bg-[#17231a] px-3 py-2 text-sm text-[#b9dba8]">{info}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8 text-sm">
          <button className="pv-muted hover:text-secondary" onClick={onResetPassword} type="button">Redefinir senha</button>
          <span className="pv-muted hidden sm:inline">Após autenticar, você entra no feed principal</span>
        </div>
      </section>
    </div>
  )
}
