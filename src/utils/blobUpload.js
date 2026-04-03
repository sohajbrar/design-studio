import { upload } from '@vercel/blob/client'

/**
 * Upload a video blob to Vercel Blob storage in the background.
 * Returns the public URL on success, or null on failure.
 * This is best-effort — failures are logged but never block the user.
 */
export async function uploadVideoToBlob(videoBlob, format) {
  try {
    const filename = `mockup-demo-${Date.now()}.${format}`
    const file = new File([videoBlob], filename, { type: videoBlob.type })

    const result = await upload(filename, file, {
      access: 'public',
      handleUploadUrl: '/api/videos/upload',
    })

    return result.url
  } catch (err) {
    console.warn('[blob] Video upload failed:', err.message)
    return null
  }
}
