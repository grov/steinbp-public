import { MatchStatusBadge } from '../ui/Badge'
import type { GameTable, MatchWithRelations } from '../../types/database'

interface MatchCardProps {
  match: MatchWithRelations
  availableTables: GameTable[]
  onAssignTable: (matchId: string, tableId: string) => void
  onEnterScore: (match: MatchWithRelations) => void
  onUnassign?: (match: MatchWithRelations) => void
  onEditScore?: (match: MatchWithRelations) => void
  compact?: boolean
}

/**
 * Carte de match — affiche les deux équipes, le statut et les actions disponibles.
 * Adapté à l'utilisation tactile en bar : zones de tap généreuses.
 */
export function MatchCard({
  match,
  availableTables,
  onAssignTable,
  onEnterScore,
  onUnassign,
  onEditScore,
  compact = false,
}: MatchCardProps) {
  const { team1, team2, table, status, winner } = match
  const isFinished = status === 'finished' || status === 'bye'
  const isInProgress = status === 'in_progress'
  const isReady = status === 'ready'

  const borderColor = isInProgress
    ? 'border-green-500/50'
    : isFinished
      ? 'border-zinc-700/30'
      : 'border-zinc-700'

  return (
    <div
      className={`
        bg-zinc-900 border rounded-2xl overflow-hidden transition-colors
        ${borderColor}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* En-tête : label du round / statut */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 font-medium">
          {match.phase === 'bracket' ? `Tour ${match.round}` : `Poule — M${match.match_number}`}
        </span>
        <div className="flex items-center gap-2">
          {isFinished && status !== 'bye' && onEditScore && (
            <button
              onClick={() => onEditScore(match)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
              aria-label="Modifier le score"
              title="Modifier le score"
            >
              ✏️
            </button>
          )}
          <MatchStatusBadge status={status} />
        </div>
      </div>

      {/* Équipes + score */}
      <div className="flex items-center gap-3">
        <TeamSlot
          team={team1}
          isWinner={winner?.id === team1?.id}
          isFinished={isFinished}
        />

        {/* Séparateur central */}
        {isFinished && winner && match.winner_cups_remaining !== null ? (
          <div className="flex-shrink-0 flex flex-col items-center gap-0 min-w-[36px]">
            <span className={`font-black text-xl tabular-nums leading-tight ${winner.id === team1?.id ? 'text-green-400' : 'text-zinc-600'}`}>
              {winner.id === team1?.id ? match.winner_cups_remaining : 0}
            </span>
            <span className="text-zinc-700 text-[10px] leading-none">🥤</span>
            <span className={`font-black text-xl tabular-nums leading-tight ${winner.id === team2?.id ? 'text-green-400' : 'text-zinc-600'}`}>
              {winner.id === team2?.id ? match.winner_cups_remaining : 0}
            </span>
          </div>
        ) : (
          <span className="text-zinc-600 font-bold text-sm flex-shrink-0">VS</span>
        )}

        <TeamSlot
          team={team2}
          isWinner={winner?.id === team2?.id}
          isFinished={isFinished}
        />
      </div>

      {/* Actions */}
      {!compact && (isInProgress || isReady) && (
        <div className="mt-4 flex flex-col gap-2">
          {/* Table assignée */}
          {isInProgress && table && (
            <div className="flex items-center justify-between bg-green-500/10 rounded-xl px-3 py-2">
              <span className="text-green-300 text-sm font-medium">📍 {table.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onEnterScore(match)}
                  className="bg-brand text-white text-sm font-bold px-4 py-1.5 rounded-lg
                             hover:bg-brand-dark active:scale-95 transition-all"
                >
                  Score
                </button>
                {onUnassign && (
                  <button
                    onClick={() => onUnassign(match)}
                    className="text-zinc-500 hover:text-red-400 text-sm px-2 py-1.5 rounded-lg
                               hover:bg-zinc-800 transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Assignation de table */}
          {isReady && !isInProgress && availableTables.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {availableTables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onAssignTable(match.id, t.id)}
                  className="flex-1 min-w-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300
                             text-sm font-medium py-2 px-3 rounded-xl transition-colors
                             active:scale-95 min-h-touch"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {isReady && availableTables.length === 0 && (
            <p className="text-center text-zinc-600 text-xs py-1">
              En attente d'une table libre…
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TeamSlot({
  team,
  isWinner,
  isFinished,
}: {
  team: MatchWithRelations['team1']
  isWinner: boolean
  isFinished: boolean
}) {
  if (!team || team.is_bye) {
    return (
      <div className="flex-1 text-center text-zinc-600 text-sm italic py-2">
        {team?.is_bye ? 'BYE' : 'À déterminer'}
      </div>
    )
  }

  return (
    <div
      className={`flex-1 text-center py-2 rounded-xl transition-colors
        ${isFinished && isWinner ? 'bg-green-500/10' : ''}
        ${isFinished && !isWinner ? 'opacity-40' : ''}
      `}
    >
      <p
        className={`font-bold text-base leading-tight ${isWinner && isFinished ? 'text-green-300' : 'text-white'}`}
      >
        {isWinner && isFinished && '🏆 '}
        {team.name}
      </p>
      <p className="text-zinc-500 text-xs mt-0.5">
        {[team.player1_name, team.player2_name].filter(Boolean).join(' & ')}
      </p>
    </div>
  )
}
