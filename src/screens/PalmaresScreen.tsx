import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PalmaresPanel } from '../components/admin/PalmaresPanel'

export function PalmaresScreen() {
  const navigate = useNavigate()
  const { isManager } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 pt-5 pb-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(isManager ? '/admin' : '/profile')}
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            ← Retour
          </button>
          <h1 className="text-lg font-black text-white">Palmarès</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <PalmaresPanel />
      </div>
    </div>
  )
}
