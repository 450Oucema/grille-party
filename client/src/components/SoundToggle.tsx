import { useEffect, useState } from 'react'
import { sound } from '../audio/sound'

type Props = {
  className?: string
}

export default function SoundToggle({ className = '' }: Props) {
  const [audioState, setAudioState] = useState(sound.getState())
  const [open, setOpen] = useState(false)

  useEffect(() => sound.subscribe(setAudioState), [])

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          sound.playUiClick()
          setOpen(prev => !prev)
        }}
        className="status-pill bg-white px-3 py-2 text-sm font-black text-game-purple"
        aria-label="Réglages son"
        title="Réglages son"
      >
        {audioState.muted ? 'Son off' : 'Son on'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-[20px] border-[3px] border-game-purple bg-white p-3 shadow-cartoon-sm">
          <button
            type="button"
            onClick={() => sound.toggleMuted()}
            className="btn-secondary w-full px-3 py-2 text-sm"
          >
            {audioState.muted ? 'Activer le son' : 'Couper le son'}
          </button>

          <label className="mt-3 block text-xs font-black uppercase text-game-purple">
            Musique
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.musicVolume}
              onChange={(event) => sound.setMusicVolume(Number(event.target.value))}
              className="mt-1 block w-full accent-[#FF4DB8]"
            />
          </label>

          <label className="mt-3 block text-xs font-black uppercase text-game-purple">
            Effets
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.sfxVolume}
              onChange={(event) => sound.setSfxVolume(Number(event.target.value))}
              className="mt-1 block w-full accent-[#39E5B7]"
            />
          </label>
        </div>
      )}
    </div>
  )
}
