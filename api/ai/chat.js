/**
 * Vercel Serverless Function – Conversational AI chat for template generation.
 *
 * Accepts a message history array and returns either a follow-up question
 * or the final generation payload (3 variants + 5 headlines + music + voiceover).
 *
 * Backends: Llama → OpenAI → rule-based fallback
 */

const MUSIC_TRACKS = [
  { id: 'f-1', name: 'Check This Out', mood: 'upbeat, fun, catchy' },
  { id: 'f-2', name: 'Friday The 13th', mood: 'dark, mysterious, edgy' },
  { id: 'f-3', name: 'Happy Days', mood: 'cheerful, bright, optimistic' },
  { id: 'f-4', name: 'I Love You More', mood: 'warm, emotional, gentle' },
  { id: 't-1', name: 'Upbeat Drive', mood: 'energetic, driving, motivational' },
  { id: 't-2', name: 'Chill Electronic', mood: 'relaxed, smooth, modern' },
  { id: 't-3', name: 'Bright Energy', mood: 'positive, lively, vibrant' },
  { id: 't-4', name: 'Smooth Groove', mood: 'laid-back, cool, rhythmic' },
  { id: 't-5', name: 'Positive Vibes', mood: 'happy, uplifting, feel-good' },
  { id: 't-6', name: 'Tech Flow', mood: 'futuristic, clean, tech' },
  { id: 't-7', name: 'Happy Motion', mood: 'playful, bouncy, joyful' },
  { id: 't-8', name: 'Modern Beat', mood: 'contemporary, sleek, professional' },
  { id: 't-9', name: 'Synth Wave', mood: 'retro-futuristic, atmospheric, synth' },
  { id: 't-10', name: 'Digital Sunrise', mood: 'hopeful, fresh, ambient' },
  { id: 't-11', name: 'Ambient Pulse', mood: 'subtle, atmospheric, minimal' },
  { id: 't-12', name: 'Lo-Fi Chill', mood: 'mellow, nostalgic, warm' },
  { id: 't-13', name: 'Funky Rhythm', mood: 'groovy, fun, danceable' },
  { id: 't-14', name: 'Indie Electronic', mood: 'indie, creative, alternative' },
  { id: 't-15', name: 'Deep Focus', mood: 'concentrated, minimal, deep' },
  { id: 't-16', name: 'Neon Nights', mood: 'nightlife, energetic, pulsing' },
  { id: 't-17', name: 'Retro Synth', mood: 'nostalgic, 80s, synth-pop' },
  { id: 't-18', name: 'Electric Dream', mood: 'dreamy, electronic, ethereal' },
  { id: 't-19', name: 'Summer Energy', mood: 'warm, sunny, lively' },
  { id: 't-20', name: 'Future Pop', mood: 'modern, pop, forward-looking' },
]

