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
        <h1 className="text-xl font-semibold">Sign in or sign up</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <div className="flex gap-2">
            <Button type="submit">Continue</Button>
            <Button type="button" variant="secondary">Send magic link</Button>
          </div>
        </form>
      </section>
    </PageShell>
  )
}
