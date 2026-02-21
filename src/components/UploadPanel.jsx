import { useCallback, useRef, useState } from 'react'
import './UploadPanel.css'

export default function UploadPanel({ onUpload, fullPage = false, compact = false }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer.files
      if (files.length) onUpload(files)
    },
    [onUpload]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e) => {
    if (e.target.files.length) onUpload(e.target.files)
    e.target.value = ''
  }

  if (compact) {
    return (
      <div className="upload-compact" onClick={handleClick}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.mov,.mp4,.webm,.avi,.gif"
          multiple
          onChange={handleChange}
          hidden
        />
        <div className="upload-compact-icon">+</div>
        <span className="upload-compact-text">Add screens or videos</span>
      </div>
    )
  }

  return (
    <div className={`upload-panel ${fullPage ? 'full-page' : ''}`}>
      <div className="upload-hero">
        <div className="upload-hero-bg" />
        <div className="upload-content">
          <div className="upload-icon-large">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="12" width="20" height="36" rx="4" stroke="url(#ug1)" strokeWidth="2.5" />
              <rect x="36" y="12" width="20" height="36" rx="4" stroke="url(#ug2)" strokeWidth="2.5" />
              <path d="M32 4L28 10H36L32 4Z" fill="#21C063" opacity="0.5" />
              <path d="M32 60L28 54H36L32 60Z" fill="#1aad56" opacity="0.5" />
              <defs>
                <linearGradient id="ug1" x1="8" y1="12" x2="28" y2="48">
                  <stop stopColor="#21C063" />
                  <stop offset="1" stopColor="#2ed874" />
                </linearGradient>
                <linearGradient id="ug2" x1="36" y1="12" x2="56" y2="48">
                  <stop stopColor="#1aad56" />
                  <stop offset="1" stopColor="#21C063" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="upload-title">Create Stunning Demo Videos</h1>
          <p className="upload-subtitle">
            Upload your designs and generate beautiful 3D showcase videos
            with iPhone and Android device frames
          </p>
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*,.mov,.mp4,.webm,.avi,.gif"
              multiple
              onChange={handleChange}
              hidden
            />
            <div className="dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="dropzone-text">
              <strong>Drop your screens here</strong> or click to browse
            </p>
            <p className="dropzone-hint">PNG, JPG, WebP, MP4, MOV, or WebM — upload images or videos</p>
          </div>
          <div className="upload-features">
            <div className="feature-pill">
              <span className="feature-dot" style={{ background: '#21C063' }} />
              iPhone 17 Pro Frame
            </div>
            <div className="feature-pill">
              <span className="feature-dot" style={{ background: '#1aad56' }} />
              Pixel 8 Frame
            </div>
            <div className="feature-pill">
              <span className="feature-dot" style={{ background: '#2ed874' }} />
              6 Animation Presets
            </div>
            <div className="feature-pill">
              <span className="feature-dot" style={{ background: '#21C063' }} />
              Video Upload Support
            </div>
            <div className="feature-pill">
              <span className="feature-dot" style={{ background: '#2ed874' }} />
              WebM Export
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
