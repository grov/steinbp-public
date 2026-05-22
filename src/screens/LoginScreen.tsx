import { useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
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

export function LoginScreen() {
  const { session, isManager, player, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  if (authLoading) return <Spinner />
  if (session) {
    if (isManager) return <Navigate to="/admin" replace />
    if (!player || player.status !== 'approved') return <Navigate to="/pending" replace />
    return <Navigate to="/profile" replace />
  }

  async function handleLogin() {
    if (!email.trim()) { setError('Email requis.'); return }
    if (!password) { setError('Mot de passe requis.'); return }

    setLoading(true)
    setError(null)

    try {
      await pb.collection('users').authWithPassword(email.trim(), password)
      // L'AuthContext se met à jour via pb.authStore.onChange
    } catch {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Logo */}
        <div className="text-center">
          <img src="/logo-login.png" alt="SteinBP" className="w-64 h-auto mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-4xl font-black text-brand">SteinBP</h1>
          <p className="text-zinc-500 text-sm mt-2">Connexion</p>
        </div>

        {/* Formulaire */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && passwordRef.current?.focus()}
            placeholder="toi@example.com"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
          />

          <div className="relative">
            <Input
              ref={passwordRef}
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              error={error ?? undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 bottom-3 text-zinc-500 hover:text-zinc-300
                         transition-colors p-1 rounded-lg"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <Button size="lg" fullWidth loading={loading} onClick={handleLogin}>
            Se connecter
          </Button>
        </div>

        <p className="text-center text-zinc-500 text-sm">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-brand hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

function Eye() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29
           m7.532 7.532l3.29 3.29M3 3l3.59 3.59
           m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
           a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