const SYSTEM_PROMPT = `You are MetaGen AI, a friendly video template creation assistant. You help users create demo and promotional videos for mobile/desktop apps.

Through natural conversation, gather these details (all are needed before generating):
1. **Product** – WhatsApp, WhatsApp Business, Instagram, Facebook, or other
2. **Platform/Device** – iPhone, Android, iPad, Mac/Desktop, or multiple devices
3. **Feature** – What the video should showcase (a brief description)
4. **Style** – Professional showcase, dynamic/energetic, scroll walkthrough, multi-screen, or comparison
5. **Theme** – Dark, light, warm/beige, vibrant green, or auto (AI decides)

CONVERSATION RULES:
- Be concise, friendly, and helpful (1-2 sentences per follow-up).
- If the user gives all info in one message, skip straight to generating.
- Extract implicit info (e.g. "WhatsApp Business archive boosting on Android" gives product, feature, and platform).
- Ask AT MOST 2-3 follow-up questions, only for what's genuinely missing.
- Never repeat info the user already provided.

RESPONSE FORMAT – ALWAYS output valid JSON only (no markdown fences, no explanation text):

When you need more info:
{"action":"ask","message":"Your friendly follow-up question"}

When ready to generate (you have product, platform, feature, and can infer style/theme):
{"action":"generate","variants":[v1,v2,v3],"textOptions":["h1","h2","h3","h4","h5"],"recommendedMusicId":"track-id","voiceoverScript":"10-15 second script"}

VARIANT SCHEMA – each of the 3 variants must follow:
{"label":"Direction name","deviceType":"iphone|android|both|ipad|macbook","animation":string,"outroAnimation":string,"bgColor":string,"whatsappTheme":string|null,"outroLogo":string|null,"textOverlay":{"text":"placeholder","fontSize":number,"color":string,"animation":string},"clipDuration":number,"screenSlotCount":number|null}

AVAILABLE OPTIONS:
- DEVICE TYPES: "iphone", "android", "both", "ipad", "macbook"
- ANIMATIONS (single): "showcase", "orbit", "flip", "scroll", "single", "slideLeft", "slideRight", "slideDown", "slideUp", "slideRightRotate", "slideLeftRotate", "zoomBottomLeft", "zoomTopRight"
- ANIMATIONS (dual, deviceType "both"): "sideBySide"
- ANIMATIONS (laptop): "laptopOpen", "laptopClose"
- ANIMATIONS (multi-device): "sideScroll10", "angled3ZoomOut", "circle4Rotate", "angledZoom4", "carousel6", "flatScatter7", "offsetCircleRotate"
- ANIMATIONS (phone+laptop): "floatingPhoneLaptop", "phoneInFrontLaptop"
- EXIT ANIMATIONS: "none", "slideLeft", "slideRight", "slideDown", "slideUp", "slideLeftRotate", "slideRightRotate", "zoomOut", "flip"
- WHATSAPP THEMES (only for WA products): "wa-dark", "wa-light", "wa-beige", "wa-green"
- OUTRO LOGOS (only with WA themes): "whatsapp", "whatsapp-business"
- BG COLORS: "#CFC4FB", "#A2D5F2", "#BEFAB3", "#FBE5B5", "#F4C3B0", "#F3AFC6", "#D4D6D8", "#A3C9F9", "#A4D9D4", "#0A1014", "#E7FDE3", "#FEF4EB", "#1DAA61"
- TEXT ANIMATIONS: "slideFromLeft", "slideFromRight", "slideFromTop", "slideFromBottom", "none"

GENERATION RULES:
- textOverlay.text in each variant is just a placeholder (user picks from textOptions).
- textOverlay.fontSize: 48 normally, 42 for long text.
- Text color must contrast the background: "#FFFFFF" on dark, "#000000" on light.
- For WhatsApp/WA Business, ALWAYS set whatsappTheme and outroLogo.
- clipDuration: 5 for simple, 6-8 for multi-device.

THE 3 VARIANTS should be meaningfully different:
- Variant 1: Clean/professional – showcase or single animation, subtle background
- Variant 2: Dynamic/energetic – slideRightRotate, orbit, or flip, bolder colors
- Variant 3: Rich/elaborate – multi-device (carousel6, angled3ZoomOut) or unique combo

textOptions: 5 short headlines (max 5 words each) with different tones:
1. Marketing-oriented (catchy, promotional)
2. Feature-focused (descriptive of what it does)
3. Action-oriented (verb-first, calls to action)
4. Minimal (2-3 words)
5. Descriptive (explains the benefit)

MUSIC TRACKS – recommend ONE from:
${MUSIC_TRACKS.map(t => `${t.id}: "${t.name}" (${t.mood})`).join('\n')}

voiceoverScript: A natural 10-15 second narration script (~25-40 words) introducing the feature.

ONLY output JSON. No other text.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages } = req.body || {}
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array' })
  }

  try {
    let text

    if (process.env.LLAMA_API_KEY) {
      text = await callLlama(messages)
    } else if (process.env.OPENAI_API_KEY) {
      text = await callOpenAI(messages)
    } else {
      return res.status(200).json({ action: 'generate', source: 'none', variants: null })
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in chat response:', text.slice(0, 500))
      return res.status(200).json({ action: 'generate', source: 'parse_error', variants: null })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const source = process.env.LLAMA_API_KEY ? 'llama' : 'openai'

    if (parsed.action === 'ask') {
      return res.status(200).json({ action: 'ask', message: parsed.message, source })
    }

    return res.status(200).json({
      action: 'generate',
      variants: parsed.variants || null,
      textOptions: parsed.textOptions || null,
      recommendedMusicId: parsed.recommendedMusicId || null,
      voiceoverScript: parsed.voiceoverScript || null,
      source,
    })
  } catch (err) {
    console.error('AI chat error:', err)
    return res.status(200).json({ action: 'generate', source: 'error', variants: null, details: err.message })
  }
}

async function callLlama(messages) {
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
      ...messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_completion_tokens: 1500,
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
  if (!text) throw new Error('No text in Llama response: ' + JSON.stringify(data).slice(0, 200))
  return typeof text === 'string' ? text : JSON.stringify(text)
}

async function callOpenAI(messages) {
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
      ...messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 1500,
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
