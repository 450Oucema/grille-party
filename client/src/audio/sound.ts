type SoundState = {
  muted: boolean
  musicVolume: number
  sfxVolume: number
}

type Listener = (state: SoundState) => void
type Bus = 'music' | 'sfx'

const MUTED_KEY = 'grille-party:sound-muted'
const MUSIC_VOLUME_KEY = 'grille-party:music-volume'
const SFX_VOLUME_KEY = 'grille-party:sfx-volume'
const AVATAR_BASES = [220, 880, 330, 660, 990, 180, 740, 520]

function readVolume(key: string, fallback: number): number {
  const stored = Number(localStorage.getItem(key))
  if (!Number.isFinite(stored)) return fallback
  return Math.min(1, Math.max(0, stored))
}

class SoundManager {
  private context: AudioContext | null = null
  private state: SoundState = {
    muted: localStorage.getItem(MUTED_KEY) === '1',
    musicVolume: readVolume(MUSIC_VOLUME_KEY, 0.42),
    sfxVolume: readVolume(SFX_VOLUME_KEY, 0.8),
  }
  private listeners = new Set<Listener>()
  private musicTimer: number | null = null
  private musicStep = 0
  private musicEndsAt: number | null = null
  private musicDuckUntil = 0
  private lastTickSecond: number | null = null

  getState(): SoundState {
    return { ...this.state }
  }

