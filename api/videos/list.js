import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cursor } = req.query
    const result = await list({
      prefix: 'mockup-demo-',
      limit: 50,
      cursor: cursor || undefined,
    })

    const videos = result.blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }))

    return res.status(200).json({
      videos,
      hasMore: result.hasMore,
      cursor: result.cursor,
    })
  } catch (err) {
    console.error('[videos/list] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
