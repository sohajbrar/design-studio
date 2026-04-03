import { useState, useEffect, useCallback } from 'react'
import './VideosGallery.css'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffH = diffMs / (1000 * 60 * 60)

  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function getFormat(pathname) {
  const ext = pathname?.split('.').pop()?.toLowerCase()
  return ext || 'video'
}

export default function VideosGallery({ visible }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchVideos = useCallback(async (nextCursor) => {
    try {
      setLoading(true)
      const url = nextCursor ? `/api/videos/list?cursor=${encodeURIComponent(nextCursor)}` : '/api/videos/list'
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Failed to load videos')
      const data = await resp.json()
      setVideos((prev) => nextCursor ? [...prev, ...data.videos] : data.videos)
      setHasMore(data.hasMore)
      setCursor(data.cursor)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visible) fetchVideos()
  }, [visible, fetchVideos])

  const handleDelete = useCallback(async (video) => {
    if (!confirm('Delete this video? This cannot be undone.')) return
    setDeleting(video.url)
    try {
      const resp = await fetch('/api/videos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.url }),
      })
      if (!resp.ok) throw new Error('Delete failed')
      setVideos((prev) => prev.filter((v) => v.url !== video.url))
    } catch {
      alert('Failed to delete video')
    } finally {
      setDeleting(null)
    }
  }, [])

  const handleDownload = useCallback((video) => {
    const a = document.createElement('a')
    a.href = video.url
    a.download = video.pathname.split('/').pop() || 'video'
    a.target = '_blank'
    a.click()
  }, [])

  if (loading && videos.length === 0) {
    return (
      <div className="videos-gallery">
        <div className="videos-loading">
          <div className="videos-loading-spinner" />
          Loading videos...
        </div>
      </div>
    )
  }

  if (error && videos.length === 0) {
    return (
      <div className="videos-gallery">
        <div className="videos-empty">
          <p>Failed to load videos. Please try again later.</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="videos-gallery">
        <div className="videos-empty">
          <div className="videos-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h3>No exported videos yet</h3>
          <p>Export a video and it will appear here automatically. Uploads may take a moment after export finishes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="videos-gallery">
      <div className="videos-grid">
        {videos.map((video) => (
          <div key={video.url} className="video-card">
            <div className="video-card-preview" onClick={() => setPreviewVideo(video)}>
              <video src={video.url} crossOrigin="anonymous" preload="metadata" muted playsInline />
              <div className="video-card-play-overlay">
                <div className="video-card-play-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="video-card-info">
              <div className="video-card-meta">
                <div className="video-card-name">{video.pathname.split('/').pop()}</div>
                <div className="video-card-details">
                  {getFormat(video.pathname).toUpperCase()} · {formatSize(video.size)} · {formatDate(video.uploadedAt)}
                </div>
              </div>
              <div className="video-card-actions">
                <button onClick={() => handleDownload(video)} title="Download">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(video)}
                  disabled={deleting === video.url}
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="videos-load-more">
          <button onClick={() => fetchVideos(cursor)} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {previewVideo && (
        <div className="video-modal-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <video src={previewVideo.url} crossOrigin="anonymous" controls autoPlay playsInline />
            <div className="video-modal-footer">
              <div className="video-card-meta">
                <div className="video-card-name">{previewVideo.pathname.split('/').pop()}</div>
                <div className="video-card-details">
                  {getFormat(previewVideo.pathname).toUpperCase()} · {formatSize(previewVideo.size)} · {formatDate(previewVideo.uploadedAt)}
                </div>
              </div>
              <button className="video-modal-close" onClick={() => setPreviewVideo(null)}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
