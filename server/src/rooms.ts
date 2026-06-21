import type { Room, Player, PublicRoom, PublicPlayer } from './types.js'

const rooms = new Map<string, Room>()

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
    players: new Map(),
    durationSec: 180,
    gridSize: 6,
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
  const player: Player = {
    id,
    socketId,
    name: name.trim().slice(0, 20),
    words: new Set(),
    connected: true,
    avatar,
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
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return room
    }
  }
  return undefined
}

export function updateRoomSettings(room: Room, settings: { gridSize?: number; durationSec?: number }): void {
  if (settings.gridSize && [4, 6].includes(settings.gridSize)) {
    room.gridSize = settings.gridSize
  }
  if (settings.durationSec && settings.durationSec >= 60 && settings.durationSec <= 300) {
    room.durationSec = settings.durationSec
  }
}

export function toPublicRoom(room: Room): PublicRoom {
  const players: PublicPlayer[] = []
  for (const p of room.players.values()) {
    players.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
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
  }
}

// Cleanup rooms older than 2h
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(code)
  }
}, 10 * 60 * 1000)
