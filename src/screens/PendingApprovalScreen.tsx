import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export function PendingApprovalScreen() {
  const { signOut, player, session, loading, isManager, refreshPlayer } = useAuth()
  const [retrying, setRetrying] = useState(false)

  if (!loading && !session) return <Navigate to="/login" replace />

  // Player chargé tardivement (safety timer déclenché avant la fin du fetch)
  if (!loading && player?.status === 'approved') {
    return <Navigate to={isManager ? '/admin' : '/profile'} replace />
  }

  // Session valide mais player null = échec du fetch (Supabase endormi)
  if (!loading && session && !player) {
    async function retry() {
      setRetrying(true)
      await refreshPlayer()
      setRetrying(false)
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-6">
        <p className="text-7xl">⚠️</p>
        <div>
          <h1 className="text-2xl font-black text-white">Problème de connexion</h1>
          <p className="text-zinc-400 mt-3 max-w-sm leading-relaxed">
            Impossible de charger ton profil. Le serveur est peut-être en train de démarrer.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="md" fullWidth loading={retrying} onClick={retry}>
            Réessayer
          </Button>
          <Button variant="ghost" size="md" onClick={signOut}>
            Se déconnecter
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-6">
      <p className="text-7xl">⏳</p>
      <div>
        <h1 className="text-2xl font-black text-white">En attente de validation</h1>
        <p className="text-zinc-400 mt-3 max-w-sm leading-relaxed">
          Ton compte <span className="text-white font-semibold">@{player?.username}</span> a bien
          été créé. L'administrateur doit valider ton inscription avant que tu puisses accéder
          à ton profil.
        </p>
      </div>
      <Button variant="ghost" size="md" onClick={signOut}>
        Se déconnecter
      </Button>
    </div>
  )
}
