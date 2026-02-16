import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import './Timeline.css'

const BASE_PPS = 100
const MIN_PPS = 20
const MAX_PPS = 400
const TRIM_HANDLE_WIDTH = 8
const MIN_CLIP_DURATION = 0.5
const ZOOM_HANDLE_WIDTH = 6
const MIN_ZOOM_DURATION = 0.2
const TEXT_HANDLE_WIDTH = 6
const MIN_TEXT_DURATION = 0.3

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${String(secs).padStart(2, '0')}.${ms}`
}

export default function Timeline({
  clips,
  screens,
  currentTime,
  setCurrentTime,
  selectedClipId,
  setSelectedClipId,
  isPlaying,
  setIsPlaying,
  totalDuration,
  onUpdateClip,
  onReorderClips,
  onSplitClip,
  onRemoveClip,
  zoomEffects,
  onAddZoomEffect,
  onUpdateZoomEffect,
  onRemoveZoomEffect,
  onUpload,
  textOverlays,
  onAddText,
  onUpdateText,
  onRemoveText,
  selectedTextId,
  setSelectedTextId,
  setSidebarTab,
}) {
  const tracksRef = useRef(null)
  const scrollRef = useRef(null)
  const [dragState, setDragState] = useState(null)
  const [zoomPopover, setZoomPopover] = useState(null)
  const [fileDragOver, setFileDragOver] = useState(false)
  const [selectedZoomId, setSelectedZoomId] = useState(null)
  const [pps, setPps] = useState(BASE_PPS)
  const [hoverGhost, setHoverGhost] = useState(null)

  const trackWidth = Math.max(totalDuration * pps, 400)

  const getScreenForClip = useCallback(
    (clip) => screens.find((s) => s.id === clip.screenId) || null,
    [screens]
  )

  const timeToX = useCallback((time) => time * pps, [pps])
  const xToTime = useCallback((x) => Math.max(0, x / pps), [pps])

  const handleRulerMouseDown = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const scrollLeft = scrollRef.current?.scrollLeft || 0
      const x = e.clientX - rect.left + scrollLeft
      const time = Math.max(0, Math.min(totalDuration, xToTime(x)))
      setCurrentTime(time)
      setDragState({ type: 'playhead', startX: e.clientX, startValue: time })
    },
    [totalDuration, xToTime, setCurrentTime]
  )

  useEffect(() => {
    if (!dragState) return

    const handlePointerMove = (e) => {
      const scrollLeft = scrollRef.current?.scrollLeft || 0

      if (dragState.type === 'playhead') {
        const containerRect = tracksRef.current?.getBoundingClientRect()
        if (!containerRect) return
        const x = e.clientX - containerRect.left + scrollLeft
        const time = Math.max(0, Math.min(totalDuration, xToTime(x)))
        setCurrentTime(time)
      }

      if (dragState.type === 'trim-right') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const newDuration = Math.max(MIN_CLIP_DURATION, dragState.startValue + dTime)
        onUpdateClip(dragState.clipId, {
          duration: newDuration,
          trimEnd: dragState.startTrimEnd + dTime,
        })
      }

      if (dragState.type === 'trim-left') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const clip = clips.find((c) => c.id === dragState.clipId)
        if (!clip) return
        const newTrimStart = Math.max(0, dragState.startTrimStart + dTime)
        const trimDelta = newTrimStart - dragState.startTrimStart
        const newDuration = Math.max(MIN_CLIP_DURATION, dragState.startDuration - trimDelta)
        onUpdateClip(dragState.clipId, {
          duration: newDuration,
          trimStart: newTrimStart,
        })
      }

      if (dragState.type === 'move') {
        const dx = e.clientX - dragState.startX
        if (Math.abs(dx) > 40) {
          const clipIndex = clips.findIndex((c) => c.id === dragState.clipId)
          if (dx > 0 && clipIndex < clips.length - 1) {
            onReorderClips(clipIndex, clipIndex + 1)
            setDragState((prev) => ({ ...prev, startX: e.clientX }))
          } else if (dx < 0 && clipIndex > 0) {
            onReorderClips(clipIndex, clipIndex - 1)
            setDragState((prev) => ({ ...prev, startX: e.clientX }))
          }
        }
      }

      if (dragState.type === 'zoom-resize-left') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const newStart = Math.max(
          0,
          Math.min(dragState.endTime - MIN_ZOOM_DURATION, dragState.startValue + dTime)
        )
        onUpdateZoomEffect(dragState.effectId, { startTime: newStart })
      }

      if (dragState.type === 'zoom-resize-right') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const newEnd = Math.min(
          totalDuration,
          Math.max(dragState.startTimeVal + MIN_ZOOM_DURATION, dragState.startValue + dTime)
        )
        onUpdateZoomEffect(dragState.effectId, { endTime: newEnd })
      }

      if (dragState.type === 'zoom-move') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const dur = dragState.origEnd - dragState.origStart
        let newStart = dragState.origStart + dTime
        newStart = Math.max(0, Math.min(totalDuration - dur, newStart))
        onUpdateZoomEffect(dragState.effectId, {
          startTime: newStart,
          endTime: newStart + dur,
        })
      }

      if (dragState.type === 'text-resize-left') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const newStart = Math.max(
          0,
          Math.min(dragState.endTime - MIN_TEXT_DURATION, dragState.startValue + dTime)
        )
        onUpdateText(dragState.textId, { startTime: newStart })
      }

      if (dragState.type === 'text-resize-right') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const newEnd = Math.min(
          totalDuration,
          Math.max(dragState.startTimeVal + MIN_TEXT_DURATION, dragState.startValue + dTime)
        )
        onUpdateText(dragState.textId, { endTime: newEnd })
      }

      if (dragState.type === 'text-move') {
        const dx = e.clientX - dragState.startX
        const dTime = dx / pps
        const dur = dragState.origEnd - dragState.origStart
        let newStart = dragState.origStart + dTime
        newStart = Math.max(0, Math.min(totalDuration - dur, newStart))
        onUpdateText(dragState.textId, {
          startTime: newStart,
          endTime: newStart + dur,
        })
      }
    }

    const handlePointerUp = () => {
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [
    dragState,
    clips,
    totalDuration,
    xToTime,
    setCurrentTime,
    onUpdateClip,
    onReorderClips,
    onUpdateZoomEffect,
    onUpdateText,
  ])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (selectedTextId) {
          e.preventDefault()
          onRemoveText(selectedTextId)
          setSelectedTextId(null)
        } else if (selectedZoomId) {
          e.preventDefault()
          onRemoveZoomEffect(selectedZoomId)
          setSelectedZoomId(null)
        } else if (selectedClipId) {
          e.preventDefault()
          onRemoveClip(selectedClipId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedZoomId, selectedTextId, onRemoveClip, onRemoveZoomEffect, onRemoveText, setSelectedTextId])

  const handleSplit = useCallback(() => {
    if (!selectedClipId) return
    const clip = clips.find((c) => c.id === selectedClipId)
    if (!clip) return
    if (
      currentTime > clip.startTime &&
      currentTime < clip.startTime + clip.duration
    ) {
      onSplitClip(selectedClipId, currentTime)
    }
  }, [selectedClipId, clips, currentTime, onSplitClip])

  const handleAddZoom = useCallback(() => {
    onAddZoomEffect()
  }, [onAddZoomEffect])

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    setFileDragOver(false)
    const files = e.dataTransfer.files
    if (files.length && onUpload) onUpload(files)
  }, [onUpload])

  const handleFileDragOver = useCallback((e) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setFileDragOver(true)
    }
  }, [])

  const handleFileDragLeave = useCallback((e) => {
    e.preventDefault()
    setFileDragOver(false)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        setPps((prev) => {
          const delta = e.deltaY > 0 ? -10 : 10
          return Math.min(MAX_PPS, Math.max(MIN_PPS, prev + delta))
        })
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const zoomIn = useCallback(() => {
    setPps((prev) => Math.min(MAX_PPS, prev + 20))
  }, [])

  const zoomOut = useCallback(() => {
    setPps((prev) => Math.max(MIN_PPS, prev - 20))
  }, [])

  const zoomFit = useCallback(() => {
    if (totalDuration <= 0 || !scrollRef.current) return
    const available = scrollRef.current.clientWidth - 40
    setPps(Math.min(MAX_PPS, Math.max(MIN_PPS, available / totalDuration)))
  }, [totalDuration])

  const DEFAULT_ADD_DURATION = 1

  const handleTrackHover = useCallback((e, trackType) => {
    const scrollLeft = scrollRef.current?.scrollLeft || 0
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, xToTime(x))
    setHoverGhost({ trackType, time, duration: DEFAULT_ADD_DURATION })
  }, [xToTime])

  const handleTrackLeave = useCallback(() => {
    setHoverGhost(null)
  }, [])

  const handleTrackClick = useCallback((e, trackType) => {
    if (e.target !== e.currentTarget) return
    const scrollLeft = scrollRef.current?.scrollLeft || 0
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, Math.min(totalDuration, xToTime(x)))
    setCurrentTime(time)
    setSelectedClipId(null)
    setSelectedZoomId(null)
    setSelectedTextId(null)

    if (trackType === 'zoom') {
      onAddZoomEffect(time)
    } else if (trackType === 'text' && onAddText) {
      onAddText(time)
      if (setSidebarTab) setSidebarTab('text')
    }
    setHoverGhost(null)
  }, [totalDuration, xToTime, setCurrentTime, setSelectedClipId, setSelectedZoomId, setSelectedTextId, onAddZoomEffect, onAddText, setSidebarTab])

  const rulerMarks = useMemo(() => {
    const step = pps >= 80 ? 1 : pps >= 40 ? 2 : 5
    const majorEvery = pps >= 80 ? 5 : pps >= 40 ? 10 : 30
    const marks = []
    for (let t = 0; t <= totalDuration + 0.01; t += step) {
      marks.push({
        time: t,
        x: timeToX(t),
        isMajor: t % majorEvery === 0,
      })
    }
    return marks
  }, [totalDuration, timeToX, pps])

  const selectedClip =
    clips.find((c) => c.id === selectedClipId) || null
  const canSplit =
    selectedClip &&
    currentTime > selectedClip.startTime + 0.1 &&
    currentTime < selectedClip.startTime + selectedClip.duration - 0.1

  return (
    <div
      className={`timeline ${fileDragOver ? 'file-drag-over' : ''}`}
      onDrop={handleFileDrop}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
    >
      {fileDragOver && (
        <div className="timeline-drop-overlay">
          <span>Drop media here to add to timeline</span>
        </div>
      )}
      {/* Transport bar */}
      <div className="timeline-transport">
        <div className="transport-left">
          <button
            className="transport-btn"
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false)
              } else {
                if (currentTime >= totalDuration) setCurrentTime(0)
                setIsPlaying(true)
              }
            }}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <span className="transport-time">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
          <div className="timeline-zoom-controls">
            <button className="tz-btn" onClick={zoomOut} title="Zoom out (Cmd+Scroll)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button className="tz-btn tz-fit" onClick={zoomFit} title="Fit to view">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button className="tz-btn" onClick={zoomIn} title="Zoom in (Cmd+Scroll)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>
        </div>
        <div className="transport-right">
          <button
            className="transport-action-btn"
            onClick={handleAddZoom}
            title="Add zoom effect at playhead"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            + Zoom
          </button>
          {selectedClip && (
            <>
              <button
                className="transport-action-btn"
                onClick={handleSplit}
                disabled={!canSplit}
                title="Split clip at playhead"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <polyline points="8 6 12 2 16 6" />
                  <polyline points="8 18 12 22 16 18" />
                </svg>
                Split
              </button>
              <button
                className="transport-action-btn danger"
                onClick={() => onRemoveClip(selectedClipId)}
                title="Remove clip"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable timeline area */}
      <div className="timeline-scroll" ref={scrollRef}>
        {/* Ruler */}
        <div
          className="timeline-ruler"
          style={{ width: trackWidth + 40 }}
          onMouseDown={handleRulerMouseDown}
        >
          {rulerMarks.map((mark) => (
            <div
              key={mark.time}
              className={`ruler-mark ${mark.isMajor ? 'major' : ''}`}
              style={{ left: mark.x }}
            >
              <div className="ruler-tick" />
              {mark.isMajor && (
                <span className="ruler-label">{formatTime(mark.time)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Tracks container — playhead spans both tracks */}
        <div
          className="timeline-tracks"
          ref={tracksRef}
          style={{ width: trackWidth + 40 }}
        >
          {/* ── Media track ── */}
          <div
            className="timeline-track media-track"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                const scrollLeft = scrollRef.current?.scrollLeft || 0
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left + scrollLeft
                const time = Math.max(0, Math.min(totalDuration, xToTime(x)))
                setCurrentTime(time)
                setSelectedClipId(null)
                setSelectedZoomId(null)
              }
            }}
          >
            <span className="track-label">Media</span>
            {clips.map((clip) => {
              const screen = getScreenForClip(clip)
              const clipWidth = clip.duration * pps
              const clipX = clip.startTime * pps
              const isSelected = clip.id === selectedClipId

              return (
                <div
                  key={clip.id}
                  className={`timeline-clip ${isSelected ? 'selected' : ''} ${screen?.isVideo ? 'video' : 'image'}`}
                  style={{
                    left: clipX,
                    width: clipWidth,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setSelectedClipId(clip.id)
                    setSelectedZoomId(null)
                    if (setSidebarTab) setSidebarTab('animations')
                    const rect = e.currentTarget.getBoundingClientRect()
                    const localX = e.clientX - rect.left

                    if (localX <= TRIM_HANDLE_WIDTH) {
                      setDragState({
                        type: 'trim-left',
                        clipId: clip.id,
                        startX: e.clientX,
                        startDuration: clip.duration,
                        startTrimStart: clip.trimStart,
                      })
                    } else if (localX >= rect.width - TRIM_HANDLE_WIDTH) {
                      setDragState({
                        type: 'trim-right',
                        clipId: clip.id,
                        startX: e.clientX,
                        startValue: clip.duration,
                        startTrimEnd: clip.trimEnd,
                      })
                    } else {
                      setDragState({
                        type: 'move',
                        clipId: clip.id,
                        startX: e.clientX,
                      })
                    }
                  }}
                >
                  <div className="trim-handle left" />
                  <div className="trim-handle right" />
                  <div className="clip-content">
                    {screen && !screen.isVideo && (
                      <img
                        src={screen.url}
                        alt=""
                        className="clip-thumbnail"
                        draggable={false}
                      />
                    )}
                    {screen && screen.isVideo && (
                      <video
                        src={screen.url}
                        muted
                        className="clip-thumbnail"
                        draggable={false}
                      />
                    )}
                    <span className="clip-label">{screen?.name || 'Unknown'}</span>
                    <span className="clip-duration">{clip.duration.toFixed(1)}s</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Text track ── */}
          <div
            className="timeline-track text-track"
            onMouseDown={(e) => handleTrackClick(e, 'text')}
            onMouseMove={(e) => {
              if (e.target === e.currentTarget) handleTrackHover(e, 'text')
            }}
            onMouseLeave={handleTrackLeave}
          >
            <span className="track-label">Text</span>
            {hoverGhost && hoverGhost.trackType === 'text' && (
              <div
                className="track-ghost"
                style={{
                  left: timeToX(hoverGhost.time),
                  width: Math.max(hoverGhost.duration * pps, 40),
                }}
              >
                <span className="track-ghost-label">+ Text</span>
              </div>
            )}
            {textOverlays && textOverlays.map((overlay) => {
              const isSelected = overlay.id === selectedTextId
              const blockX = (overlay.startTime || 0) * pps
              const blockW = ((overlay.endTime || 0) - (overlay.startTime || 0)) * pps
              return (
                <div
                  key={overlay.id}
                  className={`text-block ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: blockX,
                    width: Math.max(blockW, 20),
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setSelectedTextId(overlay.id)
                    setSelectedClipId(null)
                    setSelectedZoomId(null)
                    if (setSidebarTab) setSidebarTab('text')
                    const rect = e.currentTarget.getBoundingClientRect()
                    const localX = e.clientX - rect.left

                    if (localX <= TEXT_HANDLE_WIDTH) {
                      setDragState({
                        type: 'text-resize-left',
                        textId: overlay.id,
                        startX: e.clientX,
                        startValue: overlay.startTime,
                        endTime: overlay.endTime,
                      })
                    } else if (localX >= rect.width - TEXT_HANDLE_WIDTH) {
                      setDragState({
                        type: 'text-resize-right',
                        textId: overlay.id,
                        startX: e.clientX,
                        startValue: overlay.endTime,
                        startTimeVal: overlay.startTime,
                      })
                    } else {
                      setDragState({
                        type: 'text-move',
                        textId: overlay.id,
                        startX: e.clientX,
                        origStart: overlay.startTime,
                        origEnd: overlay.endTime,
                      })
                    }
                  }}
                >
                  <div className="text-handle left" />
                  <div className="text-handle right" />
                  <div className="text-block-content">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                    <span className="text-block-label">{overlay.text || 'Text'}</span>
                    <span className="text-block-time">{((overlay.endTime || 0) - (overlay.startTime || 0)).toFixed(1)}s</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Zoom effects track ── */}
          <div
            className="timeline-track zoom-track"
            onMouseDown={(e) => handleTrackClick(e, 'zoom')}
            onMouseMove={(e) => {
              if (e.target === e.currentTarget) handleTrackHover(e, 'zoom')
            }}
            onMouseLeave={handleTrackLeave}
          >
            <span className="track-label">Zoom</span>
            {hoverGhost && hoverGhost.trackType === 'zoom' && (
              <div
                className="track-ghost"
                style={{
                  left: timeToX(hoverGhost.time),
                  width: Math.max(hoverGhost.duration * pps, 40),
                }}
              >
                <span className="track-ghost-label">+ Zoom</span>
              </div>
            )}
            {zoomEffects.map((effect) => {
              const effectX = effect.startTime * pps
              const effectWidth = (effect.endTime - effect.startTime) * pps
              const isSelected = effect.id === selectedZoomId

              return (
                <div
                  key={effect.id}
                  className={`zoom-block ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: effectX,
                    width: Math.max(effectWidth, 20),
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setSelectedZoomId(effect.id)
                    setSelectedClipId(null)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const localX = e.clientX - rect.left

                    if (localX <= ZOOM_HANDLE_WIDTH) {
                      setDragState({
                        type: 'zoom-resize-left',
                        effectId: effect.id,
                        startX: e.clientX,
                        startValue: effect.startTime,
                        endTime: effect.endTime,
                      })
                    } else if (localX >= rect.width - ZOOM_HANDLE_WIDTH) {
                      setDragState({
                        type: 'zoom-resize-right',
                        effectId: effect.id,
                        startX: e.clientX,
                        startValue: effect.endTime,
                        startTimeVal: effect.startTime,
                      })
                    } else {
                      setDragState({
                        type: 'zoom-move',
                        effectId: effect.id,
                        startX: e.clientX,
                        origStart: effect.startTime,
                        origEnd: effect.endTime,
                      })
                    }
                  }}
                >
                  <div className="zoom-handle left" />
                  <div className="zoom-handle right" />
                  <div className="zoom-block-content">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span className="zoom-block-label">{effect.zoomLevel}x</span>
                    <span className="zoom-block-time">
                      {(effect.endTime - effect.startTime).toFixed(1)}s
                    </span>
                  </div>
                  <button
                    className="zoom-block-level-btn"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoomPopover({
                        effectId: effect.id,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }}
                    title="Change zoom level"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Playhead — spans both tracks */}
          <div
            className="timeline-playhead"
            style={{ left: timeToX(currentTime) }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setDragState({
                type: 'playhead',
                startX: e.clientX,
                startValue: currentTime,
              })
            }}
          >
            <div className="playhead-head" />
            <div className="playhead-line" />
          </div>
        </div>
      </div>

      {/* Zoom level popover */}
      {zoomPopover && (() => {
        const effect = zoomEffects.find((ef) => ef.id === zoomPopover.effectId)
        return (
          <>
            <div
              className="zoom-popover-backdrop"
              onClick={() => setZoomPopover(null)}
            />
            <div
              className="zoom-popover"
              style={{
                left: zoomPopover.x - 100,
                top: zoomPopover.y - 58,
              }}
            >
              <div className="zoom-popover-header">
                <span className="zoom-popover-value">{effect?.zoomLevel ?? 2}x</span>
                <button
                  className="zoom-popover-delete"
                  onClick={() => {
                    onRemoveZoomEffect(zoomPopover.effectId)
                    setZoomPopover(null)
                    setSelectedZoomId(null)
                  }}
                  title="Remove zoom effect"
                >
                  ✕
                </button>
              </div>
              <div className="zoom-popover-slider-row">
                <span className="zoom-popover-bound">0.5x</span>
                <input
                  type="range"
                  className="zoom-popover-slider"
                  min="0.5"
                  max="8"
                  step="0.1"
                  value={effect?.zoomLevel ?? 2}
                  onChange={(e) => {
                    onUpdateZoomEffect(zoomPopover.effectId, {
                      zoomLevel: parseFloat(e.target.value),
                    })
                  }}
                />
                <span className="zoom-popover-bound">8x</span>
              </div>
              <div className="zoom-popover-presets">
                {[1, 1.5, 2, 3, 4, 6, 8].map((level) => (
                  <button
                    key={level}
                    className={`zoom-preset-btn ${effect?.zoomLevel === level ? 'active' : ''}`}
                    onClick={() => {
                      onUpdateZoomEffect(zoomPopover.effectId, {
                        zoomLevel: level,
                      })
                    }}
                  >
                    {level}x
                  </button>
                ))}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
