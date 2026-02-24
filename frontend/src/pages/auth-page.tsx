import { FormEvent, useState } from 'react'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { Button } from '@/components/button'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
  }

  return (
    <PageShell>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Entrar ou criar conta</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password" />
          <div className="flex gap-2">
            <Button type="submit">Continuar</Button>
            <Button type="button" variant="secondary">Enviar link mágico</Button>
          </div>
        </form>
      </section>
    </PageShell>
  )
}
