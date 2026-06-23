import type { Room, Player, PublicRoom, PublicPlayer } from './types.js'
import { randomBytes } from 'crypto'

const rooms = new Map<string, Room>()
const PLAYER_COLORS = ['#FF4DB8', '#39E5B7', '#FFD94A', '#7B49FF', '#FF9B52', '#21E0D6', '#48E084', '#E9D6FF']

function randomCode(len = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function createRoom(): Room {
  let code = randomCode()
  while (rooms.has(code)) code = randomCode()

  const room: Room = {
    code,
    phase: 'lobby',
    createdAt: Date.now(),
    hostToken: randomBytes(24).toString('hex'),
    players: new Map(),
    durationSec: 180,
    gridSize: 6,
    scoreMode: 'classic',
  }
  rooms.set(code, room)
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase())
}

export function addPlayer(room: Room, socketId: string, name: string): Player {
  const id = `p${Date.now()}${Math.random().toString(36).slice(2, 5)}`
  const avatar = room.players.size % 8
  const color = PLAYER_COLORS[room.players.size % PLAYER_COLORS.length]
  const player: Player = {
    id,
    socketId,
    name: name.trim().slice(0, 20),
    words: new Set(),
    connected: true,
    avatar,
    color,
  }
  room.players.set(id, player)
  return player
}

export function removePlayerBySocket(socketId: string): { room: Room; player: Player } | null {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) {
        player.connected = false
        return { room, player }
      }
    }
  }
  return null
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hostSocketId === socketId) return room
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return room
    }
  }
  return undefined
}

export function updateRoomSettings(room: Room, settings: { gridSize?: number; durationSec?: number; scoreMode?: Room['scoreMode'] }): void {
  if (settings.gridSize && [4, 6].includes(settings.gridSize)) {
    room.gridSize = settings.gridSize
  }
  if (settings.durationSec && settings.durationSec >= 60 && settings.durationSec <= 300) {
    room.durationSec = settings.durationSec
  }
  if (settings.scoreMode && ['classic', 'rareLetters'].includes(settings.scoreMode)) {
    room.scoreMode = settings.scoreMode
  }
}

export function toPublicRoom(room: Room): PublicRoom {
  const players: PublicPlayer[] = []
  for (const p of room.players.values()) {
    players.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      connected: p.connected,
      wordCount: p.words.size,
    })
  }
  return {
    code: room.code,
    phase: room.phase,
    players,
    endsAt: room.endsAt,
    grid: room.grid,
    gridSize: room.gridSize,
    durationSec: room.durationSec,
    scoreMode: room.scoreMode,
  }
}

// Cleanup rooms older than 2h
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(code)
  }
}, 10 * 60 * 1000)
