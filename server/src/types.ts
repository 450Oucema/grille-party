export type RoomPhase = 'lobby' | 'playing' | 'results'
export type ScoreMode = 'classic' | 'rareLetters'

export type GridCell = {
  letter: string // may be "QU"
  row: number
  col: number
}

export type Player = {
  id: string
  socketId: string
  name: string
  words: Set<string>
  connected: boolean
  avatar: number // 0-7 index for emoji avatar
}

export type Room = {
  code: string
  phase: RoomPhase
  createdAt: number
  hostSocketId?: string
  hostToken: string
  players: Map<string, Player>
  grid?: GridCell[][]
  startedAt?: number
  endsAt?: number
  durationSec: number
  gridSize: number  // 4 or 6
  scoreMode: ScoreMode
  lastResults?: PlayerResult[]
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
  scoreMode: ScoreMode
}

export type PrivatePlayerState = {
  id: string
  words: string[]
}
