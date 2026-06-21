import { io } from 'socket.io-client'

const URL = import.meta.env.DEV
  ? (import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3035')
  : window.location.origin

const path = import.meta.env.VITE_SOCKET_PATH ?? `${import.meta.env.BASE_URL}socket.io`

export const socket = io(URL, {
  autoConnect: false,
  path,
})
