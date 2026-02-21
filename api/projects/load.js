import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { projectId } = req.body
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' })
    }

    const prefix = `projects/${projectId}/config.json`
    const { blobs } = await list({ prefix, limit: 1 })

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const configBlob = blobs[0]
    const response = await fetch(configBlob.url)
    if (!response.ok) {
      return res.status(404).json({ error: 'Failed to fetch project config' })
    }

    const config = await response.json()
    return res.status(200).json({ projectId, config, updatedAt: configBlob.uploadedAt })
  } catch (err) {
    console.error('[projects/load] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
