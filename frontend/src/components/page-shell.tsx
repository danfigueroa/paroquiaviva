import { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-primary">
          Parish Viva
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link to="/feed">Feed</Link>
          <Link to="/requests/new">New Request</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
