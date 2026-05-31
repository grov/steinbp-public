// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false)
    }, 15_000)

    // Déclenche immédiatement avec l'état courant (localStorage), puis à chaque changement
    const unsubAuth = pb.authStore.onChange((token, model) => {
      if (!active) return

      if (model && token) {
        setSession({ userId: model.id })
        setPlayer(recordToPlayer(model as RecordModel))
      } else {
        setSession(null)
        setPlayer(null)
      }
      setLoading(false)
    }, true)

    // Valide et rafraîchit le token au démarrage
    if (pb.authStore.isValid) {
      pb.collection('users').authRefresh().catch(() => pb.authStore.clear())
    } else {
      setLoading(false)
    }

    return () => {
      active = false
      clearTimeout(safetyTimer)
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
