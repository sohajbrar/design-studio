import { put } from '@vercel/blob'

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const projectId = req.headers['x-project-id']
    const filename = req.headers['x-filename'] || 'file'
    const contentType = req.headers['content-type'] || 'application/octet-stream'

    if (!projectId) {
      return res.status(400).json({ error: 'Missing x-project-id header' })
    }

    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 10MB)' })
    }

    const path = `projects/${projectId}/media/${filename}`
    const blob = await put(path, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    })

    return res.status(200).json({ url: blob.url, filename })
  } catch (err) {
    console.error('[projects/upload] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