  isMuted() {
    return this.state.muted
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setMuted(muted: boolean) {
    this.state.muted = muted
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
    if (muted) this.stopMusic()
    this.emit()
  }

  toggleMuted() {
    this.setMuted(!this.state.muted)
    if (!this.state.muted) {
      void this.unlock()
      this.playUiClick()
    }
  }

  setMusicVolume(volume: number) {
    this.state.musicVolume = Math.min(1, Math.max(0, volume))
    localStorage.setItem(MUSIC_VOLUME_KEY, String(this.state.musicVolume))
    this.emit()
  }

  setSfxVolume(volume: number) {
    this.state.sfxVolume = Math.min(1, Math.max(0, volume))
    localStorage.setItem(SFX_VOLUME_KEY, String(this.state.sfxVolume))
    this.emit()
    this.playUiClick()
  }

  async unlock() {
    const context = this.getContext()
    if (!context) return
    if (context.state === 'suspended') await context.resume()
  }

  playUiClick() {
    this.tone('sfx', 520, 0.045, 'triangle', 0.05, 780)
  }

  playSetting() {
    this.arpeggio('sfx', [440, 660], 0.045, 'square', 0.045)
  }

  playJoin() {
    this.duckMusic()
    this.arpeggio('sfx', [330, 440, 660, 880], 0.06, 'triangle', 0.065)
  }

  playStart() {
    this.duckMusic(900)
    this.arpeggio('sfx', [262, 392, 523, 784], 0.085, 'triangle', 0.075)
    window.setTimeout(() => this.noise('sfx', 0.08, 0.03), 220)
  }

  playLetter(letter: string, index: number) {
    const pitch = 520 + ((letter.charCodeAt(0) + index * 37) % 260)
    this.tone('sfx', pitch, 0.045, 'square', 0.035)
    this.noise('sfx', 0.025, 0.012)
  }

  playBacktrack() {
    this.tone('sfx', 220, 0.075, 'triangle', 0.04, 160)
  }

  playAccepted(avatar: number) {
    this.duckMusic()
    const base = AVATAR_BASES[avatar % AVATAR_BASES.length]
    this.arpeggio('sfx', [base, base * 1.25, base * 1.5, base * 2], 0.055, 'triangle', 0.06)
  }

  playOpponentFound(avatar: number) {
    this.duckMusic(360)
    const base = AVATAR_BASES[avatar % AVATAR_BASES.length]
    this.arpeggio('sfx', [base, base * 1.5], 0.055, 'sine', 0.035)
  }

  playRejected() {
    this.duckMusic(260)
    this.tone('sfx', 160, 0.12, 'sawtooth', 0.045, 92)
  }

  playGameEnd() {
    this.duckMusic(1300)
    this.tone('sfx', 196, 0.22, 'sawtooth', 0.075, 98)
    window.setTimeout(() => this.tone('sfx', 131, 0.28, 'square', 0.06, 82), 180)
    window.setTimeout(() => this.noise('sfx', 0.22, 0.035), 80)
  }

  playRevealWord(avatar: number, unique: boolean) {
    this.duckMusic(420)
    const base = AVATAR_BASES[avatar % AVATAR_BASES.length]
    this.arpeggio('sfx', unique ? [base, base * 1.5, base * 2] : [base, base * 1.25], 0.05, 'triangle', unique ? 0.052 : 0.038)
  }

  playPodium() {
    this.duckMusic(1400)
    this.arpeggio('sfx', [392, 523, 659, 784, 1046], 0.08, 'triangle', 0.075)
    window.setTimeout(() => this.noise('sfx', 0.12, 0.025), 260)
  }

  playReplay() {
    this.duckMusic(500)
    this.arpeggio('sfx', [523, 392, 523], 0.055, 'square', 0.045)
  }

  startMusic(endsAt?: number) {
    if (this.state.muted || this.musicTimer !== null || this.state.musicVolume <= 0) return
    this.musicEndsAt = endsAt ?? null
    this.musicStep = 0
    this.lastTickSecond = null
    this.musicTimer = window.setInterval(() => this.tickMusic(), 230)
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private tickMusic() {
    if (this.state.muted || this.state.musicVolume <= 0) return
    const remaining = this.musicEndsAt ? this.musicEndsAt - Date.now() : 99999
    const urgent = remaining < 10000
    const melody = urgent
      ? [523, 659, 784, 1046, 784, 659, 880, 1046]
      : [262, 330, 392, 523, 392, 330, 440, 392]
    const bass = urgent ? [131, 196, 165, 220] : [98, 131, 147, 131]
    const note = melody[this.musicStep % melody.length]
    const bassNote = bass[Math.floor(this.musicStep / 2) % bass.length]
    const duck = Date.now() < this.musicDuckUntil ? 0.42 : 1

    this.tone('music', note, urgent ? 0.095 : 0.08, 'triangle', (urgent ? 0.022 : 0.016) * duck)
    if (this.musicStep % 2 === 0) this.tone('music', bassNote, 0.12, 'sine', 0.014 * duck)
    if (this.musicStep % 4 === 2) this.noise('music', 0.035, 0.007 * duck)

    if (urgent) {
      const second = Math.ceil(Math.max(0, remaining) / 1000)
      if (second !== this.lastTickSecond && second <= 5) {
        this.lastTickSecond = second
        this.tone('sfx', 1100, 0.035, 'square', 0.028)
      }
    }
    this.musicStep += 1
  }

  private arpeggio(bus: Bus, notes: number[], duration: number, type: OscillatorType, gain: number) {
    notes.forEach((note, index) => {
      window.setTimeout(() => this.tone(bus, note, duration, type, gain), index * duration * 760)
    })
  }

  private tone(
    bus: Bus,
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    endFrequency?: number
  ) {
    if (this.state.muted) return
    const context = this.getContext()
    if (!context) return

    const volume = bus === 'music' ? this.state.musicVolume : this.state.sfxVolume
    if (volume <= 0) return

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration)
    }
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue * volume, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private noise(bus: Bus, duration: number, gainValue: number) {
    if (this.state.muted) return
    const context = this.getContext()
    if (!context) return

    const volume = bus === 'music' ? this.state.musicVolume : this.state.sfxVolume
    if (volume <= 0) return

    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = gainValue * volume
    source.buffer = buffer
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
  }

  private duckMusic(durationMs = 650) {
    this.musicDuckUntil = Math.max(this.musicDuckUntil, Date.now() + durationMs)
  }

  private emit() {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }

  private getContext() {
    if (typeof window === 'undefined') return null
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      this.context = new AudioContextCtor()
    }
    return this.context
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export const sound = new SoundManager()
