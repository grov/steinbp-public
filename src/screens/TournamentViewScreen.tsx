import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useAuth } from '../context/AuthContext'
import { BracketView } from '../components/tournament/BracketView'
import { GroupStandings } from '../components/tournament/GroupStandings'
import { RankingList } from '../components/tournament/RankingList'
import { MatchRow } from '../components/tournament/MatchRow'
import { EventHeader, HeaderButton } from '../components/tournament/EventHeader'
import { Modal } from '../components/ui/Modal'
import { compareStandings, officialRulesText } from '../lib/standings'
import { teamProgress, type TeamProgress } from '../lib/teamProgress'
import type { MatchWithRelations, Team, Tournament } from '../types/database'

export function TournamentViewScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { player } = useAuth()
  const { tournament, teams, matches, groups, loading } = useTournament(id)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
        Chargement…
      </div>
    )
  }

  const myTeam = teams.find((t) => !t.is_bye && player && (t.player1_id === player.id || t.player2_id === player.id)) ?? null
  const myTeamIds = myTeam ? [myTeam.id] : []
  const isOfficial = tournament.format === 'official'

  const hasRules = isOfficial || !!tournament.rules
  const headerActions = hasRules ? (
    <HeaderButton onClick={() => setRulesOpen(true)}>Règles du jeu</HeaderButton>
  ) : undefined

  const rulesModal = (
    <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Règles du jeu">
      <div className="flex flex-col gap-5 text-sm leading-relaxed whitespace-pre-line text-zinc-300">
        {isOfficial && <p>{officialRulesText(tournament)}</p>}
        {tournament.rules && <p>{tournament.rules}</p>}
      </div>
    </Modal>
  )

  // ── Vue d'une équipe : tous ses matchs ──────────────────────
  if (selectedTeam) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <EventHeader title={selectedTeam.name} onBack={() => setSelectedTeam(null)} />
        <main className="max-w-2xl w-full mx-auto px-4 py-6">
          <TeamMatches
            teamId={selectedTeam.id}
            matches={matches}
            tournament={tournament}
            onTeamClick={setSelectedTeam}
          />
        </main>
      </div>
    )
  }

  // ── Vue du tournoi ──────────────────────────────────────────
  const qualifGroup = isOfficial ? groups[0] : undefined
  const ranking = qualifGroup ? [...qualifGroup.standings].sort(compareStandings) : []
  const progress = myTeam ? teamProgress(myTeam.id, tournament, matches, ranking) : null
  const hasBracket = matches.some((m) => m.phase === 'bracket')
  const liveMatches = matches.filter((m) => m.status === 'in_progress')

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <EventHeader
        title={tournament.name}
        tournament={tournament}
        onBack={() => navigate('/my-tournaments')}
        actions={headerActions}
      />

      <main className="max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-8">
        {myTeam && progress && <ProgressBanner progress={progress} team={myTeam} />}

        {!myTeam && liveMatches.length > 0 && (
          <Section title="En cours">
            {liveMatches.map((m) => (
              <MatchRow key={m.id} match={m} tournament={tournament} onTeamClick={setSelectedTeam} />
            ))}
          </Section>
        )}

        {hasBracket && (
          <Section title="Tableau du tournoi">
            <BracketView matches={matches} tournament={tournament} myTeamIds={myTeamIds} />
          </Section>
        )}

        {myTeam && (
          <TeamMatches teamId={myTeam.id} matches={matches} tournament={tournament} onTeamClick={setSelectedTeam} />
        )}

        {qualifGroup && (
          <Section title="Classement des qualifications">
            <RankingList
              standings={qualifGroup.standings}
              qualifiedCount={tournament.qualified_count}
              myTeamIds={myTeamIds}
              onTeamClick={setSelectedTeam}
            />
          </Section>
        )}

        {!isOfficial && groups.length > 0 && (
          <Section title="Classements des poules">
            <GroupStandings groups={groups} />
          </Section>
        )}

        {!hasBracket && groups.length === 0 && (
          <p className="text-center text-zinc-500 py-8">Le tournoi n'a pas encore commencé.</p>
        )}
      </main>

      {rulesModal}
    </div>
  )
}

