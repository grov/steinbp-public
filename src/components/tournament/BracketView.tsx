import type { MatchWithRelations } from '../../types/database'


interface BracketViewProps {
  matches: MatchWithRelations[]
  onMatchClick?: (match: MatchWithRelations) => void
}

/**
 * Vue bracket élimination directe.
 * Sur mobile : onglets par tour (affichage vertical).
 * Sur desktop : vue horizontale classique avec lignes de connexion SVG.
 */
export function BracketView({ matches, onMatchClick }: BracketViewProps) {
  const bracketMatches = matches.filter((m) => m.phase === 'bracket')
  if (bracketMatches.length === 0) return <EmptyBracket />

  const rounds = groupByRound(bracketMatches)
  const maxRound = Math.max(...Object.keys(rounds).map(Number))

  return (
    <>
      {/* Mobile : tours empilés */}
      <div className="lg:hidden">
        <MobileBracket rounds={rounds} maxRound={maxRound} onMatchClick={onMatchClick} />
      </div>

      {/* Desktop : vue horizontale */}
      <div className="hidden lg:flex overflow-x-auto pb-4">
        <DesktopBracket rounds={rounds} maxRound={maxRound} onMatchClick={onMatchClick} />
      </div>
    </>
  )
}

// ── Vue mobile ────────────────────────────────────────────────

function MobileBracket({
  rounds,
  maxRound,
  onMatchClick,
}: {
  rounds: Record<number, MatchWithRelations[]>
  maxRound: number
  onMatchClick?: (m: MatchWithRelations) => void
}) {
  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-6">
      {roundNumbers.map((r) => (
        <div key={r}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">
            {roundLabel(r, maxRound)}
          </h3>
          <div className="flex flex-col gap-3">
            {rounds[r].map((match) => (
              <BracketMatchCard key={match.id} match={match} onClick={onMatchClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Vue desktop ───────────────────────────────────────────────

function DesktopBracket({
  rounds,
  maxRound,
  onMatchClick,
}: {
  rounds: Record<number, MatchWithRelations[]>
  maxRound: number
  onMatchClick?: (m: MatchWithRelations) => void
}) {
  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b)

  const firstRoundCount = rounds[roundNumbers[0]]?.length ?? 1
  const totalHeight = Math.max(firstRoundCount * 88, 160)

  return (
    <div className="flex gap-3">
      {roundNumbers.map((r) => (
        <div key={r} style={{ width: 160, flexShrink: 0 }} className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 text-center mb-3">
            {roundLabel(r, maxRound)}
          </p>
          <div style={{ height: totalHeight }} className="flex flex-col">
            {rounds[r].map((match) => (
              <div key={match.id} style={{ flex: 1 }} className="flex items-center py-1">
                <div className="w-full">
                  <BracketMatchCard match={match} onClick={onMatchClick} compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Carte individuelle de match (bracket) ─────────────────────

function BracketMatchCard({
  match,
  onClick,
  compact = false,
}: {
  match: MatchWithRelations
  onClick?: (m: MatchWithRelations) => void
  compact?: boolean
}) {
  const isClickable = onClick && ['ready', 'in_progress'].includes(match.status)

  return (
    <div
      onClick={() => isClickable && onClick(match)}
      className={`
        bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden
        ${compact ? 'text-sm' : ''}
        ${isClickable ? 'cursor-pointer hover:border-brand/50 active:scale-98 transition-all' : ''}
        ${match.status === 'in_progress' ? 'border-green-500/40' : ''}
      `}
    >
      <BracketTeamRow
        team={match.team1}
        isWinner={match.winner_id === match.team1?.id}
        isFinished={match.status === 'finished'}
      />
      <div className="h-px bg-zinc-800" />
      <BracketTeamRow
        team={match.team2}
        isWinner={match.winner_id === match.team2?.id}
        isFinished={match.status === 'finished'}
      />
      {match.status === 'in_progress' && match.table && (
        <div className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] text-center font-medium">
          {match.table.name}
        </div>
      )}
    </div>
  )
}

function BracketTeamRow({
  team,
  isWinner,
  isFinished,
}: {
  team: MatchWithRelations['team1']
  isWinner: boolean
  isFinished: boolean
}) {
  if (!team) {
    return <div className="px-2 py-1.5 text-zinc-600 text-xs italic">À déterminer</div>
  }
  if (team.is_bye) {
    return <div className="px-2 py-1.5 text-zinc-600 text-xs italic">BYE</div>
  }
  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1.5
        ${isFinished && isWinner ? 'bg-green-500/10 text-green-300' : ''}
        ${isFinished && !isWinner ? 'opacity-40 text-zinc-400' : 'text-white'}
      `}
    >
      <span className="font-semibold truncate flex-1 text-sm leading-tight">{team.name}</span>
      {isWinner && isFinished && <span className="text-xs">🏆</span>}
    </div>
  )
}

// ── Utilitaires ───────────────────────────────────────────────

function groupByRound(matches: MatchWithRelations[]): Record<number, MatchWithRelations[]> {
  return matches.reduce(
    (acc, m) => {
      if (!acc[m.round]) acc[m.round] = []
      acc[m.round].push(m)
      acc[m.round].sort((a, b) => a.match_number - b.match_number)
      return acc
    },
    {} as Record<number, MatchWithRelations[]>,
  )
}

function roundLabel(round: number, maxRound: number): string {
  const remaining = maxRound - round + 1
  if (remaining === 1) return 'Finale'
  if (remaining === 2) return 'Demi-finales'
  if (remaining === 3) return 'Quarts de finale'
  return `Tour ${round}`
}

function EmptyBracket() {
  return (
    <div className="text-center py-12 text-zinc-600">
      <p className="text-4xl mb-3">🎯</p>
      <p>Le bracket n'a pas encore été généré.</p>
    </div>
  )
}
