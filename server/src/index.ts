import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { loadDictionary, isValidWord, normalize } from './dictionary.js'
import { canFormWord } from './grid.js'
import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayerBySocket,
  toPublicRoom,
  getRoomBySocket,
  updateRoomSettings,
} from './rooms.js'
import { startGame, endGame } from './game.js'

const PORT = parseInt(process.env.PORT ?? '3025', 10)
const HOST = process.env.HOST ?? '127.0.0.1'
const SOCKET_PATH = process.env.SOCKET_PATH ?? '/socket.io'

loadDictionary()

const app = express()
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  path: SOCKET_PATH,
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
})

// Rate limiting per socket for word:submit
const wordSubmitTimestamps = new Map<string, number[]>()
function rateLimitWord(socketId: string): boolean {
  const now = Date.now()
  const ts = wordSubmitTimestamps.get(socketId) ?? []
  const recent = ts.filter(t => now - t < 1000)
  if (recent.length >= 5) return false
  recent.push(now)
  wordSubmitTimestamps.set(socketId, recent)
  return true
}

io.on('connection', (socket) => {
  // Client requests current room state (reconnect / navigation)
  socket.on('room:sync', ({ roomCode, playerId }: { roomCode: string; playerId?: string }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('error', { message: 'Salle introuvable.' })
      return
    }
    // Re-attach socket to room channel
    socket.join(room.code)
    // Update socket id for the player if reconnecting
    if (playerId) {
      const player = room.players.get(playerId)
      if (player) {
        player.socketId = socket.id
        player.connected = true
      }
    } else {
      // host reconnect
      room.hostSocketId = socket.id
    }
    socket.emit('room:state', toPublicRoom(room))
    if (room.phase === 'playing' && room.grid && room.endsAt) {
      socket.emit('game:started', { grid: room.grid, endsAt: room.endsAt })
    }
    if (room.phase === 'results' && room.lastResults) {
      socket.emit('game:ended', { results: room.lastResults })
    }
  })

  socket.on('room:create', () => {
    const room = createRoom()
    room.hostSocketId = socket.id
    socket.join(room.code)
    socket.emit('room:created', { roomCode: room.code })
    socket.emit('room:state', toPublicRoom(room))
  })

  socket.on('room:join', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('error', { message: 'Salle introuvable.' })
      return
    }
    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'La partie a déjà commencé.' })
      return
    }
    if (room.players.size >= 12) {
      socket.emit('error', { message: 'Salle pleine (max 12 joueurs).' })
      return
    }
    if (!playerName?.trim()) {
      socket.emit('error', { message: 'Pseudo invalide.' })
      return
    }

    const player = addPlayer(room, socket.id, playerName)
    socket.join(room.code)
    socket.emit('player:state', { id: player.id, words: [] })
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('room:settings', ({ roomCode, gridSize, durationSec }: { roomCode: string; gridSize?: number; durationSec?: number }) => {
    const room = getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id || room.phase !== 'lobby') return
    updateRoomSettings(room, { gridSize, durationSec })
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('room:start', ({ roomCode }: { roomCode: string }) => {
    const room = getRoom(roomCode)
    if (!room) return
    if (room.hostSocketId !== socket.id) {
      socket.emit('error', { message: 'Seul le host peut lancer la partie.' })
      return
    }
    if (room.phase !== 'lobby') return
    if (room.players.size < 1) {
      socket.emit('error', { message: 'Au moins 1 joueur requis.' })
      return
    }
    startGame(io, room)
  })

  socket.on('word:submit', ({ roomCode, playerId, word }: { roomCode: string; playerId: string; word: string }) => {
    if (!rateLimitWord(socket.id)) {
      socket.emit('word:rejected-local', { word, reason: 'trop_vite' })
      return
    }

    const room = getRoom(roomCode)
    if (!room || room.phase !== 'playing') {
      socket.emit('word:rejected-local', { word, reason: 'partie_inactive' })
      return
    }

    if (Date.now() > (room.endsAt ?? 0)) {
      socket.emit('word:rejected-local', { word, reason: 'temps_ecoule' })
      return
    }

    const player = room.players.get(playerId)
    if (!player || player.socketId !== socket.id) {
      socket.emit('word:rejected-local', { word, reason: 'joueur_invalide' })
      return
    }

    if (player.words.size >= 500) {
      socket.emit('word:rejected-local', { word, reason: 'limite_atteinte' })
      return
    }

    const norm = normalize(word)

    if (norm.length < 3) {
      socket.emit('word:rejected-local', { word, reason: 'trop_court' })
      return
    }

    if (!/^[A-Z]+$/.test(norm)) {
      socket.emit('word:rejected-local', { word, reason: 'caracteres_invalides' })
      return
    }

    if (player.words.has(norm)) {
      socket.emit('word:rejected-local', { word, reason: 'deja_envoye' })
      return
    }

    if (!isValidWord(norm)) {
      socket.emit('word:rejected-local', { word, reason: 'hors_dictionnaire' })
      return
    }

    if (!canFormWord(norm, room.grid!)) {
      socket.emit('word:rejected-local', { word, reason: 'impossible_grille' })
      return
    }

    player.words.add(norm)
    socket.emit('word:accepted-local', { word: norm })

    // Update word count for all
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('room:restart', () => {
    const room = getRoomBySocket(socket.id)
    if (!room || room.hostSocketId !== socket.id) return
    room.phase = 'lobby'
    room.grid = undefined
    room.startedAt = undefined
    room.endsAt = undefined
    for (const p of room.players.values()) {
      p.words = new Set()
    }
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('disconnect', () => {
    wordSubmitTimestamps.delete(socket.id)
    const result = removePlayerBySocket(socket.id)
    if (result) {
      const { room } = result
      io.to(room.code).emit('room:state', toPublicRoom(room))

      // If game is playing and all disconnected, end it
      if (room.phase === 'playing') {
        const anyConnected = [...room.players.values()].some(p => p.connected)
        if (!anyConnected) endGame(io, room)
      }
    }
  })
})

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

httpServer.listen(PORT, HOST, () => {
  console.log(`[server] Grille Party running on http://${HOST}:${PORT}`)
})
