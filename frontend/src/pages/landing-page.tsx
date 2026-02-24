import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { PageShell } from '@/components/page-shell'

export function LandingPage() {
  return (
    <PageShell>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Prayer requests for your parish community</h1>
        <p className="mt-3 text-sm text-slate-700">Share requests, support others, and moderate safely.</p>
        <div className="mt-5 flex gap-3">
          <Link to="/auth">
            <Button>Sign in</Button>
          </Link>
          <Link to="/feed">
            <Button variant="secondary">Open feed</Button>
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
