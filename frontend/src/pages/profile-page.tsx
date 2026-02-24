import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'
import { Input } from '@/components/input'
import { Button } from '@/components/button'

type Profile = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

export function ProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarURL] = useState('')

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
    setAvatarURL(profile.data.avatarUrl || '')
  }, [profile.data])

  const saveProfile = useMutation({
    mutationFn: async () => {
      await api.patch('/profile', {
        displayName,
        avatarUrl: avatarUrl || null
      })
    },
    onSuccess: async () => {
      await profile.refetch()
    }
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    saveProfile.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ab90]">Conta</p>
        <h1 className="pv-title mt-2 text-3xl font-bold text-secondary">Meu perfil</h1>
        <p className="pv-muted mt-2 text-sm">Atualize seus dados visíveis para a comunidade.</p>

        <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-3">
            <Input disabled value={profile.data?.email ?? ''} />
            <Input onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome de exibição" value={displayName} />
            <Input onChange={(e) => setAvatarURL(e.target.value)} placeholder="URL do avatar" value={avatarUrl} />
          </div>

          <div className="rounded-2xl border border-[#2d3a2f] bg-[#121715] p-4">
            <p className="text-sm text-secondary">Prévia do perfil</p>
            <p className="mt-3 text-lg font-semibold text-secondary">{displayName || 'Seu nome'}</p>
            <p className="pv-muted mt-1 text-sm">{profile.data?.email}</p>
            <Button className="mt-5" disabled={saveProfile.isPending} type="submit">
              {saveProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </section>
    </PageShell>
  )
}
