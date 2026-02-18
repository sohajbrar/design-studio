import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import './App.css'
import './components/ControlsPanel.css'
import UploadPanel from './components/UploadPanel'
import PreviewScene from './components/PreviewScene'

import Header from './components/Header'
import ExportModal from './components/ExportModal'
import Timeline from './components/Timeline'
import AudioEngine from './utils/audioEngine'
import { MUSIC_LIBRARY, generateTrack } from './utils/musicLibrary'

const ANIMATION_PRESETS = [
  { id: 'showcase', name: 'Showcase' },
  { id: 'orbit', name: 'Orbit' },
  { id: 'flip', name: 'Flip' },
  { id: 'scroll', name: 'Scroll' },
  { id: 'sideBySide', name: 'Side by Side', bothOnly: true },
  { id: 'single', name: 'Single' },
  { id: 'slideLeft', name: 'Slide Left' },
  { id: 'slideRight', name: 'Slide Right' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideRightRotate', name: 'Right + Rotate' },
  { id: 'slideLeftRotate', name: 'Left + Rotate' },
  { id: 'zoomBottomLeft', name: 'Zoom BL' },
  { id: 'zoomTopRight', name: 'Zoom TR' },
  { id: 'laptopOpen', name: 'Laptop Open', macbookOnly: true },
  { id: 'laptopClose', name: 'Laptop Close', macbookOnly: true },
]

const OUTRO_PRESETS = [
  { id: 'none', name: 'None' },
  { id: 'slideLeft', name: 'Slide Left' },
  { id: 'slideRight', name: 'Slide Right' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideLeftRotate', name: 'Left + Rotate' },
  { id: 'slideRightRotate', name: 'Right + Rotate' },
  { id: 'zoomOut', name: 'Zoom Out' },
  { id: 'flip', name: 'Flip' },
]

const ANIM_ICONS = {
  showcase: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="8" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 24c0-8 14-14 28-6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"/>
      <path d="M24 38v4M20 42h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M13 18l3 2-3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M35 26l-3 2 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  ),
  orbit: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="18" y="12" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="24" cy="23" rx="18" ry="8" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.35"/>
      <circle cx="42" cy="23" r="2" fill="currentColor" opacity="0.5"/>
      <path d="M40 20l2 3 2-1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  flip: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="10" y="12" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="26" y="10" width="12" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 10l10-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M16 36l10 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M22 20l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  scroll: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="6" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="20" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="20" y1="18" x2="26" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="20" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <path d="M24 36v8M21 41l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  sideBySide: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="12" width="14" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="28" y="12" width="14" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M22 24h4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.3"/>
    </svg>
  ),
  single: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="14" y="8" width="20" height="32" rx="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.25"/>
      <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle cx="24" cy="24" r="1" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  slideLeft: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="22" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M40 24h-8M34 20l-4 4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideRight: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="26" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="10" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 24h8M14 20l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideDown: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="2" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="16" y="16" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 44v-6M20 40l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideUp: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="20" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="16" y="6" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 4v6M20 8l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideRightRotate: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="10" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(-15 18 24)"/>
      <path d="M8 24h8M14 20l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M34 14a8 8 0 0 1 0 16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M34 30l-2-3h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  slideLeftRotate: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="22" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(15 30 24)"/>
      <path d="M40 24h-8M34 20l-4 4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M14 14a8 8 0 0 0 0 16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M14 30l2-3h-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  none: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="17" y1="17" x2="31" y2="31" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
    </svg>
  ),
  zoomOut: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="8" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="20" y="14" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.25"/>
      <path d="M14 8l-4-4M34 8l4-4M14 36l-4 4M34 36l4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  zoomBottomLeft: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="4" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(-12 16 20)"/>
      <circle cx="12" cy="32" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M14 30l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 34l-2 0 0-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M30 10l6-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
      <path d="M32 16l6 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
    </svg>
  ),
  zoomTopRight: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="22" y="12" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(12 32 28)"/>
      <circle cx="38" cy="16" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M36 18l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <path d="M40 14l2 0 0 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M18 38l-6 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
      <path d="M16 32l-6 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
    </svg>
  ),
  laptopOpen: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="8" y="30" width="32" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.25" transform="rotate(-70 24 28)"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M20 18l4-3v6l-4-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M30 12a6 6 0 0 1 0 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    </svg>
  ),
  laptopClose: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="8" y="30" width="32" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.25" transform="rotate(-70 24 28)"/>
      <path d="M28 18l-4 3v-6l4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M14 12a6 6 0 0 0 0 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    </svg>
  ),
}

const FONT_OPTIONS = [
  { name: 'Inter' },
  { name: 'Roboto' },
  { name: 'Poppins' },
  { name: 'Montserrat' },
  { name: 'Playfair Display' },
  { name: 'Space Grotesk' },
]

const TEXT_ANIMATIONS = [
  { id: 'none', name: 'None' },
  { id: 'slideFromRight', name: 'From Right' },
  { id: 'slideFromLeft', name: 'From Left' },
  { id: 'slideFromBottom', name: 'From Bottom' },
  { id: 'slideFromTop', name: 'From Top' },
]

const DEVICE_TYPES = ['iphone', 'android', 'both']

