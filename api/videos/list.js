import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cursor } = req.query
    const result = await list({
      prefix: 'mockup-demo-',
      limit: 100,
      cursor: cursor || undefined,
    })

    const metaMap = {}
    const videoBlobs = []

    for (const blob of result.blobs) {
      if (blob.pathname.endsWith('.meta.json')) {
        const ts = blob.pathname.match(/mockup-demo-(\d+)\.meta\.json/)?.[1]
        if (ts) {
          try {
            const resp = await fetch(blob.url)
            if (resp.ok) metaMap[ts] = await resp.json()
          } catch {}
        }
      } else {
        videoBlobs.push(blob)
      }
    }

    const videos = videoBlobs.map((blob) => {
      const ts = blob.pathname.match(/mockup-demo-(\d+)\./)?.[1]
      const meta = ts ? metaMap[ts] : null
      return {
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        email: meta?.email || '',
        context: meta?.context || '',
      }
    })

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
