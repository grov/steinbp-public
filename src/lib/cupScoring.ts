export interface CupScore {
  winnerFor: number
  winnerAgainst: number
  loserFor: number
  loserAgainst: number
}

export function effectiveCupsToWin(cupsPerSide: number, cupsToWin?: number | null): number {
  if (!cupsToWin || cupsToWin < 1) return cupsPerSide
  return Math.min(cupsPerSide, cupsToWin)
}

export function minimumWinnerCupsRemaining(cupsPerSide: number, cupsToWin: number): number {
  const target = effectiveCupsToWin(cupsPerSide, cupsToWin)
  return Math.max(1, cupsPerSide - target + 1)
}

export function cupScoreForResult(
  cupsPerSide: number,
  cupsToWin: number,
  winnerCupsRemaining: number,
): CupScore {
  const target = effectiveCupsToWin(cupsPerSide, cupsToWin)
  const loserFor = Math.min(target - 1, Math.max(0, cupsPerSide - winnerCupsRemaining))

  return {
    winnerFor: target,
    winnerAgainst: loserFor,
    loserFor,
    loserAgainst: target,
  }
}
