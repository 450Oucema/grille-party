import { useRef, useState } from 'react'

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

type Props = {
  onSubmit: (word: string) => void
  lastFeedback: Feedback | null
  disabled?: boolean
}

const REASON_LABELS: Record<string, string> = {
  trop_court: 'Trop court',
  hors_dictionnaire: 'Pas dans le dico',
  impossible_grille: 'Impossible dans la grille',
  deja_envoye: 'Déjà envoyé',
  trop_vite: 'Trop vite !',
  caracteres_invalides: 'Caractères invalides',
  partie_inactive: 'Partie terminée',
  temps_ecoule: 'Temps écoulé',
  limite_atteinte: 'Limite atteinte',
  joueur_invalide: 'Erreur joueur',
}

export default function WordInput({ onSubmit, lastFeedback, disabled }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const w = value.trim()
    if (w.length >= 2) {
      onSubmit(w)
      setValue('')
      inputRef.current?.focus()
    }
  }

  const shakeClass = lastFeedback?.status === 'rejected' ? 'animate-shake' : ''

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className={`flex gap-2 ${shakeClass}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tape un mot…"
          disabled={disabled}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-game-blue border-4 border-blue-500 rounded-2xl px-5 py-4
                     text-white text-2xl font-black placeholder-blue-400 outline-none
                     focus:border-game-yellow transition-colors uppercase
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || value.trim().length < 2}
          className="btn-primary text-2xl px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓
        </button>
      </div>

      {lastFeedback && (
        <div
          className={`text-center py-2 px-4 rounded-full text-lg font-black animate-bounce-in ${
            lastFeedback.status === 'accepted'
              ? 'bg-green-600'
              : lastFeedback.status === 'duplicate'
              ? 'bg-gray-600'
              : 'bg-red-600'
          }`}
        >
          {lastFeedback.status === 'accepted' && `✓ ${lastFeedback.word}`}
          {lastFeedback.status === 'duplicate' && `= ${lastFeedback.word} (déjà envoyé)`}
          {lastFeedback.status === 'rejected' && (
            <>✗ {REASON_LABELS[lastFeedback.reason ?? ''] ?? lastFeedback.reason}</>
          )}
        </div>
      )}
    </div>
  )
}
