// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getTokenPayload } from 'pocketbase'
import { pb, fileUrl } from '../lib/pocketbase'
import type { Player } from '../types/database'
import type { RecordModel } from 'pocketbase'

export interface AuthSession {
  userId: string
}

interface AuthContextValue {
  session: AuthSession | null
  player: Player | null
  isAdmin: boolean
  isOrganisateur: boolean
  isManager: boolean
  loading: boolean
  signOut: () => Promise<void>
  refreshPlayer: () => Promise<void>
}

function recordToPlayer(record: RecordModel): Player {
  return {
    id: record.id,
    username: record['username'] as string,
    display_name: record['display_name'] as string,
    avatar_url: fileUrl(record, record['avatar'] as string | null),
    status: record['status'] as Player['status'],
    role: record['role'] as Player['role'],
    created: record.created,
    updated: record.updated,
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = player?.role === 'admin'
  const isOrganisateur = player?.role === 'organisateur'
  const isManager = isAdmin || isOrganisateur

  async function refreshPlayer() {
    if (!pb.authStore.isValid) return
    try {
      await pb.collection('users').authRefresh()
      if (pb.authStore.model) {
        setPlayer(recordToPlayer(pb.authStore.model as RecordModel))
      }
    } catch {
      pb.authStore.clear()
      setSession(null)
      setPlayer(null)
    }
  }

  useEffect(() => {
    let active = true
    let expirationTimer: ReturnType<typeof setTimeout> | null = null

    function clearExpirationTimer() {
      if (expirationTimer) clearTimeout(expirationTimer)
      expirationTimer = null
    }

    function scheduleExpiration(token: string) {
      clearExpirationTimer()
      const expiresAt = Number(getTokenPayload(token).exp) * 1000

      if (!Number.isFinite(expiresAt)) return

      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        pb.authStore.clear()
        return
      }

      expirationTimer = setTimeout(() => {
        if (!pb.authStore.isValid) pb.authStore.clear()
        else scheduleExpiration(pb.authStore.token)
      }, remaining + 100)
    }

    // Le store local peut encore contenir le modèle d'un token déjà expiré.
    if (pb.authStore.token && !pb.authStore.isValid) {
      pb.authStore.clear()
    }

    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false)
    }, 15_000)

    // Déclenche immédiatement avec l'état courant (localStorage), puis à chaque changement.
    // Ne pilote PAS loading : c'est authRefresh (ou l'else) qui le fait pour éviter que
    // le formulaire de login s'affiche pendant que authRefresh est encore en vol.
    const unsubAuth = pb.authStore.onChange((token, model) => {
      if (!active) return

      if (model && token && pb.authStore.isValid) {
        setSession({ userId: model.id })
        setPlayer(recordToPlayer(model as RecordModel))
        scheduleExpiration(token)
      } else {
        clearExpirationTimer()
        setSession(null)
        setPlayer(null)
      }
    }, true)

    // Valide et rafraîchit le token au démarrage ; loading reste true jusqu'à la réponse.
    if (pb.authStore.isValid) {
      pb.collection('users').authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => { if (active) setLoading(false) })
    } else {
      setLoading(false)
    }

    return () => {
      active = false
      clearTimeout(safetyTimer)
      clearExpirationTimer()
      unsubAuth()
    }
  }, [])

  async function signOut() {
    pb.authStore.clear()
    window.location.replace(window.location.origin + '/#/login')
  }

  return (
    <AuthContext.Provider value={{ session, player, isAdmin, isOrganisateur, isManager, loading, signOut, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