// ── Matchs d'une équipe ───────────────────────────────────────

function TeamMatches({
  teamId,
  matches,
  tournament,
  onTeamClick,
}: {
  teamId: string
  matches: MatchWithRelations[]
  tournament: Tournament
  onTeamClick: (team: Team) => void
}) {
  const played = (m: MatchWithRelations) =>
    (m.team1_id === teamId || m.team2_id === teamId) && m.status !== 'bye' && !m.team1?.is_bye && !m.team2?.is_bye
  // Les plus récents d'abord en phase finale, ordre de passage en qualifs.
  const bracket = matches.filter((m) => m.phase === 'bracket' && played(m)).sort((a, b) => b.round - a.round)
  const group = matches.filter((m) => m.phase === 'group' && played(m)).sort(byPlayingOrder)

  if (bracket.length === 0 && group.length === 0) {
    return <p className="text-center text-zinc-500 py-8">Aucun match pour le moment.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {bracket.length > 0 && (
        <Section title="Phase finale">
          {bracket.map((m) => (
            <MatchRow key={m.id} match={m} tournament={tournament} onTeamClick={onTeamClick} />
          ))}
        </Section>
      )}
      {group.length > 0 && (
        <Section title={tournament.format === 'official' ? 'Qualifications' : 'Poules'}>
          {group.map((m) => (
            <MatchRow key={m.id} match={m} tournament={tournament} onTeamClick={onTeamClick} />
          ))}
        </Section>
      )}
    </div>
  )
}

/** Matchs joués dans l'ordre où ils ont commencé, puis ceux à venir. */
function byPlayingOrder(a: MatchWithRelations, b: MatchWithRelations): number {
  if (a.started_at && b.started_at) return a.started_at.localeCompare(b.started_at)
  if (a.started_at) return -1
  if (b.started_at) return 1
  return a.round - b.round || a.match_number - b.match_number
}

// ── Bandeau de situation ──────────────────────────────────────

const ROUND_SINGULAR = [
  'finale',
  'demi-finale',
  'quart de finale',
  'huitième de finale',
  'seizième de finale',
  'trente-deuxième de finale',
]

function ProgressBanner({ progress, team }: { progress: TeamProgress; team: Team }) {
  const content = bannerContent(progress)
  if (!content) return null

  return (
    <div className={`rounded-3xl px-5 py-5 text-center flex flex-col items-center gap-3 ${content.className}`}>
      <p className="font-semibold text-lg leading-snug">{content.text}</p>
      <span className="bg-paper text-black rounded-full px-5 py-2 font-semibold">{team.name}</span>
    </div>
  )
}

function bannerContent(progress: TeamProgress): { text: string; className: string } | null {
  switch (progress.kind) {
    case 'waiting':
      return null
    case 'qualifying':
      return {
        text: `Qualifications en cours · ${progress.rank}${progress.rank === 1 ? 'er' : 'e'} avec ${progress.points} pt${progress.points > 1 ? 's' : ''}`,
        className: 'bg-black text-paper',
      }
    case 'not_qualified':
      return { text: `Pas qualifiés pour la phase finale (${progress.rank}e) 😔`, className: 'bg-loss text-paper' }
    case 'alive': {
      const label = ROUND_SINGULAR[progress.maxRound - progress.round] ?? `tour ${progress.round}`
      return { text: `Toujours en course · ${label} 🔥`, className: 'bg-win text-paper' }
    }
    case 'eliminated': {
      const label = ROUND_SINGULAR[progress.maxRound - progress.round] ?? `tour ${progress.round}`
      return { text: `Vous avez été éliminés en ${label} ! 😔`, className: 'bg-loss text-paper' }
    }
    case 'runner_up':
      return { text: 'Finalistes ! Bravo 🥈', className: 'bg-black text-paper' }
    case 'champion':
      return { text: 'Vous avez remporté le tournoi ! 🏆', className: 'bg-win text-paper' }
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-white text-lg mb-3">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
