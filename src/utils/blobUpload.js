import { upload } from '@vercel/blob/client'

/**
 * Upload a video blob to Vercel Blob storage in the background.
 * Also uploads a small JSON metadata sidecar with email/context.
 * Returns the public URL on success, or null on failure.
 */
export async function uploadVideoToBlob(videoBlob, format, meta = {}) {
  try {
    const ts = Date.now()
    const filename = `mockup-demo-${ts}.${format}`
    const file = new File([videoBlob], filename, { type: videoBlob.type })

    const result = await upload(filename, file, {
      access: 'public',
      handleUploadUrl: '/api/videos/upload',
    })

    if (meta.email || meta.context) {
      const metaFilename = `mockup-demo-${ts}.meta.json`
      const metaBlob = new Blob([JSON.stringify({
        email: meta.email || '',
        context: meta.context || '',
        videoUrl: result.url,
        format,
        ts,
      })], { type: 'application/json' })
      const metaFile = new File([metaBlob], metaFilename, { type: 'application/json' })
      upload(metaFilename, metaFile, {
        access: 'public',
        handleUploadUrl: '/api/videos/upload',
      }).catch(() => {})
    }

    return result.url
  } catch (err) {
    console.warn('[blob] Video upload failed:', err.message)
    return null
  }
}
