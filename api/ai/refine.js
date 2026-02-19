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
      const delta = fallbackRefine(instruction, currentConfig)
      return res.status(200).json({ delta, source: 'local' })
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      const delta = fallbackRefine(instruction, currentConfig)
      return res.status(200).json({ delta, source: 'local_fallback' })
    }

    const delta = JSON.parse(jsonMatch[0])
    return res.status(200).json({ delta, source: process.env.LLAMA_API_KEY ? 'llama' : 'openai' })
  } catch (err) {
    console.error('AI refine error:', err)
    const delta = fallbackRefine(instruction, currentConfig)
    return res.status(200).json({ delta, source: 'local_fallback' })
  }
}

const COLOR_MAP = {
  red: '#E74C3C', blue: '#A3C9F9', green: '#1DAA61', yellow: '#FBE5B5',
  orange: '#F4C3B0', pink: '#F3AFC6', purple: '#CFC4FB', lavender: '#CFC4FB',
  teal: '#A4D9D4', cyan: '#A4D9D4', white: '#FFFFFF', black: '#0A1014',
  grey: '#D4D6D8', gray: '#D4D6D8', silver: '#D4D6D8', beige: '#FEF4EB',
  mint: '#BEFAB3', peach: '#F4C3B0', sky: '#A2D5F2',
}

const ANIMATION_MAP = {
  showcase: 'showcase', orbit: 'orbit', flip: 'flip', scroll: 'scroll',
  'side by side': 'sideBySide', single: 'single',
  'slide left': 'slideLeft', 'slide right': 'slideRight',
  'slide up': 'slideUp', 'slide down': 'slideDown',
  rotate: 'slideRightRotate', spin: 'orbit',
  zoom: 'zoomBottomLeft', carousel: 'carousel6',
  'laptop open': 'laptopOpen', 'laptop close': 'laptopClose',
}

function fallbackRefine(instruction, currentConfig) {
  const lower = instruction.toLowerCase().trim()
  const delta = {}

  // --- Background color ---
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(name) && (lower.includes('background') || lower.includes('bg') || lower.includes('color'))) {
      delta.bgColor = hex
      const isDark = ['#0A1014', '#E74C3C'].includes(hex) || name === 'black'
      delta.textOverlay = { color: isDark ? '#FFFFFF' : '#000000' }
      break
    }
  }

  // --- Dark / light theme ---
  if (/\b(dark|darker)\b/.test(lower) && !delta.bgColor) {
    delta.bgColor = '#0A1014'
    delta.textOverlay = { color: '#FFFFFF' }
  } else if (/\b(light|lighter|bright|brighter)\b/.test(lower) && !delta.bgColor) {
    delta.bgColor = '#E7FDE3'
    delta.textOverlay = { color: '#000000' }
  }

  // --- WhatsApp themes ---
  if (/whatsapp\s*dark|wa[\s-]*dark/.test(lower)) {
    delta.whatsappTheme = 'wa-dark'; delta.bgColor = '#0A1014'
    delta.textOverlay = { color: '#FFFFFF' }
  } else if (/whatsapp\s*light|wa[\s-]*light/.test(lower)) {
    delta.whatsappTheme = 'wa-light'; delta.bgColor = '#E7FDE3'
    delta.textOverlay = { color: '#000000' }
  } else if (/whatsapp\s*beige|wa[\s-]*beige|warm\s*theme/.test(lower)) {
    delta.whatsappTheme = 'wa-beige'; delta.bgColor = '#FEF4EB'
    delta.textOverlay = { color: '#000000' }
  } else if (/whatsapp\s*green|wa[\s-]*green|vibrant/.test(lower)) {
    delta.whatsappTheme = 'wa-green'; delta.bgColor = '#1DAA61'
    delta.textOverlay = { color: '#FFFFFF' }
  }

  // --- Standalone color (no "background" keyword) ---
  if (!delta.bgColor) {
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      const re = new RegExp(`\\b${name}\\b`)
      if (re.test(lower) && !/text|font|heading/.test(lower)) {
        delta.bgColor = hex
        const isDark = ['#0A1014'].includes(hex) || name === 'black'
        delta.textOverlay = { ...(delta.textOverlay || {}), color: isDark ? '#FFFFFF' : '#000000' }
        break
      }
    }
  }

  // --- Text color ---
  if (/white\s*text|text\s*white/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), color: '#FFFFFF' }
  } else if (/black\s*text|text\s*black/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), color: '#000000' }
  }

  // --- Font size ---
  if (/\b(bigger|larger|increase|big)\b.*\b(text|font|heading)\b|\b(text|font|heading)\b.*\b(bigger|larger|increase|big)\b/.test(lower)) {
    const cur = currentConfig?.textOverlay?.fontSize || 48
    delta.textOverlay = { ...(delta.textOverlay || {}), fontSize: Math.min(cur + 8, 80) }
  } else if (/\b(smaller|reduce|decrease|tiny|small)\b.*\b(text|font|heading)\b|\b(text|font|heading)\b.*\b(smaller|reduce|decrease|tiny|small)\b/.test(lower)) {
    const cur = currentConfig?.textOverlay?.fontSize || 48
    delta.textOverlay = { ...(delta.textOverlay || {}), fontSize: Math.max(cur - 8, 24) }
  }

  // --- Animation ---
  for (const [keyword, anim] of Object.entries(ANIMATION_MAP)) {
    if (lower.includes(keyword)) {
      delta.animation = anim
      break
    }
  }

  // --- Device type ---
  if (/\bandroid\b/.test(lower)) delta.deviceType = 'android'
  else if (/\biphone\b|\bios\b/.test(lower)) delta.deviceType = 'iphone'
  else if (/\bipad\b|\btablet\b/.test(lower)) delta.deviceType = 'ipad'
  else if (/\bmac\b|\blaptop\b|\bdesktop\b/.test(lower)) delta.deviceType = 'macbook'
  else if (/\bdual\b|\bboth\b/.test(lower)) delta.deviceType = 'both'

  // --- Clip duration ---
  const durMatch = lower.match(/(\d+)\s*(?:sec|second|s\b)/)
  if (durMatch) delta.clipDuration = Math.min(Math.max(parseInt(durMatch[1]), 2), 15)
  if (/\b(longer|slow)\b/.test(lower) && !durMatch) delta.clipDuration = (currentConfig?.clipDuration || 5) + 2
  if (/\b(shorter|fast|quick)\b/.test(lower) && !durMatch) delta.clipDuration = Math.max((currentConfig?.clipDuration || 5) - 2, 2)

  // --- Text animation ---
  if (/text.*from.*left|slide.*left.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromLeft' }
  else if (/text.*from.*right|slide.*right.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromRight' }
  else if (/text.*from.*top|slide.*top.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromTop' }
  else if (/text.*from.*bottom|slide.*bottom.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromBottom' }

  // --- Remove outro ---
  if (/no\s*outro|remove\s*outro|disable\s*outro/.test(lower)) delta.outroAnimation = 'none'
  if (/zoom\s*out\s*outro/.test(lower)) delta.outroAnimation = 'zoomOut'

  return Object.keys(delta).length > 0 ? delta : null
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
