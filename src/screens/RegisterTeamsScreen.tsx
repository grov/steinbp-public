import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addTeam, removeTeam, startTournament } from '../lib/tournamentActions'
import { useTournament } from '../hooks/useTournament'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PlayerSearchInput } from '../components/tournament/PlayerSearchInput'
import type { CreateTeamPayload } from '../types/database'

export function RegisterTeamsScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament, teams, loading } = useTournament(id)

  const [name, setName] = useState('')
  const [p1Name, setP1Name] = useState('')
  const [p1Id, setP1Id] = useState<string | null>(null)
  const [p2Name, setP2Name] = useState('')
  const [p2Id, setP2Id] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [starting, setStarting] = useState(false)

  const realTeams = teams.filter((t) => !t.is_bye)

  function validate() {
    if (!name.trim()) return 'Nom d\'équipe requis.'
    if (!p1Name.trim()) return 'Pseudo du joueur 1 requis.'
    if (realTeams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      return 'Ce nom d\'équipe est déjà pris.'
    }
    return null
  }

  async function handleAddTeam() {
    const err = validate()
    if (err) { setFormError(err); return }
    setFormError(null)
    setAdding(true)
    try {
      const payload: CreateTeamPayload = {
        tournament_id: id!,
        name: name.trim(),
        player1_name: p1Name.trim(),
        player2_name: p2Name.trim(),
        player1_id: p1Id,
        player2_id: p2Id,
      }
      await addTeam(payload)
      setName('')
      setP1Name('')
      setP1Id(null)
      setP2Name('')
      setP2Id(null)
      document.getElementById('team-name')?.focus()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setAdding(false)
    }
  }

  async function handleStart() {
    if (!tournament) return
    if (realTeams.length < 2) {
      setFormError('Il faut au moins 2 équipes pour démarrer.')
      return
    }
    setStarting(true)
    try {
      await startTournament(tournament)
      navigate(`/tournament/${id}`)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur au démarrage.')
      setStarting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-xl transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold">{tournament?.name}</h1>
          <p className="text-zinc-400 text-xs">Inscription des équipes</p>
        </div>
        <span className="ml-auto bg-brand/20 text-brand text-sm font-bold px-3 py-1 rounded-full">
          {realTeams.length} équipe{realTeams.length > 1 ? 's' : ''}
        </span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Formulaire d'ajout */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-zinc-300">Nouvelle équipe</p>
          <Input
            id="team-name"
            label="Nom de l'équipe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Les Imbuvables"
          />
          <div className="grid grid-cols-2 gap-3">
            <PlayerSearchInput
              label="Joueur 1"
              name={p1Name}
              playerId={p1Id}
              onChangeName={setP1Name}
              onSelectPlayer={(p) => { setP1Id(p?.id ?? null); if (p) setP1Name(p.display_name) }}
              placeholder="Rechercher…"
            />
            <PlayerSearchInput
              label="Joueur 2 (optionnel)"
              name={p2Name}
              playerId={p2Id}
              onChangeName={setP2Name}
              onSelectPlayer={(p) => { setP2Id(p?.id ?? null); if (p) setP2Name(p.display_name) }}
              placeholder="Optionnel…"
            />
          </div>

          {formError && (
            <p className="text-red-400 text-sm">{formError}</p>
          )}

          <Button fullWidth loading={adding} onClick={handleAddTeam}>
            Ajouter l'équipe
          </Button>
        </div>

        {/* Liste des équipes */}
        {realTeams.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Équipes inscrites ({realTeams.length})
            </h2>
            <div className="flex flex-col gap-2">
              {realTeams.map((team, i) => (
                <div
                  key={team.id}
                  className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
                >
                  <span className="text-zinc-600 font-bold text-sm w-6">{i + 1}</span>
                  <div className="flex-1 ml-2">
                    <p className="font-semibold text-white">{team.name}</p>
                    <p className="text-zinc-500 text-xs">
                      {[team.player1_name, team.player2_name].filter(Boolean).join(' & ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeTeam(team.id)}
                    className="text-zinc-600 hover:text-red-400 p-2 rounded-lg transition-colors min-h-touch min-w-[2.5rem] flex items-center justify-center"
                    aria-label="Retirer l'équipe"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note nombre impair */}
        {realTeams.length % 2 !== 0 && realTeams.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
            Nombre d'équipes impair — un Bye sera ajouté automatiquement.
          </div>
        )}

        {/* Bouton démarrer */}
        {realTeams.length >= 2 && (
          <Button
            size="xl"
            fullWidth
            loading={starting}
            onClick={handleStart}
            className="mt-2"
          >
            🚀 Démarrer le tournoi ({realTeams.length} équipes)
          </Button>
        )}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
      Chargement…
    </div>
  )
}
