import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PlayersPanel } from '../components/admin/PlayersPanel'
import { TournamentsPanel } from '../components/admin/TournamentsPanel'
import { PalmaresPanel } from '../components/admin/PalmaresPanel'
import { CustomTab } from '../components/admin/CustomTab'

type Tab = 'joueurs' | 'tournois' | 'palmares' | 'custom'

const ALL_TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
  { id: 'joueurs',   label: 'Joueurs',   adminOnly: true  },
  { id: 'tournois',  label: 'Tournois'                    },
  { id: 'palmares',  label: 'Palmarès'                    },
  { id: 'custom',    label: 'Custom',    adminOnly: true  },
]

export function HomeScreen() {
  const { signOut, isAdmin, isOrganisateur } = useAuth()
  const tabs = ALL_TABS.filter(t => !t.adminOnly || isAdmin)
  const [tab, setTab] = useState<Tab>(isAdmin ? 'joueurs' : 'tournois')
  const [pendingCount, setPendingCount] = useState(0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 pt-5 pb-0 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-brand flex items-center gap-2">
                <img src="/logo-banner.png" alt="" className="w-16 h-16 object-contain" />
                SteinBP
              </h1>
              <p className="text-zinc-500 text-xs mt-0.5">
                {isAdmin ? 'Administration' : isOrganisateur ? 'Organisateur' : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Link
                to="/profile"
                className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
              >
                Mon profil
              </Link>
              <Link
                to="/challenges"
                className="text-xs text-brand/80 hover:text-brand transition-colors underline underline-offset-2"
              >
                ⚔️ Défis
              </Link>
              <button
                onClick={signOut}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  tab === t.id
                    ? 'text-white border-brand'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.label}
                  {t.id === 'joueurs' && pendingCount > 0 && (
                    <span className="bg-brand text-white text-xs font-black px-1.5 py-0.5 rounded-full leading-none">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {tab === 'joueurs'  && <PlayersPanel onPendingCount={setPendingCount} />}
        {tab === 'tournois' && <TournamentsPanel />}
        {tab === 'palmares' && <PalmaresPanel />}
        {tab === 'custom'   && <CustomTab />}
      </div>
    </div>
  )
}
