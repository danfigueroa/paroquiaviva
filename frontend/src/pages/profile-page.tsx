import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'
import { Input } from '@/components/input'
import { Button } from '@/components/button'

type Profile = {
  id: string
  username: string
  displayName: string
}

export function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<Profile>('/profile')
      return res.data
    }
  })

  useEffect(() => {
    if (!profile.data) {
      return
    }
    setDisplayName(profile.data.displayName || '')
    setUsername(profile.data.username || '')
  }, [profile.data])

  const saveProfile = useMutation({
    mutationFn: async () => {
      await api.patch('/profile', {
        displayName,
        username
      })
    },
    onSuccess: async () => {
      setError('')
      setStatus('Perfil atualizado com sucesso.')
      await profile.refetch()
    },
    onError: (err: any) => {
      setStatus('')
      if (err?.response?.status === 401) {
        setError('Sua sessão expirou. Entre novamente para salvar seu perfil.')
        return
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Não foi possível salvar o perfil.')
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    if (displayName.trim().length < 2) {
      setError('Informe um nome de exibição com pelo menos 2 caracteres.')
      return
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username.trim().replace('@', ''))) {
      setError('Use um @username de 3 a 30 caracteres, apenas letras minúsculas, números e _.')
      return
    }
    saveProfile.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Conta</p>
        <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Meu perfil</h1>
        <p className="pv-muted mt-2 text-sm">Defina seu nome público e o @username único usado para amizades no sistema.</p>

        <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#9db19a]">
              Nome de exibição
              <Input onChange={(e) => setDisplayName(e.target.value)} placeholder="Como seu nome aparece no app" value={displayName} />
              <span className="pv-muted mt-1 block text-[11px] normal-case tracking-normal">Nome mostrado nos pedidos, grupos e amizades.</span>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#9db19a]">
              @username
              <Input onChange={(e) => setUsername(e.target.value.replace(/@/g, '').toLowerCase())} placeholder="seu_username" value={username} />
              <span className="pv-muted mt-1 block text-[11px] normal-case tracking-normal">Identificador único para encontrar e adicionar você.</span>
            </label>
          </div>

          <div className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-4">
            <p className="text-sm text-secondary">Prévia do perfil</p>
            <p className="mt-3 text-lg font-semibold text-secondary">{displayName || 'Seu nome'}</p>
            <p className="pv-muted mt-1 text-sm">@{username || 'username'}</p>

            {status && <p className="mt-4 rounded-xl border border-[#365739] bg-[#17231a] px-3 py-2 text-sm text-[#b9dba8]">{status}</p>}
            {error && <p className="mt-4 rounded-xl border border-[#6b3f35] bg-[#261714] px-3 py-2 text-sm text-[#ffb7a3]">{error}</p>}

            <Button className="mt-5" disabled={saveProfile.isPending} type="submit">
              {saveProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </section>
    </PageShell>
  )
}