function findNonOverlappingSlot(existing, desiredStart, duration, maxTime) {
  const sorted = existing
    .map((e) => ({ s: e.startTime, e: e.endTime }))
    .sort((a, b) => a.s - b.s)
  const tryFit = (s) => {
    const e = s + duration
    if (e > maxTime) return null
    const overlaps = sorted.some((o) => s < o.e && e > o.s)
    if (!overlaps) return { start: s, end: e }
    return null
  }
  const fit = tryFit(desiredStart)
  if (fit) return fit
  for (const block of sorted) {
    const fit2 = tryFit(block.e)
    if (fit2) return fit2
  }
  return tryFit(0)
}

function recalcStartTimes(clips) {
  let time = 0
  return clips.map((clip) => {
    const updated = { ...clip, startTime: time }
    time += clip.duration
    return updated
  })
}

function getVideoDuration(url) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve(video.duration && isFinite(video.duration) ? video.duration : 5)
    }
    video.onerror = () => resolve(5)
    video.src = url
  })
}

function App() {
  const [screens, setScreens] = useState([])
  const [deviceType, setDeviceType] = useState('iphone')
  const [animation, setAnimation] = useState('showcase')
  const [bgColor, setBgColor] = useState('#161717')
  const [bgGradient, setBgGradient] = useState(false)
  const [showBase, setShowBase] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [quality, setQuality] = useState('1080p')
  const [sidebarTab, setSidebarTab] = useState('animations')
  const canvasRef = useRef(null)
  const recorderRef = useRef(null)

  // ── Timeline state ───────────────────────────────
  const [timelineClips, setTimelineClips] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [zoomEffects, setZoomEffects] = useState([])
  const [textOverlays, setTextOverlays] = useState([])
  const [selectedTextId, setSelectedTextId] = useState(null)

  // ── Audio state ─────────────────────────────────
  const [musicTrack, setMusicTrack] = useState(null)
  const [voiceoverTrack, setVoiceoverTrack] = useState(null)
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null)
  const [previewingTrackId, setPreviewingTrackId] = useState(null)
  const audioEngineRef = useRef(null)
  const previewAudioRef = useRef(null)

  // Initialize audio engine once
  useEffect(() => {
    audioEngineRef.current = new AudioEngine()
    return () => {
      if (audioEngineRef.current) audioEngineRef.current.dispose()
    }
  }, [])

  // ── Derived values ───────────────────────────────
  const totalDuration = useMemo(
    () => timelineClips.reduce((sum, c) => sum + c.duration, 0),
    [timelineClips]
  )

  const activeClip = useMemo(() => {
    if (timelineClips.length === 0) return null
    return (
      timelineClips.find(
        (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
      ) || timelineClips[timelineClips.length - 1]
    )
  }, [timelineClips, currentTime])

  const activeScreen = useMemo(() => {
    if (!activeClip) return screens[0] || null
    return screens.find((s) => s.id === activeClip.screenId) || null
  }, [activeClip, screens])

  const activeZoomLevel = useMemo(() => {
    for (const effect of zoomEffects) {
      if (currentTime >= effect.startTime && currentTime <= effect.endTime) {
        return effect.zoomLevel
      }
    }
    return 1
  }, [zoomEffects, currentTime])

  const activeAnimation = useMemo(() => {
    if (activeClip && activeClip.animation) return activeClip.animation
    return animation
  }, [activeClip, animation])

  const activeOutroAnimation = useMemo(() => {
    if (activeClip && activeClip.outroAnimation) return activeClip.outroAnimation
    return 'none'
  }, [activeClip])

  const activeClipDuration = useMemo(() => {
    if (activeClip) return activeClip.duration
    return 0
  }, [activeClip])

  const videoSeekTime = useMemo(() => {
    if (!activeClip || !activeScreen?.isVideo) return 0
    return currentTime - activeClip.startTime + activeClip.trimStart
  }, [activeClip, activeScreen, currentTime])

  const clipAnimationTime = useMemo(() => {
    if (!activeClip) return currentTime
    return currentTime - activeClip.startTime
  }, [activeClip, currentTime])

  const activeTextAnim = useMemo(() => {
    if (!textOverlays || textOverlays.length === 0) return 'none'
    const active = textOverlays.find(
      (t) => t.startTime != null && t.endTime != null && currentTime >= t.startTime && currentTime <= t.endTime
    )
    return active ? (active.animation || 'none') : 'none'
  }, [textOverlays, currentTime])

  // ── Sync audio engine when tracks change ─────────
  useEffect(() => {
    const ae = audioEngineRef.current
    if (!ae) return
    if (musicTrack) {
      ae.setMusic(musicTrack.url, musicTrack.volume, musicTrack.startTime, musicTrack.endTime)
    } else {
      ae.setMusic(null, 1, 0, 0)
    }
  }, [musicTrack])

  useEffect(() => {
    const ae = audioEngineRef.current
    if (!ae) return
    if (voiceoverTrack) {
      ae.setVoiceover(voiceoverTrack.url, voiceoverTrack.volume, voiceoverTrack.startTime, voiceoverTrack.endTime)
    } else {
      ae.setVoiceover(null, 1, 0, 0)
    }
  }, [voiceoverTrack])

  // ── Sync audio when scrubbing while paused ───────
  useEffect(() => {
    const ae = audioEngineRef.current
    if (ae && !isTimelinePlaying) {
      ae.sync(currentTime)
    }
  }, [currentTime, isTimelinePlaying])

  // ── Unified play/pause toggle ───────────────────
  const togglePlayback = useCallback(() => {
    setIsTimelinePlaying((prev) => {
      if (!prev && currentTime >= totalDuration) {
        setCurrentTime(0)
      }
      const next = !prev
      setIsPlaying(next)
      const ae = audioEngineRef.current
      if (ae) {
        if (next) { ae.play(); ae.sync(currentTime) }
        else ae.pause()
      }
      return next
    })
  }, [currentTime, totalDuration])

  // ── Space key handler for play/pause ─────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      if (e.code === 'Space' && screens.length > 0) {
        e.preventDefault()
        togglePlayback()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screens.length, togglePlayback])

  // ── Timeline playback loop ───────────────────────
  const rafRef = useRef(null)
  const lastFrameRef = useRef(null)

  useEffect(() => {
    if (!isTimelinePlaying || totalDuration === 0) {
      lastFrameRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const ae = audioEngineRef.current
      if (ae) ae.pause()
      return
    }

    const ae = audioEngineRef.current
    if (ae) { ae.play(); ae.sync(currentTime) }

    const animate = (timestamp) => {
      if (lastFrameRef.current !== null) {
        const delta = (timestamp - lastFrameRef.current) / 1000
        setCurrentTime((prev) => {
          const next = prev + delta
          if (next >= totalDuration) {
            setIsTimelinePlaying(false)
            setIsPlaying(false)
            if (ae) ae.pause()
            return totalDuration
          }
          if (ae) ae.sync(next)
          return next
        })
      }
      lastFrameRef.current = timestamp
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = null
    }
  }, [isTimelinePlaying, totalDuration])

  // ── Upload handler (creates clips immediately, updates video durations async) ─
  const handleUpload = useCallback((files) => {
    const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.mkv', '.m4v']
    const newScreens = Array.from(files).map((file) => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      const isVideo = file.type.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)
      return {
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        isVideo,
      }
    })

    const newClips = newScreens.map((screen) => ({
      id: crypto.randomUUID(),
      screenId: screen.id,
      startTime: 0,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      effects: [],
      animation: 'showcase',
      outroAnimation: 'none',
    }))

    setScreens((prev) => [...prev, ...newScreens])
    setTimelineClips((prev) => recalcStartTimes([...prev, ...newClips]))

    // For videos, update duration asynchronously once metadata loads
    newScreens.forEach((screen, i) => {
      if (screen.isVideo) {
        getVideoDuration(screen.url).then((dur) => {
          const clipId = newClips[i].id
          setTimelineClips((prev) =>
            recalcStartTimes(
              prev.map((c) =>
                c.id === clipId ? { ...c, duration: dur, trimEnd: dur } : c
              )
            )
          )
        })
      }
    })
  }, [])

  const handleRemoveScreen = useCallback((id) => {
    setScreens((prev) => {
      const screen = prev.find((s) => s.id === id)
      if (screen) URL.revokeObjectURL(screen.url)
      return prev.filter((s) => s.id !== id)
    })
    setTimelineClips((prev) => recalcStartTimes(prev.filter((c) => c.screenId !== id)))
    setSelectedClipId(null)
  }, [])

  const handleReorderScreens = useCallback((fromIndex, toIndex) => {
    setScreens((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }, [])

  // ── Timeline operations ──────────────────────────
  const handleUpdateClip = useCallback((clipId, updates) => {
    setTimelineClips((prev) => {
      const updated = prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
      return recalcStartTimes(updated)
    })
  }, [])

  const handleReorderClips = useCallback((fromIndex, toIndex) => {
    setTimelineClips((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return recalcStartTimes(updated)
    })
  }, [])

  const handleSplitClip = useCallback((clipId, splitTime) => {
    setTimelineClips((prev) => {
      const idx = prev.findIndex((c) => c.id === clipId)
      if (idx === -1) return prev
      const clip = prev[idx]
      const offsetInClip = splitTime - clip.startTime
      if (offsetInClip <= 0.1 || offsetInClip >= clip.duration - 0.1) return prev

      const clip1 = {
        ...clip,
        id: crypto.randomUUID(),
        duration: offsetInClip,
        trimEnd: clip.trimStart + offsetInClip,
        effects: [],
      }

      const clip2 = {
        ...clip,
        id: crypto.randomUUID(),
        duration: clip.duration - offsetInClip,
        trimStart: clip.trimStart + offsetInClip,
        effects: [],
      }

      const updated = [...prev]
      updated.splice(idx, 1, clip1, clip2)
      return recalcStartTimes(updated)
    })
  }, [])

  const handleAddZoomEffect = useCallback((atTime) => {
    const t = typeof atTime === 'number' && isFinite(atTime) ? atTime : currentTime
    setZoomEffects((prev) => {
      const maxT = totalDuration || 6
      const desired = { start: Math.max(0, t), end: Math.min(maxT, t + 1) }
      const placed = findNonOverlappingSlot(prev, desired.start, desired.end - desired.start, maxT)
      if (!placed) return prev
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          startTime: placed.start,
          endTime: placed.end,
          zoomLevel: 2,
        },
      ]
    })
  }, [currentTime, totalDuration])

  const handleUpdateZoomEffect = useCallback((effectId, updates) => {
    setZoomEffects((prev) => {
      return prev.map((e) => {
        if (e.id !== effectId) return e
        const updated = { ...e, ...updates }
        const others = prev.filter((o) => o.id !== effectId)
        const hasOverlap = others.some(
          (o) => updated.startTime < o.endTime && updated.endTime > o.startTime
        )
        return hasOverlap ? e : updated
      })
    })
  }, [])

  const handleRemoveZoomEffect = useCallback((effectId) => {
    setZoomEffects((prev) => prev.filter((e) => e.id !== effectId))
  }, [])

  // ── Text overlay operations ─────────────────────
  const handleAddText = useCallback((atTime) => {
    const t = typeof atTime === 'number' && isFinite(atTime) ? atTime : currentTime
    setTextOverlays((prev) => {
      const dur = 2
      const maxT = totalDuration || 6
      const desired = { start: Math.max(0, t), end: Math.min(maxT, t + dur) }
      const placed = findNonOverlappingSlot(
        prev.map((t) => ({ startTime: t.startTime, endTime: t.endTime })),
        desired.start,
        desired.end - desired.start,
        maxT
      )
      if (!placed) return prev
      const newText = {
        id: crypto.randomUUID(),
        text: 'Your text here',
        fontFamily: 'Inter',
        fontSize: 48,
        color: '#ffffff',
        animation: 'none',
        posY: 0,
        startTime: placed.start,
        endTime: placed.end,
      }
      setSelectedTextId(newText.id)
      return [...prev, newText]
    })
  }, [currentTime, totalDuration])

  const handleUpdateText = useCallback((textId, updates) => {
    setTextOverlays((prev) =>
      prev.map((t) => {
        if (t.id !== textId) return t
        const updated = { ...t, ...updates }
        if (updates.startTime != null || updates.endTime != null) {
          const others = prev.filter((o) => o.id !== textId)
          const hasOverlap = others.some(
            (o) => updated.startTime < o.endTime && updated.endTime > o.startTime
          )
          if (hasOverlap) return t
        }
        return updated
      })
    )
  }, [])

  const handleRemoveText = useCallback((textId) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== textId))
    setSelectedTextId((prev) => (prev === textId ? null : prev))
  }, [])

  const handleRemoveClip = useCallback((clipId) => {
    setTimelineClips((prev) => recalcStartTimes(prev.filter((c) => c.id !== clipId)))
    setSelectedClipId((prev) => (prev === clipId ? null : prev))
  }, [])

  // ── Audio track operations ─────────────────────
  const getAudioDuration = useCallback((source) => {
    return new Promise((resolve) => {
      const audio = new Audio()
      const timeout = setTimeout(() => resolve(30), 10000)
      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout)
        resolve(audio.duration)
      })
      audio.addEventListener('error', () => {
        clearTimeout(timeout)
        resolve(30)
      })
      if (typeof source === 'string') {
        audio.src = source
      } else {
        audio.src = URL.createObjectURL(source)
      }
    })
  }, [])

  const [loadingTrackId, setLoadingTrackId] = useState(null)

  const handleSetMusic = useCallback(async (source) => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    setPreviewingTrackId(null)
    let url, name, file = null, isLibrary = false, audioDuration = 30
    if (source.file) {
      file = source.file
      url = URL.createObjectURL(file)
      name = file.name
      audioDuration = await getAudioDuration(file)
    } else {
      setLoadingTrackId(source.libraryId)
      url = generateTrack(source.libraryId)
      name = source.name
      isLibrary = true
      audioDuration = await getAudioDuration(url)
      setLoadingTrackId(null)
    }
    const maxT = totalDuration || audioDuration
    const endTime = Math.min(audioDuration, maxT)
    setMusicTrack({
      id: crypto.randomUUID(),
      name,
      url,
      file,
      startTime: 0,
      endTime,
      volume: 0.5,
      isLibrary,
    })
  }, [totalDuration, getAudioDuration])

  const handleSetVoiceover = useCallback(async (file) => {
    const url = URL.createObjectURL(file)
    const audioDuration = await getAudioDuration(file)
    const maxT = totalDuration || 30
    const endTime = Math.min(audioDuration, maxT)
    setVoiceoverTrack({
      id: crypto.randomUUID(),
      name: file.name,
      url,
      file,
      startTime: 0,
      endTime,
      volume: 0.8,
      isLibrary: false,
    })
  }, [totalDuration, getAudioDuration])

  const handleRemoveMusic = useCallback(() => {
    if (musicTrack?.url && !musicTrack.isLibrary) URL.revokeObjectURL(musicTrack.url)
    setMusicTrack(null)
    setSelectedAudioTrack((prev) => prev === 'music' ? null : prev)
  }, [musicTrack])

  const handleRemoveVoiceover = useCallback(() => {
    if (voiceoverTrack?.url) URL.revokeObjectURL(voiceoverTrack.url)
    setVoiceoverTrack(null)
    setSelectedAudioTrack((prev) => prev === 'voiceover' ? null : prev)
  }, [voiceoverTrack])

  const handleUpdateMusic = useCallback((updates) => {
    setMusicTrack((prev) => prev ? { ...prev, ...updates } : null)
  }, [])

  const handleUpdateVoiceover = useCallback((updates) => {
    setVoiceoverTrack((prev) => prev ? { ...prev, ...updates } : null)
  }, [])

  const handlePreviewLibraryTrack = useCallback((trackId) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    if (previewingTrackId === trackId) {
      setPreviewingTrackId(null)
      return
    }
    setPreviewingTrackId(trackId)
    const url = generateTrack(trackId)
    const audio = new Audio(url)
    audio.volume = 0.5
    audio.play().catch(() => {
      setPreviewingTrackId(null)
    })
    audio.addEventListener('ended', () => setPreviewingTrackId(null))
    previewAudioRef.current = audio
  }, [previewingTrackId])

  // ── Export / recording ───────────────────────────
  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return
    setShowExport(true)
  }, [])

  const [convertingToMp4, setConvertingToMp4] = useState(false)

  const convertWebmToMp4 = useCallback(async (webmBlob) => {
    setConvertingToMp4(true)
    try {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      })

      const webmData = await fetchFile(webmBlob)
      await ffmpeg.writeFile('input.webm', webmData)
      await ffmpeg.exec([
        '-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4',
      ])
      const mp4Data = await ffmpeg.readFile('output.mp4')
      const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' })

      const url = URL.createObjectURL(mp4Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockup-demo-${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(url)
      ffmpeg.terminate()
    } catch (err) {
      console.error('MP4 conversion failed, falling back to WebM:', err)
      const url = URL.createObjectURL(webmBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockup-demo-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setConvertingToMp4(false)
    }
  }, [])

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.warn('Canvas element not available for recording')
      return
    }

    const recordDuration = totalDuration > 0 ? totalDuration : 6
    if (totalDuration > 0) {
      setCurrentTime(0)
      setIsTimelinePlaying(true)
    }

    const videoStream = canvas.captureStream(60)
    let stream = videoStream

    const ae = audioEngineRef.current
    const hasAudio = ae && (musicTrack || voiceoverTrack)
    if (hasAudio) {
      try {
        const audioStream = ae.getAudioStream()
        stream = new MediaStream([
          ...videoStream.getTracks(),
          ...audioStream.getTracks(),
        ])
      } catch (err) {
        console.warn('Could not attach audio to recording:', err)
      }
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: quality === '4k' ? 20000000 : quality === '1080p' ? 8000000 : 4000000,
    })

    const chunks = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const webmBlob = new Blob(chunks, { type: 'video/webm' })
      setIsRecording(false)

      const webmUrl = URL.createObjectURL(webmBlob)
      const a = document.createElement('a')
      a.href = webmUrl
      a.download = `mockup-demo-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(webmUrl)

      setIsPlaying(false)
      setIsTimelinePlaying(false)
    }

    recorderRef.current = mediaRecorder
    setIsRecording(true)
    setIsPlaying(true)
    mediaRecorder.start()

    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, recordDuration * 1000)
  }, [quality, convertWebmToMp4, totalDuration])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const hasScreens = screens.length > 0

  return (
    <div className="app">
      <Header>
        {hasScreens && !convertingToMp4 && (
          <>
            <button
              className="btn btn-header btn-secondary"
              onClick={togglePlayback}
            >
              {isTimelinePlaying ? '⏸ Pause' : '▶ Preview'}
            </button>
            <button
              className={`btn btn-header btn-primary ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!hasScreens}
            >
              {isRecording ? '⏹ Stop Recording' : '⏺ Record & Export'}
            </button>
          </>
        )}
        {hasScreens && convertingToMp4 && (
          <div className="btn btn-header btn-converting">
            Converting to MP4...
          </div>
        )}
      </Header>
      <main className="main-layout">
        {!hasScreens ? (
          <UploadPanel onUpload={handleUpload} fullPage />
        ) : (
          <>
            <aside className="sidebar">
              <nav className="sidebar-tabs">
                {[
                  { id: 'media', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )},
                  { id: 'animations', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="7" rx="9" ry="3.5" opacity="0.4" />
                      <ellipse cx="12" cy="12" rx="9" ry="3.5" opacity="0.7" />
                      <ellipse cx="12" cy="17" rx="9" ry="3.5" />
                    </svg>
                  )},
                  { id: 'text', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9.5" y1="20" x2="14.5" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  )},
                  { id: 'audio', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  )},
                  { id: 'device', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                  )},
                  { id: 'background', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  )},
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
                    onClick={() => setSidebarTab(tab.id)}
                    title={tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
                  >
                    {tab.icon}
                    <span className="sidebar-tab-label">{tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}</span>
                  </button>
                ))}
              </nav>
              <div className="sidebar-content">
                {sidebarTab === 'media' && (
                  <>
                    <UploadPanel onUpload={handleUpload} compact />
                    <div className="screen-list">
                      <h3 className="section-title">Screens ({screens.length})</h3>
                      {screens.map((screen, index) => (
                        <div key={screen.id} className="screen-thumb">
                          {screen.isVideo ? (
                            <video src={screen.url} muted className="screen-thumb-video" />
                          ) : (
                            <img src={screen.url} alt={screen.name} />
                          )}
                          <div className="screen-thumb-info">
                            <span className="screen-thumb-name">{screen.name}</span>
                            <span className="screen-thumb-index">
                              {screen.isVideo ? 'Video' : `Screen ${index + 1}`}
                            </span>
                          </div>
                          <button
                            className="screen-thumb-remove"
                            onClick={() => handleRemoveScreen(screen.id)}
                            aria-label="Remove screen"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {sidebarTab === 'text' && (() => {
                  const selectedText = textOverlays.find((t) => t.id === selectedTextId)
                  return (
                    <div className="controls-panel">
                      <div className="control-group">
                        <h3 className="section-title">Text Overlays</h3>
                        <div className="text-add-wrap">
                          <button className="btn-add-text" onClick={handleAddText}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Text
                          </button>
                        </div>
                        {textOverlays.length === 0 && (
                          <p className="anim-hint">Add text overlays to your video</p>
                        )}
                        <div className="text-list">
                          {textOverlays.map((overlay) => (
                            <div
                              key={overlay.id}
                              className={`text-item ${selectedTextId === overlay.id ? 'active' : ''}`}
                              onClick={() => setSelectedTextId(overlay.id)}
                            >
                              <span className="text-item-preview">{overlay.text || 'Empty'}</span>
                              <button
                                className="text-item-remove"
                                onClick={(e) => { e.stopPropagation(); handleRemoveText(overlay.id) }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedText && (
                        <div className="control-group">
                          <h3 className="section-title">Edit</h3>
                          <div className="text-editor">
                            <div className="te-row">
                              <input
                                type="text"
                                className="te-input"
                                value={selectedText.text}
                                onChange={(e) => handleUpdateText(selectedText.id, { text: e.target.value })}
                                placeholder="Enter text..."
                              />
                            </div>
                            <div className="te-row">
                              <label className="control-label">Font</label>
                              <select
                                className="te-select"
                                value={selectedText.fontFamily}
                                onChange={(e) => {
                                  const font = FONT_OPTIONS.find((f) => f.name === e.target.value)
                                  handleUpdateText(selectedText.id, { fontFamily: font.name })
                                }}
                              >
                                {FONT_OPTIONS.map((f) => (
                                  <option key={f.name} value={f.name}>{f.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Size</label>
                              <div className="te-size-wrap">
                                <input
                                  type="range"
                                  min="16"
                                  max="120"
                                  step="1"
                                  value={selectedText.fontSize}
                                  onChange={(e) => handleUpdateText(selectedText.id, { fontSize: parseInt(e.target.value) })}
                                  className="te-slider"
                                />
                                <span className="te-size-val">{selectedText.fontSize}px</span>
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Color</label>
                              <div className="color-picker-wrap">
                                <input
                                  type="color"
                                  value={selectedText.color}
                                  onChange={(e) => handleUpdateText(selectedText.id, { color: e.target.value })}
                                  className="color-input"
                                />
                                <input
                                  type="text"
                                  className="color-value color-value-edit"
                                  value={selectedText.color}
                                  onChange={(e) => {
                                    let v = e.target.value
                                    if (!v.startsWith('#')) v = '#' + v
                                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleUpdateText(selectedText.id, { color: v })
                                  }}
                                  onBlur={(e) => {
                                    let v = e.target.value
                                    if (/^#[0-9a-fA-F]{6}$/.test(v)) handleUpdateText(selectedText.id, { color: v })
                                  }}
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Position</label>
                              <div className="control-chips">
                                {[
                                  { val: 0.45, label: 'Top' },
                                  { val: 0, label: 'Center' },
                                  { val: -0.45, label: 'Bottom' },
                                ].map((pos) => (
                                  <button
                                    key={pos.val}
                                    className={`chip small ${selectedText.posY === pos.val ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { posY: pos.val })}
                                  >
                                    {pos.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="te-row-col">
                              <label className="control-label">Animation</label>
                              <div className="text-anim-options">
                                {TEXT_ANIMATIONS.map((anim) => (
                                  <button
                                    key={anim.id}
                                    className={`text-anim-btn ${selectedText.animation === anim.id ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { animation: anim.id })}
                                  >
                                    {anim.id === 'none' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="8" opacity="0.4" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromRight' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 5 5 12 12 19" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromLeft' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromBottom' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromTop' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {sidebarTab === 'device' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">Device Type</h3>
                      <div className="animation-grid">
                        {[
                          { id: 'iphone', label: 'iPhone', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="14" y="6" width="20" height="36" rx="3" />
                              <line x1="21" y1="10" x2="27" y2="10" opacity="0.5" />
                              <circle cx="24" cy="37" r="1" fill="currentColor" opacity="0.3" />
                            </svg>
                          )},
                          { id: 'android', label: 'Android', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="14" y="6" width="20" height="36" rx="2.5" />
                              <circle cx="24" cy="10" r="1" fill="currentColor" opacity="0.4" />
                            </svg>
                          )},
                          { id: 'ipad', label: 'iPad', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="10" y="8" width="28" height="32" rx="3" />
                              <circle cx="24" cy="11" r="0.8" fill="currentColor" opacity="0.3" />
                            </svg>
                          )},
                          { id: 'macbook', label: 'MacBook', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="10" y="10" width="28" height="20" rx="2" />
                              <path d="M6 30 L42 30 L40 34 L8 34 Z" />
                            </svg>
                          )},
                          { id: 'both', label: 'Both', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="8" y="8" width="16" height="28" rx="2.5" />
                              <line x1="14" y1="11" x2="18" y2="11" opacity="0.5" />
                              <rect x="28" y="8" width="16" height="28" rx="2" />
                              <circle cx="36" cy="11" r="0.8" fill="currentColor" opacity="0.4" />
                            </svg>
                          )},
                        ].map((d) => (
                          <button
                            key={d.id}
                            className={`animation-tile ${deviceType === d.id ? 'active' : ''}`}
                            onClick={() => setDeviceType(d.id)}
                          >
                            <div className="animation-tile-icon">{d.icon}</div>
                            <span className="animation-tile-name">{d.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="control-group">
                      <h3 className="section-title">Export</h3>
                      <div className="control-row">
                        <label className="control-label">Quality</label>
                        <div className="control-chips">
                          {['720p', '1080p', '4k'].map((q) => (
                            <button
                              key={q}
                              className={`chip small ${quality === q ? 'active' : ''}`}
                              onClick={() => setQuality(q)}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {sidebarTab === 'animations' && (() => {
                  const selClip = timelineClips.find((c) => c.id === selectedClipId)
                  const targetClip = selClip || activeClip
                  const currentAnim = targetClip ? targetClip.animation : animation
                  const currentOutro = targetClip ? (targetClip.outroAnimation || 'none') : 'none'
                  return (
                    <div className="controls-panel">
                      <div className="control-group">
                        <h3 className="section-title">
                          {selClip ? `Intro — ${screens.find((s) => s.id === selClip.screenId)?.name || 'Clip'}` : 'Intro Animation'}
                        </h3>
                        {!selClip && timelineClips.length > 1 && (
                          <p className="anim-hint">Select a clip in the timeline to set a different animation per clip</p>
                        )}
                        <div className="animation-grid">
                          {ANIMATION_PRESETS.filter((preset) => {
                            if (preset.macbookOnly) return deviceType === 'macbook'
                            if (preset.bothOnly) return deviceType === 'both'
                            return !preset.macbookOnly
                          }).map((preset) => (
                            <button
                              key={preset.id}
                              className={`animation-tile ${currentAnim === preset.id ? 'active' : ''}`}
                              onClick={() => {
                                const clip = selClip || activeClip
                                if (clip) {
                                  handleUpdateClip(clip.id, { animation: preset.id })
                                  setCurrentTime(clip.startTime)
                                }
                                setAnimation(preset.id)
                                setIsPlaying(true)
                                setIsTimelinePlaying(true)
                              }}
                            >
                              <div className="animation-tile-icon">
                                {ANIM_ICONS[preset.id]}
                              </div>
                              <span className="animation-tile-name">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="control-group">
                        <h3 className="section-title">Exit Animation</h3>
                        <p className="anim-hint">Plays during the last 1.8s of the clip</p>
                        <div className="animation-grid">
                          {OUTRO_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              className={`animation-tile ${currentOutro === preset.id ? 'active' : ''}`}
                              onClick={() => {
                                const clip = selClip || activeClip
                                if (clip) {
                                  handleUpdateClip(clip.id, { outroAnimation: preset.id })
                                  if (preset.id !== 'none') {
                                    setCurrentTime(Math.max(0, clip.startTime + clip.duration - 1.8))
                                  }
                                }
                                setIsPlaying(true)
                                setIsTimelinePlaying(true)
                              }}
                            >
                              <div className="animation-tile-icon">
                                {ANIM_ICONS[preset.id] || (
                                  <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
                                    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                                  </svg>
                                )}
                              </div>
                              <span className="animation-tile-name">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {sidebarTab === 'audio' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">Background Music</h3>
                      {musicTrack ? (
                        <div className="audio-active-track">
                          <div className="audio-track-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                            <span className="audio-track-name">{musicTrack.name}</span>
                            <button className="audio-track-remove" onClick={handleRemoveMusic} title="Remove">×</button>
                          </div>
                          <div className="audio-volume-row">
                            <label className="control-label-sm">Volume</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={musicTrack.volume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                handleUpdateMusic({ volume: v })
                                if (audioEngineRef.current) audioEngineRef.current.setMusicVolume(v)
                              }}
                              className="volume-slider"
                            />
                            <span className="volume-val">{Math.round(musicTrack.volume * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="music-library-grid">
                            {MUSIC_LIBRARY.map((track) => {
                              const isLoading = loadingTrackId === track.id
                              const isPreviewing = previewingTrackId === track.id
                              return (
                                <div
                                  key={track.id}
                                  className={`music-card ${isLoading ? 'loading' : ''}`}
                                >
                                  <div className="music-card-info">
                                    <span className="music-card-name">{track.name}</span>
                                  </div>
                                  <div className="music-card-actions">
                                    <button
                                      className={`music-card-preview ${isPreviewing ? 'playing' : ''}`}
                                      onClick={() => handlePreviewLibraryTrack(track.id)}
                                      disabled={isLoading && !isPreviewing}
                                      title={isPreviewing ? 'Stop' : 'Preview'}
                                    >
                                      {isLoading && !isPreviewing ? (
                                        <span className="music-card-spinner" />
                                      ) : isPreviewing ? '⏹' : '▶'}
                                    </button>
                                    <button
                                      className="music-card-select"
                                      onClick={() => handleSetMusic({ libraryId: track.id, name: track.name })}
                                      disabled={isLoading}
                                    >
                                      {isLoading ? '...' : 'Use'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="audio-upload-section">
                            <span className="audio-or-label">or upload your own</span>
                            <label className="btn-audio-upload">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Upload Music
                              <input
                                type="file"
                                accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files[0]) handleSetMusic({ file: e.target.files[0] })
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="control-group">
                      <h3 className="section-title">Voiceover</h3>
                      {voiceoverTrack ? (
                        <div className="audio-active-track">
                          <div className="audio-track-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span className="audio-track-name">{voiceoverTrack.name}</span>
                            <button className="audio-track-remove" onClick={handleRemoveVoiceover} title="Remove">×</button>
                          </div>
                          <div className="audio-volume-row">
                            <label className="control-label-sm">Volume</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={voiceoverTrack.volume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                handleUpdateVoiceover({ volume: v })
                                if (audioEngineRef.current) audioEngineRef.current.setVoiceoverVolume(v)
                              }}
                              className="volume-slider"
                            />
                            <span className="volume-val">{Math.round(voiceoverTrack.volume * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <label className="btn-audio-upload">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          Upload Voiceover
                          <input
                            type="file"
                            accept="audio/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files[0]) handleSetVoiceover(e.target.files[0])
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {sidebarTab === 'background' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">Background</h3>
                      <div className="control-row">
                        <label className="control-label">Color</label>
                        <div className="color-picker-wrap">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="color-input"
                          />
                          <input
                            type="text"
                            className="color-value color-value-edit"
                            value={bgColor}
                            onChange={(e) => {
                              let v = e.target.value
                              if (!v.startsWith('#')) v = '#' + v
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBgColor(v)
                            }}
                            onBlur={(e) => {
                              let v = e.target.value
                              if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v)
                            }}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                      <div className="control-row">
                        <label className="control-label">Gradient overlay</label>
                        <button
                          className={`toggle ${bgGradient ? 'active' : ''}`}
                          onClick={() => setBgGradient(!bgGradient)}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                      <div className="control-row">
                        <label className="control-label">Base shadow</label>
                        <button
                          className={`toggle ${showBase ? 'active' : ''}`}
                          onClick={() => setShowBase(!showBase)}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
            <section className="preview-area">
              <PreviewScene
                screens={screens}
                activeScreen={activeScreen}
                zoomLevel={activeZoomLevel}
                videoSeekTime={videoSeekTime}
                timelinePlaying={isTimelinePlaying}
                deviceType={deviceType}
                animation={activeAnimation}
                outroAnimation={activeOutroAnimation}
                clipDuration={activeClipDuration}
                bgColor={bgColor}
                bgGradient={bgGradient}
                showBase={showBase}
                isPlaying={isPlaying}
                canvasRef={canvasRef}
                textOverlays={textOverlays}
                currentTime={currentTime}
                clipAnimationTime={clipAnimationTime}
                activeTextAnim={activeTextAnim}
              />
              {timelineClips.length > 0 && (
                <Timeline
                  clips={timelineClips}
                  screens={screens}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  selectedClipId={selectedClipId}
                  setSelectedClipId={setSelectedClipId}
                  isPlaying={isTimelinePlaying}
                  setIsPlaying={setIsTimelinePlaying}
                  totalDuration={totalDuration}
                  onUpdateClip={handleUpdateClip}
                  onReorderClips={handleReorderClips}
                  onSplitClip={handleSplitClip}
                  onRemoveClip={handleRemoveClip}
                  zoomEffects={zoomEffects}
                  onAddZoomEffect={handleAddZoomEffect}
                  onUpdateZoomEffect={handleUpdateZoomEffect}
                  onRemoveZoomEffect={handleRemoveZoomEffect}
                  onUpload={handleUpload}
                  textOverlays={textOverlays}
                  onAddText={handleAddText}
                  onUpdateText={handleUpdateText}
                  onRemoveText={handleRemoveText}
                  selectedTextId={selectedTextId}
                  setSelectedTextId={setSelectedTextId}
                  setSidebarTab={setSidebarTab}
                  musicTrack={musicTrack}
                  voiceoverTrack={voiceoverTrack}
                  onUpdateMusic={handleUpdateMusic}
                  onUpdateVoiceover={handleUpdateVoiceover}
                  onRemoveMusic={handleRemoveMusic}
                  onRemoveVoiceover={handleRemoveVoiceover}
                  selectedAudioTrack={selectedAudioTrack}
                  setSelectedAudioTrack={setSelectedAudioTrack}
                />
              )}
            </section>
          </>
        )}
      </main>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          onRecord={startRecording}
          quality={quality}
          setQuality={setQuality}
        />
      )}
    </div>
  )
}

export default App
