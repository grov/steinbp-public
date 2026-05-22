import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { registerPlayer } from '../lib/playerActions'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

function Spinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function PlayerRegistrationScreen() {
  const { session, isManager, player, loading: authLoading, refreshPlayer } = useAuth()

  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (authLoading) return <Spinner />

  // Redirect already-logged-in users only when not currently registering or showing success
  if (!loading && !done && session) {
    if (isManager) return <Navigate to="/admin" replace />
    if (player?.status === 'approved') return <Navigate to="/profile" replace />
    return <Navigate to="/pending" replace />
  }

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setError(null)
  }

  function validate() {
    if (!form.username.trim()) return 'Pseudo requis.'
    if (form.username.trim().length < 2) return 'Pseudo trop court (2 caractères min).'
    if (!/^[a-zA-Z0-9_-]+$/.test(form.username.trim())) return 'Pseudo : lettres, chiffres, _ et - uniquement.'
    if (!form.displayName.trim()) return 'Nom affiché requis.'
    if (!form.email.trim()) return 'Email requis.'
    if (!form.password) return 'Mot de passe requis.'
    if (form.password.length < 8) return 'Mot de passe : 8 caractères minimum.'
    if (form.password !== form.confirm) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  async function handleRegister() {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      await registerPlayer(form.email.trim(), form.password, form.username.trim(), form.displayName.trim())
      await refreshPlayer()
      setDone(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue.'
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Cet email est déjà utilisé.')
      } else if (msg.includes('username')) {
        setError('Ce pseudo est déjà pris.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-6">
        <p className="text-6xl">⏳</p>
        <div>
          <h1 className="text-2xl font-black text-white">Inscription envoyée !</h1>
          <p className="text-zinc-400 mt-2 max-w-sm">
            Ton compte est en attente de validation par l'administrateur.
            Tu seras notifié dès que ton profil sera activé.
          </p>
        </div>
        <Link to="/login" className="text-brand text-sm underline underline-offset-2">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <p className="text-5xl mb-2">🏓</p>
          <h1 className="text-3xl font-black text-brand">SteinBP</h1>
          <p className="text-zinc-400 text-sm mt-1">Créer un compte joueur</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <Input
            label="Pseudo (unique)"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="sniperdu62"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Input
            label="Nom affiché"
            value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            placeholder="Jean-Michel"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="toi@example.com"
            autoCapitalize="none"
          />
          <Input
            label="Mot de passe"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button size="lg" fullWidth loading={loading} onClick={handleRegister}>
            S'inscrire
          </Button>
        </div>

        <p className="text-center text-zinc-500 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
