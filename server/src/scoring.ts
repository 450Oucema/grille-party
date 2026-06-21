import type { Player, WordResult, PlayerResult } from './types.js'
import { isValidWord, normalize } from './dictionary.js'
import { canFormWord } from './grid.js'
import type { GridCell } from './types.js'

export function wordScore(word: string): number {
  // QU cell counts as 2 letters
  const len = word.split('').reduce((n, ch, i, arr) => {
    if (ch === 'Q' && arr[i + 1] === 'U') return n // skip Q in QU pair
    return n + 1
  }, 0)
  // Simpler: normalize to plain letters, QU → 2 chars already there
  const normLen = normalize(word).length
  return 3 + Math.max(0, normLen - 3)
}

export function computeResults(
  players: Map<string, Player>,
  grid: GridCell[][]
): PlayerResult[] {
  // Count how many players submitted each word
  const wordCounts = new Map<string, number>()
  for (const player of players.values()) {
    for (const word of player.words) {
      const norm = normalize(word)
      wordCounts.set(norm, (wordCounts.get(norm) ?? 0) + 1)
    }
  }

  const results: PlayerResult[] = []

  for (const player of players.values()) {
    const wordResults: WordResult[] = []
    let totalScore = 0
    let bestWord: string | null = null
    let bestScore = -1

    for (const word of player.words) {
      const norm = normalize(word)
      const validDict = isValidWord(norm)
      const validPath = validDict ? canFormWord(norm, grid) : false
      const dupCount = wordCounts.get(norm) ?? 0
      const isDuplicated = dupCount > 1

      let score = 0
      if (validDict && validPath && !isDuplicated) {
        score = wordScore(norm)
      }

      totalScore += score

      if (score > bestScore) {
        bestScore = score
        bestWord = word
      }

      wordResults.push({
        word,
        validDictionary: validDict,
        validPath,
        duplicateCount: dupCount,
        score,
      })
    }

    results.push({
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      totalScore,
      wordCount: wordResults.filter(w => w.score > 0).length,
      words: wordResults,
      bestWord: bestScore > 0 ? bestWord : null,
    })
  }

  results.sort((a, b) => b.totalScore - a.totalScore)
  return results
}
