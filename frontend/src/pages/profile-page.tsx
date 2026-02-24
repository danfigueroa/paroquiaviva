import { useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/page-shell'
import { api } from '@/lib/api'

type Profile = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

export function ProfilePage() {
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<Profile>('/profile')
      return res.data
    }
  })

  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Perfil</h1>
      <pre className="mt-4 rounded-md bg-slate-900 p-4 text-xs text-white">{JSON.stringify(profile.data, null, 2)}</pre>
    </PageShell>
  )
}
