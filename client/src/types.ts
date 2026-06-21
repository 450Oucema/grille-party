export type RoomPhase = 'lobby' | 'playing' | 'results'

export type GridCell = {
  letter: string
  row: number
  col: number
}

export type PublicPlayer = {
  id: string
  name: string
  avatar: number
  connected: boolean
  wordCount: number
}

export type PublicRoom = {
  code: string
  phase: RoomPhase
  players: PublicPlayer[]
  endsAt?: number
  grid?: GridCell[][]
  gridSize: number
  durationSec: number
}

export type WordResult = {
  word: string
  validDictionary: boolean
  validPath: boolean
  duplicateCount: number
  score: number
}

export type PlayerResult = {
  playerId: string
  playerName: string
  avatar: number
  totalScore: number
  wordCount: number
  words: WordResult[]
  bestWord: string | null
}

export const AVATARS = ['🐙', '⭐', '🌊', '🎮', '🦄', '🐸', '🌈', '🎪']
