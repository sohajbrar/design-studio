/**
 * Vercel Serverless Function – AI voiceover script generation.
 *
 * Given a feature context, generates a short voiceover narration script.
 */

const SYSTEM_PROMPT = `You are a voiceover script writer for product demo videos. Given a feature description and product context, write a short voiceover narration script.

RULES:
- Script should be 10-15 seconds when read aloud (~25-40 words).
- Use a professional but friendly tone.
- Start with "Introducing" or a hook that grabs attention.
- Mention the product name if provided.
- End with a call to action or availability statement.
- Output ONLY a JSON object: {"script":"Your script here"}
- No markdown, no explanation.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { feature, product, headline } = req.body || {}
  if (!feature && !headline) {
    return res.status(400).json({ error: 'Missing feature or headline' })
  }

  const userPrompt = [
    product ? `Product: ${product}` : '',
    headline ? `Video headline: ${headline}` : '',
    feature ? `Feature description: ${feature}` : '',
    'Write a 10-15 second voiceover script for this product demo video.',
  ].filter(Boolean).join('\n')

  try {
    let text

    if (process.env.LLAMA_API_KEY) {
      text = await callLlama(userPrompt)
    } else if (process.env.OPENAI_API_KEY) {
      text = await callOpenAI(userPrompt)
    } else {
      const fallback = headline
        ? `Introducing ${headline}. Discover the latest innovation that makes your experience better than ever. Try it today.`
        : `Discover the latest feature designed to enhance your experience. Available now.`
      return res.status(200).json({ script: fallback, source: 'fallback' })
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return res.status(200).json({ script: parsed.script, source: process.env.LLAMA_API_KEY ? 'llama' : 'openai' })
    }

    return res.status(200).json({ script: text.trim(), source: process.env.LLAMA_API_KEY ? 'llama' : 'openai' })
  } catch (err) {
    console.error('Voiceover error:', err)
    return res.status(200).json({ script: null, source: 'error', details: err.message })
  }
}

async function callLlama(userPrompt) {
  const model = process.env.LLAMA_MODEL || 'Llama-4-Maverick-17B-128E-Instruct-FP8'
  const url = 'https://api.llama.com/v1/chat/completions'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.LLAMA_API_KEY}`,
  }
  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_completion_tokens: 256,
  })

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  let response
  if (proxyUrl) {
    const { ProxyAgent, fetch: proxyFetch } = await import('undici')
    const dispatcher = new ProxyAgent(proxyUrl)
    response = await proxyFetch(url, { method: 'POST', headers, body: payload, dispatcher })
  } else {
    response = await fetch(url, { method: 'POST', headers, body: payload })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Llama API ${response.status}: ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const text = data.completion_message?.content?.text
    || data.completion_message?.content
    || data.choices?.[0]?.message?.content
  if (!text) throw new Error('No text in Llama response')
  return typeof text === 'string' ? text : JSON.stringify(text)
}

async function callOpenAI(userPrompt) {
  const endpoint = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  }
  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 256,
  })

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  let response
  if (proxyUrl) {
    const { ProxyAgent, fetch: proxyFetch } = await import('undici')
    const dispatcher = new ProxyAgent(proxyUrl)
    response = await proxyFetch(endpoint, { method: 'POST', headers, body: payload, dispatcher })
  } else {
    response = await fetch(endpoint, { method: 'POST', headers, body: payload })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || JSON.stringify(data)
}
