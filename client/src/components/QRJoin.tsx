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
    <div className="cartoon-card flex flex-col items-center gap-4 p-5">
      <div className="rounded-[22px] border-[3px] border-game-purple bg-white p-4 shadow-cartoon-sm">
        <QRCodeSVG value={url} size={190} fgColor="#28104B" />
      </div>
      <div className="text-center">
        <div className="mb-1 text-sm font-black uppercase text-game-purple">Code de partie</div>
        <div className="cartoon-title-sm font-display text-6xl text-game-yellow">
          {roomCode}
        </div>
        <div className="mt-2 max-w-[260px] break-all rounded-2xl bg-game-lilac px-3 py-2 text-xs font-extrabold text-game-purple">
          {url}
        </div>
      </div>
    </div>
  )
}
