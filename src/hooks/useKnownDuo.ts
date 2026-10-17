import { useEffect, useState } from 'react'
import { findDuo } from '../lib/duos'
import type { Duo } from '../types/database'

/** Duo déjà connu pour ces deux joueurs (null si nouvelle paire ou invité). */
export function useKnownDuo(player1Id: string | null, player2Id: string | null): Duo | null {
  const [duo, setDuo] = useState<Duo | null>(null)

  useEffect(() => {
    setDuo(null)
    if (!player1Id || !player2Id) return
    let cancelled = false
    findDuo(player1Id, player2Id).then((found) => { if (!cancelled) setDuo(found) })
    return () => { cancelled = true }
  }, [player1Id, player2Id])

  return duo
}
