import { useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router'
import { CategoryNav } from '@/components/catalogue/CategoryNav'
import { SearchBar } from '@/components/catalogue/SearchBar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { config } from '@/lib/config'

const year = new Date().getFullYear()

export function AppLayout() {
  const [params] = useSearchParams()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="text-lg font-bold tracking-tight">
              {config.siteName}
            </Link>
            {/* Re-mount on navigation so the box always shows the current search. */}
            <SearchBar key={params.get('q') ?? ''} />
          </div>
          <CategoryNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="text-muted-foreground border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-sm">
          <span>
            © {year} {config.siteName}
          </span>
          <AdminLinks />
        </div>
      </footer>
    </div>
  )
}

function AdminLinks() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  function onLogout() {
    setLoggingOut(true)
    logout().finally(() => setLoggingOut(false))
  }

  if (!user) {
    return (
      <Link to="/login" className="hover:text-foreground">
        Admin
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link to="/admin/featured" className="hover:text-foreground">
        Manage featured
      </Link>
      <Button variant="ghost" size="sm" onClick={onLogout} disabled={loggingOut}>
        Log out
      </Button>
    </div>
  )
}
