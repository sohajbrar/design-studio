import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { projectId, config } = req.body
    if (!config) {
      return res.status(400).json({ error: 'Missing config' })
    }

    const id = projectId || crypto.randomUUID().slice(0, 8)
    const path = `projects/${id}/config.json`

    const blob = await put(path, JSON.stringify(config), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })

    return res.status(200).json({ projectId: id, url: blob.url })
  } catch (err) {
    console.error('[projects/save] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
