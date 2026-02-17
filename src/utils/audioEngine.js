/**
 * AudioEngine — manages two HTML Audio elements (music + voiceover)
 * and provides Web Audio API integration for export mixing.
 */
export default class AudioEngine {
  constructor() {
    this.musicEl = new Audio()
    this.voiceoverEl = new Audio()
    this.musicEl.preload = 'auto'
    this.voiceoverEl.preload = 'auto'

    this.musicMeta = null   // { url, startTime, endTime, volume }
    this.voiceoverMeta = null

    this.audioCtx = null
    this.musicSource = null
    this.voiceoverSource = null
    this.musicGain = null
    this.voiceoverGain = null
    this.destination = null

    this._playing = false
  }

  setMusic(url, volume, startTime, endTime) {
    if (this.musicMeta?.url !== url) {
      this.musicEl.src = url || ''
      this.musicEl.load()
    }
    this.musicMeta = url ? { url, startTime, endTime, volume } : null
    this.musicEl.volume = volume ?? 1
    if (this.musicGain) this.musicGain.gain.value = volume ?? 1
  }

  setVoiceover(url, volume, startTime, endTime) {
    if (this.voiceoverMeta?.url !== url) {
      this.voiceoverEl.src = url || ''
      this.voiceoverEl.load()
    }
    this.voiceoverMeta = url ? { url, startTime, endTime, volume } : null
    this.voiceoverEl.volume = volume ?? 1
    if (this.voiceoverGain) this.voiceoverGain.gain.value = volume ?? 1
  }

  setMusicVolume(v) {
    this.musicEl.volume = v
    if (this.musicMeta) this.musicMeta.volume = v
    if (this.musicGain) this.musicGain.gain.value = v
  }

  setVoiceoverVolume(v) {
    this.voiceoverEl.volume = v
    if (this.voiceoverMeta) this.voiceoverMeta.volume = v
    if (this.voiceoverGain) this.voiceoverGain.gain.value = v
  }

  sync(currentTime) {
    this._syncElement(this.musicEl, this.musicMeta, currentTime)
    this._syncElement(this.voiceoverEl, this.voiceoverMeta, currentTime)
  }

  _syncElement(el, meta, currentTime) {
    if (!meta || !meta.url) {
      if (!el.paused) el.pause()
      return
    }
    const { startTime, endTime } = meta
    if (currentTime >= startTime && currentTime <= endTime) {
      const offset = currentTime - startTime
      if (Math.abs(el.currentTime - offset) > 0.3) {
        el.currentTime = offset
      }
      if (this._playing && el.paused) {
        el.play().catch(() => {})
      }
    } else {
      if (!el.paused) el.pause()
    }
  }

  play() {
    this._playing = true
  }

  pause() {
    this._playing = false
    if (!this.musicEl.paused) this.musicEl.pause()
    if (!this.voiceoverEl.paused) this.voiceoverEl.pause()
  }

  /**
   * Returns a MediaStream containing mixed audio from both tracks.
   * Used during export to combine with the canvas video stream.
   */
  getAudioStream() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = this.audioCtx

    if (!this.destination) {
      this.destination = ctx.createMediaStreamDestination()
    }

    if (!this.musicSource && this.musicMeta?.url) {
      try {
        this.musicSource = ctx.createMediaElementSource(this.musicEl)
        this.musicGain = ctx.createGain()
        this.musicGain.gain.value = this.musicMeta?.volume ?? 1
        this.musicSource.connect(this.musicGain)
        this.musicGain.connect(this.destination)
        this.musicGain.connect(ctx.destination)
      } catch (e) {
        // Source already created for this element
      }
    }

    if (!this.voiceoverSource && this.voiceoverMeta?.url) {
      try {
        this.voiceoverSource = ctx.createMediaElementSource(this.voiceoverEl)
        this.voiceoverGain = ctx.createGain()
        this.voiceoverGain.gain.value = this.voiceoverMeta?.volume ?? 1
        this.voiceoverSource.connect(this.voiceoverGain)
        this.voiceoverGain.connect(this.destination)
        this.voiceoverGain.connect(ctx.destination)
      } catch (e) {
        // Source already created for this element
      }
    }

    return this.destination.stream
  }

  dispose() {
    this.pause()
    this.musicEl.src = ''
    this.voiceoverEl.src = ''
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this.musicSource = null
    this.voiceoverSource = null
    this.musicGain = null
    this.voiceoverGain = null
    this.destination = null
    this.musicMeta = null
    this.voiceoverMeta = null
  }
}
