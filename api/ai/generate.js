/**
 * Vercel Serverless Function – AI template generation proxy.
 *
 * Backends (checked in order):
 *
 * 1) Meta Llama API:
 *    LLAMA_API_KEY=LLM|...|...
 *    LLAMA_MODEL=Llama-4-Maverick-17B-128E-Instruct (default)
 *
 * 2) OpenAI-compatible fallback:
 *    OPENAI_API_KEY=sk-...
 *
 * 3) No keys → returns null so frontend uses rule-based fallback
 */

const SYSTEM_PROMPT = `You are a video template configuration assistant. Given structured user answers about what video they want to create, output ONLY a valid JSON object (no markdown fences, no explanation, no text before or after the JSON).

Available options:

DEVICE TYPES: "iphone", "android", "both", "ipad", "macbook"

ANIMATIONS (single-device): "showcase", "orbit", "flip", "scroll", "single", "slideLeft", "slideRight", "slideDown", "slideUp", "slideRightRotate", "slideLeftRotate", "zoomBottomLeft", "zoomTopRight"
ANIMATIONS (dual-device, deviceType "both"): "sideBySide"
ANIMATIONS (laptop only): "laptopOpen", "laptopClose"
ANIMATIONS (multi-device): "sideScroll10", "angled3ZoomOut", "circle4Rotate", "angledZoom4", "carousel6", "flatScatter7", "offsetCircleRotate"
ANIMATIONS (phone+laptop combo): "floatingPhoneLaptop", "phoneInFrontLaptop"

EXIT ANIMATIONS: "none", "slideLeft", "slideRight", "slideDown", "slideUp", "slideLeftRotate", "slideRightRotate", "zoomOut", "flip"

WHATSAPP THEMES (only for WhatsApp/WhatsApp Business products):
- "wa-dark" (dark green/black), "wa-light" (light green), "wa-beige" (warm beige), "wa-green" (vibrant green)

OUTRO LOGOS (only with WhatsApp themes active):
- "whatsapp" or "whatsapp-business"

BACKGROUND COLORS: "#CFC4FB" (lavender), "#A2D5F2" (sky blue), "#BEFAB3" (mint green), "#FBE5B5" (warm yellow), "#F4C3B0" (peach), "#F3AFC6" (pink), "#D4D6D8" (silver), "#A3C9F9" (blue), "#A4D9D4" (teal), "#0A1014" (dark), "#E7FDE3" (light green), "#FEF4EB" (beige), "#1DAA61" (whatsapp green)

TEXT ANIMATIONS: "slideFromLeft", "slideFromRight", "slideFromTop", "slideFromBottom", "none"

Output this exact JSON schema:
{"deviceType":string,"animation":string,"outroAnimation":string,"bgColor":string,"whatsappTheme":string|null,"outroLogo":string|null,"textOverlay":{"text":string,"fontSize":number,"color":string,"animation":string},"clipDuration":number,"screenSlotCount":number|null}

Rules:
- textOverlay.text: Generate a short, catchy headline (max 5 words) that captures the feature being showcased. Be creative and marketing-oriented. Examples: "Archive Status Boosting", "Chat Lock for Privacy", "HD Photo Sharing".
- textOverlay.fontSize: Use 48 for most, 42 for longer text.
- For WhatsApp or WhatsApp Business products, ALWAYS set whatsappTheme and outroLogo accordingly.
- Pick the best animation for the style: "showcase" for professional reveals, "slideRightRotate"/"orbit" for dynamic, "scroll" for walkthroughs, "carousel6" for multi-feature (set screenSlotCount:6), "sideBySide" for comparisons (set deviceType:"both").
- outroAnimation: "zoomOut" is a good default.
- Text color must contrast background: "#FFFFFF" on dark backgrounds, "#000000" on light.
- clipDuration: 5 for simple, 8 for multi-device.
- ONLY output the JSON object. No other text.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { answers } = req.body || {}
  if (!answers) {
    return res.status(400).json({ error: 'Missing answers' })
  }

  const userPrompt = [
    `Product: ${answers.product}`,
    `Platform/Device: ${answers.platform}`,
    `Feature description: ${answers.feature}`,
    `Video style preference: ${answers.style}`,
    `Color theme preference: ${answers.theme}`,
  ].join('\n')

  try {
    let text

    if (process.env.LLAMA_API_KEY) {
      text = await callLlama(userPrompt)
    } else if (process.env.OPENAI_API_KEY) {
      text = await callOpenAI(userPrompt)
    } else {
      return res.status(200).json({ config: null, source: 'none' })
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in LLM response:', text.slice(0, 500))
      return res.status(200).json({ config: null, source: 'parse_error', raw: text.slice(0, 300) })
    }

    const config = JSON.parse(jsonMatch[0])
    return res.status(200).json({ config, source: process.env.LLAMA_API_KEY ? 'llama' : 'openai' })
  } catch (err) {
    console.error('AI proxy error:', err)
    return res.status(200).json({ config: null, source: 'error', details: err.message })
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
    temperature: 0.6,
    max_completion_tokens: 512,
  })

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  let res

  if (proxyUrl) {
    const { ProxyAgent, fetch: proxyFetch } = await import('undici')
    const dispatcher = new ProxyAgent(proxyUrl)
    res = await proxyFetch(url, { method: 'POST', headers, body: payload, dispatcher })
  } else {
    res = await fetch(url, { method: 'POST', headers, body: payload })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Llama API ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data.completion_message?.content?.text
    || data.completion_message?.content
    || data.choices?.[0]?.message?.content
  if (!text) throw new Error('No text in Llama response: ' + JSON.stringify(data).slice(0, 200))
  return typeof text === 'string' ? text : JSON.stringify(text)
}

async function callOpenAI(userPrompt) {
  const endpoint = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const url = endpoint
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
    max_tokens: 512,
  })

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  let res
  if (proxyUrl) {
    const { ProxyAgent, fetch: proxyFetch } = await import('undici')
    const dispatcher = new ProxyAgent(proxyUrl)
    res = await proxyFetch(url, { method: 'POST', headers, body: payload, dispatcher })
  } else {
    res = await fetch(url, { method: 'POST', headers, body: payload })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || JSON.stringify(data)
}
