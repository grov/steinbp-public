import { describe, expect, it } from 'vitest'
import { cupScoreForResult, effectiveCupsToWin, minimumWinnerCupsRemaining } from './cupScoring'

describe('effectiveCupsToWin', () => {
  it('préserve la règle historique quand la cible est absente', () => {
    expect(effectiveCupsToWin(10, null)).toBe(10)
  })

  it('limite la cible au nombre de gobelets installés', () => {
    expect(effectiveCupsToWin(8, 10)).toBe(8)
  })
})

describe('minimumWinnerCupsRemaining', () => {
  it('empêche le perdant d’avoir déjà atteint la cible', () => {
    expect(minimumWinnerCupsRemaining(10, 6)).toBe(5)
  })
})

describe('cupScoreForResult', () => {
  it('crédite seulement la cible au vainqueur', () => {
    expect(cupScoreForResult(10, 6, 5)).toEqual({
      winnerFor: 6,
      winnerAgainst: 5,
      loserFor: 5,
      loserAgainst: 6,
    })
  })

  it('borne les anciennes données incohérentes sous la cible', () => {
    expect(cupScoreForResult(10, 6, 1).loserFor).toBe(5)
  })
})
