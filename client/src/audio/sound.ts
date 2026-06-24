type SoundState = {
  muted: boolean
}

type Listener = (state: SoundState) => void
type Bus = 'music' | 'sfx'

const MUTED_KEY = 'grille-party:sound-muted'
const SOUND_BASE_URL = `${import.meta.env.BASE_URL}sounds/`
const MUSIC_VOLUME = 0.42
const SFX_VOLUME = 0.8
const AVATAR_SAMPLES = [
  'avatar-octopus.webm',
  'avatar-stars.webm',
  'avatar-wave.webm',
  'avatar-gaming.webm',
  'avatar-licorne.webm',
  'avatar-grenouille.webm',
  'avatar-arc-en-ciel.webm',
  'avatar-circus.webm',
]

class SoundManager {
  private context: AudioContext | null = null
  private state: SoundState = {
    muted: localStorage.getItem(MUTED_KEY) === '1',
  }
  private listeners = new Set<Listener>()
  private musicTimer: number | null = null
  private musicAudio: HTMLAudioElement | null = null
  private musicDuckTimer: number | null = null
  private musicEndsAt: number | null = null
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

  async unlock() {
    const context = this.getContext()
    if (!context) return
    if (context.state === 'suspended') await context.resume()
  }

  playUiClick() {
    this.tone('sfx', 620, 0.075, 'square', 0.32, 980)
    this.noise('sfx', 0.025, 0.06)
  }

  playSetting() {
    this.playUiClick()
  }

  playJoin() {
    this.playUiClick()
  }

  playStart() {
    this.playUiClick()
  }

  playLetter(letter: string, index: number) {
    const pitch = 520 + ((letter.charCodeAt(0) + index * 37) % 260)
    this.tone('sfx', pitch, 0.055, 'square', 0.22)
    this.noise('sfx', 0.02, 0.04)
  }

  playBacktrack() {
    this.tone('sfx', 220, 0.08, 'triangle', 0.18, 160)
  }

  playAccepted(avatar: number) {
    this.duckMusic()
    this.playAvatarSample(avatar)
  }

  playOpponentFound(avatar: number) {
    this.duckMusic(360)
    this.playAvatarSample(avatar, 0.45)
  }

  playRejected() {
    this.duckMusic(260)
    this.tone('sfx', 160, 0.12, 'sawtooth', 0.045, 92)
  }

  playGameEnd() {
    this.duckMusic(1300)
    this.playSample('end-game.webm', 'sfx')
  }

  playRevealWord(avatar: number, unique: boolean) {
    this.duckMusic(420)
    this.playAvatarSample(avatar, unique ? 0.78 : 0.52)
  }

  playPodium() {
    this.duckMusic(1400)
    this.playSample('success-jingle.webm', 'sfx')
  }

  playReplay() {
    this.duckMusic(500)
    this.playUiClick()
  }

  startMusic(endsAt?: number) {
    if (this.state.muted || this.musicTimer !== null) return
    this.musicEndsAt = endsAt ?? null
    this.lastTickSecond = null
    this.ensureMusicAudio()
    if (this.musicAudio) {
      this.musicAudio.currentTime = 0
      this.musicAudio.loop = true
      this.syncMusicVolume()
      void this.musicAudio.play().catch(() => undefined)
    }
    this.musicTimer = window.setInterval(() => this.tickMusic(), 180)
  }

  stopMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause()
      this.musicAudio.currentTime = 0
    }
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private tickMusic() {
    if (this.state.muted) return
    const remaining = this.musicEndsAt ? this.musicEndsAt - Date.now() : 99999
    if (remaining < 10000) {
      const second = Math.ceil(Math.max(0, remaining) / 1000)
      if (second !== this.lastTickSecond && second <= 5) {
        this.lastTickSecond = second
        this.tone('sfx', 1100, 0.035, 'square', 0.028)
      }
    }
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

    const volume = bus === 'music' ? MUSIC_VOLUME : SFX_VOLUME

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

    const volume = bus === 'music' ? MUSIC_VOLUME : SFX_VOLUME

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
    if (!this.musicAudio) return
    if (this.musicDuckTimer !== null) {
      window.clearTimeout(this.musicDuckTimer)
    }
    this.musicAudio.volume = MUSIC_VOLUME * 0.35
    this.musicDuckTimer = window.setTimeout(() => {
      this.syncMusicVolume()
      this.musicDuckTimer = null
    }, durationMs)
  }

  private playAvatarSample(avatar: number, volumeScale = 1) {
    const sample = AVATAR_SAMPLES[avatar % AVATAR_SAMPLES.length] ?? AVATAR_SAMPLES[0]
    this.playSample(sample, 'sfx', volumeScale)
  }

  private playSample(filename: string, bus: Bus, volumeScale = 1) {
    if (this.state.muted) return
    const volume = bus === 'music' ? MUSIC_VOLUME : SFX_VOLUME
    const audio = new Audio(`${SOUND_BASE_URL}${filename}`)
    audio.volume = Math.min(1, volume * volumeScale)
    void audio.play().catch(() => undefined)
  }

  private ensureMusicAudio() {
    if (this.musicAudio) return
    this.musicAudio = new Audio(`${SOUND_BASE_URL}game-music.webm`)
    this.musicAudio.preload = 'auto'
    this.musicAudio.loop = true
  }

  private syncMusicVolume() {
    if (this.musicAudio) this.musicAudio.volume = this.state.muted ? 0 : MUSIC_VOLUME
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
