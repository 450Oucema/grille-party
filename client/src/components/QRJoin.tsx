import { QRCodeSVG } from 'qrcode.react'

type Props = {
  roomCode: string
}

function getJoinUrl(roomCode: string): string {
  const { protocol, hostname, port } = window.location
  const host = port ? `${hostname}:${port}` : hostname
  return `${protocol}//${host}${import.meta.env.BASE_URL}join/${roomCode}`
}

export default function QRJoin({ roomCode }: Props) {
  const url = getJoinUrl(roomCode)

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="bg-white p-4 rounded-3xl"
        style={{ boxShadow: '0 0 30px rgba(255,204,0,0.4)' }}
      >
        <QRCodeSVG value={url} size={180} />
      </div>
      <div className="text-center">
        <div className="text-blue-300 text-sm mb-1">Rejoindre :</div>
        <div
          className="font-black text-5xl text-game-yellow tracking-widest"
          style={{ textShadow: '0 0 15px rgba(255,204,0,0.6)' }}
        >
          {roomCode}
        </div>
        <div className="text-blue-300 text-xs mt-1 break-all">{url}</div>
      </div>
    </div>
  )
}
