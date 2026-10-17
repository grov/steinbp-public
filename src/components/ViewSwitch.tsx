import { useNavigate } from 'react-router-dom'

export type AppView = 'gestion' | 'joueur'

const STORAGE_KEY = 'manager_view'
const VIEW_HOME: Record<AppView, string> = { gestion: '/admin', joueur: '/profile' }

/** Dernière vue choisie par un admin/organisateur (gestion par défaut). */
export function preferredViewHome(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'joueur' ? VIEW_HOME.joueur : VIEW_HOME.gestion
  } catch {
    return VIEW_HOME.gestion
  }
}

/**
 * Bascule Gestion / Joueur pour les admins et organisateurs. La vue choisie
 * est retenue : c'est elle qui s'ouvre au prochain lancement.
 */
export function ViewSwitch({ current }: { current: AppView }) {
  const navigate = useNavigate()

  function select(view: AppView) {
    try {
      localStorage.setItem(STORAGE_KEY, view)
    } catch {
      // Stockage indisponible (navigation privée) : la bascule marche quand même.
    }
    if (view !== current) navigate(VIEW_HOME[view])
  }

  return (
    <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 p-0.5 text-xs font-semibold" role="group" aria-label="Changer de vue">
      {(['gestion', 'joueur'] as const).map((view) => (
        <button
          key={view}
          onClick={() => select(view)}
          aria-pressed={view === current}
          className={`px-3 py-1 rounded-full transition-colors ${
            view === current ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {view === 'gestion' ? '🛠 Gestion' : '👤 Joueur'}
        </button>
      ))}
    </div>
  )
}
