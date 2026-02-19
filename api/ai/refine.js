/**
 * Vercel Serverless Function – AI refinement for in-editor natural language commands.
 *
 * Accepts the current config + a user instruction, returns a partial config delta.
 */

const SYSTEM_PROMPT = `You are a video template refinement assistant. The user has an existing video template and wants to make changes using natural language.

Given the current config and a user instruction, return ONLY a JSON object containing the fields that should change. Only include fields that need updating.

AVAILABLE OPTIONS:
- deviceType: "iphone", "android", "both", "ipad", "macbook"
- animation: "showcase", "orbit", "flip", "scroll", "single", "slideLeft", "slideRight", "slideDown", "slideUp", "slideRightRotate", "slideLeftRotate", "zoomBottomLeft", "zoomTopRight", "sideBySide", "laptopOpen", "laptopClose", "sideScroll10", "angled3ZoomOut", "circle4Rotate", "angledZoom4", "carousel6", "flatScatter7", "offsetCircleRotate", "floatingPhoneLaptop", "phoneInFrontLaptop"
- outroAnimation: "none", "slideLeft", "slideRight", "slideDown", "slideUp", "slideLeftRotate", "slideRightRotate", "zoomOut", "flip"
- bgColor: any hex color
- whatsappTheme: "wa-dark", "wa-light", "wa-beige", "wa-green", or null
- outroLogo: "whatsapp", "whatsapp-business", or null
- textOverlay: {"text":string,"fontSize":number,"color":string,"animation":string}
- textOverlay.animation: "slideFromLeft", "slideFromRight", "slideFromTop", "slideFromBottom", "none"
- clipDuration: number (seconds)

RULES:
- Only return changed fields as a flat delta object.
- For textOverlay changes, return the full textOverlay object with only modified sub-fields overridden.
- Interpret natural language: "make it dark" → bgColor change + text color, "bigger text" → fontSize increase, "zoom animation" → animation change, etc.
- "light theme" / "dark theme" → adjust bgColor + textOverlay.color accordingly.
- Keep responses minimal and precise.
- ONLY output JSON. No explanation, no markdown.

Example input: "Make the background blue and text bigger"
Example output: {"bgColor":"#A3C9F9","textOverlay":{"fontSize":56}}

Example input: "Switch to orbit animation"
Example output: {"animation":"orbit"}

Example input: "Make it dark with white text"
Example output: {"bgColor":"#0A1014","textOverlay":{"color":"#FFFFFF"}}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { instruction, currentConfig } = req.body || {}
  if (!instruction) {
    return res.status(400).json({ error: 'Missing instruction' })
  }

  const userPrompt = `Current config:\n${JSON.stringify(currentConfig || {}, null, 2)}\n\nUser instruction: "${instruction}"`

  try {
    let text

    if (process.env.LLAMA_API_KEY) {
      text = await callLlama(userPrompt)
    } else if (process.env.OPENAI_API_KEY) {
      text = await callOpenAI(userPrompt)
    } else {
      return res.status(200).json({ delta: null, source: 'none' })
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(200).json({ delta: null, source: 'parse_error' })
    }

    const delta = JSON.parse(jsonMatch[0])
    return res.status(200).json({ delta, source: process.env.LLAMA_API_KEY ? 'llama' : 'openai' })
  } catch (err) {
    console.error('AI refine error:', err)
    return res.status(200).json({ delta: null, source: 'error', details: err.message })
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
    temperature: 0.3,
    max_completion_tokens: 512,
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
    temperature: 0.3,
    max_tokens: 512,
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
