import { handleUpload } from '@vercel/blob/client'

export default async function handler(req, res) {
  try {
    const response = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          maximumSizeInBytes: 100 * 1024 * 1024,
          allowedContentTypes: ['video/webm', 'video/mp4', 'video/quicktime', 'application/json'],
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Could log to a database here in the future
      },
    })
    return res.status(200).json(response)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
}
