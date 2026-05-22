import { useEffect, useRef, useState } from 'react'
import { pb } from '../lib/pocketbase'
import {
  fetchGroupsWithStandings,
  fetchMatchesWithRelations,
  recordToTournament,
  recordToTeam,
  recordToGameTable,
} from '../lib/tournamentActions'
import type {
  GameTable,
  GroupWithStandings,
  MatchWithRelations,
  Team,
  Tournament,
} from '../types/database'

interface TournamentState {
  tournament: Tournament | null
  teams: Team[]
  tables: GameTable[]
  matches: MatchWithRelations[]
  groups: GroupWithStandings[]
  loading: boolean
  error: string | null
}

export function useTournament(tournamentId: string | undefined) {
  const [state, setState] = useState<TournamentState>({
    tournament: null,
    teams: [],
    tables: [],
    matches: [],
    groups: [],
    loading: true,
    error: null,
  })

  const tournamentIdRef = useRef(tournamentId)
  tournamentIdRef.current = tournamentId

  async function load(id: string, silent = false) {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [tournamentRec, teamRecs, tableRecs, matches, groups] = await Promise.all([
        pb.collection('tournaments').getOne(id, { requestKey: null }),
        pb.collection('teams').getFullList({
          filter: `tournament_id = "${id}"`,
          sort: '+id',
          requestKey: null,
        }),
        pb.collection('game_tables').getFullList({
          filter: `tournament_id = "${id}"`,
          sort: '+name',
          requestKey: null,
        }),
        fetchMatchesWithRelations(id),
        fetchGroupsWithStandings(id),
      ])

      setState({
        tournament: recordToTournament(tournamentRec),
        teams: teamRecs.map(recordToTeam),
        tables: tableRecs.map(recordToGameTable),
        matches,
        groups,
        loading: false,
        error: null,
      })
    } catch (err: unknown) {
      if ((err as { isAbort?: boolean })?.isAbort) return
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      }))
    }
  }

  useEffect(() => {
    if (!tournamentId) return

    let active = true
    load(tournamentId)

    // ── Abonnements Realtime ──────────────────────────────────

    pb.collection('matches').subscribe('*', (event) => {
      if (!active) return
      if (event.record['tournament_id'] !== tournamentId) return
      fetchMatchesWithRelations(tournamentId).then((matches) =>
        setState((s) => ({ ...s, matches })),
      )
    })

    pb.collection('game_tables').subscribe('*', (event) => {
      if (!active) return
      if (event.record['tournament_id'] !== tournamentId) return
      pb.collection('game_tables')
        .getFullList({ filter: `tournament_id = "${tournamentId}"`, sort: '+name' })
        .then((recs) => setState((s) => ({ ...s, tables: recs.map(recordToGameTable) })))
    })

    pb.collection('tournaments').subscribe('*', (event) => {
      if (!active) return
      if (event.record.id !== tournamentId) return
      setState((s) => ({ ...s, tournament: recordToTournament(event.record) }))
    })

    pb.collection('group_standings').subscribe('*', (event) => {
      if (!active) return
      if (event.record['tournament_id'] !== tournamentId) return
      fetchGroupsWithStandings(tournamentId).then((groups) =>
        setState((s) => ({ ...s, groups })),
      )
    })

    pb.collection('teams').subscribe('*', (event) => {
      if (!active) return
      if (event.record['tournament_id'] !== tournamentId) return
      pb.collection('teams')
        .getFullList({ filter: `tournament_id = "${tournamentId}"`, sort: '+id' })
        .then((recs) => setState((s) => ({ ...s, teams: recs.map(recordToTeam) })))
    })

    return () => {
      active = false
      pb.collection('matches').unsubscribe()
      pb.collection('game_tables').unsubscribe()
      pb.collection('tournaments').unsubscribe()
      pb.collection('group_standings').unsubscribe()
      pb.collection('teams').unsubscribe()
    }
  }, [tournamentId])

  return {
    ...state,
    reload: () => { if (tournamentId) load(tournamentId) },
    silentReload: () => { if (tournamentId) load(tournamentId, true) },
  }
}
