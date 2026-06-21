import { io } from 'socket.io-client'

const URL = import.meta.env.DEV ? 'http://localhost:3025' : window.location.origin

export const socket = io(URL, {
  autoConnect: false,
})
