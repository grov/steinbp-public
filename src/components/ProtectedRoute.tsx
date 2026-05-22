import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Spinner() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      {slow && (
        <div className="text-center">
          <p className="text-zinc-500 text-sm">Connexion lente…</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-brand underline underline-offset-2"
          >
            Recharger
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Redirige vers la bonne page selon le rôle de l'utilisateur connecté.
 * Placé sur la route "/" — jamais sur "/login" pour éviter les boucles.
 */
export function RoleRedirect() {
  const { session, isManager, player, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (isManager) return <Navigate to="/admin" replace />

  if (!player || player.status !== 'approved') return <Navigate to="/pending" replace />

  return <Navigate to="/profile" replace />
}

/** Pages réservées strictement à l'admin. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/admin" replace />

  return <>{children}</>
}

/** Pages accessibles à l'admin ET à l'organisateur. */
export function ManagerRoute({ children }: { children: ReactNode }) {
  const { session, isManager, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!isManager) return <Navigate to="/profile" replace />

  return <>{children}</>
}

/** Pages pour joueurs connectés et approuvés. */
export function PlayerRoute({ children }: { children: ReactNode }) {
  const { session, isManager, player, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (isManager) return <Navigate to="/admin" replace />
  if (!player || player.status !== 'approved') return <Navigate to="/pending" replace />

  return <>{children}</>
}

/** Profil accessible à tous les rôles (admin, organisateur, joueur approuvé). */
export function ProfileRoute({ children }: { children: ReactNode }) {
  const { session, isManager, player, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!player) return <Navigate to="/pending" replace />
  if (!isManager && player.status !== 'approved') return <Navigate to="/pending" replace />

  return <>{children}</>
}
