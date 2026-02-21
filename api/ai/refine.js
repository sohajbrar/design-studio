/**
 * Vercel Serverless Function – AI refinement for in-editor natural language commands.
 *
 * Accepts the current config + a user instruction, returns a partial config delta.
 */

const SYSTEM_PROMPT = `You are a video template refinement assistant. The user has an existing video template and wants to make changes using natural language.

Given the current config and a user instruction, return ONLY a JSON object containing the fields that should change. Only include fields that need updating.

AVAILABLE OPTIONS:

Templates (switching to a template applies a complete preset — animation, colors, text, music, device, etc.):
- templateId: one of these IDs to switch to that template:
  "app-showcase" (App Showcase — cinematic sweep, iPhone, purple bg)
  "product-launch" (Product Launch — flip entry, iPhone, blue bg)
  "dual-device" (Dual Device — iPhone & Android side by side, green bg)
  "minimal-scroll" (Minimal Scroll — vertical pan, iPhone, yellow bg)
  "laptop-demo" (Laptop Demo — MacBook lid-open reveal, peach bg)
  "ipad-present" (iPad Presentation — tablet showcase, pink bg)
  "dynamic-intro" (Dynamic Intro — spin + slide, iPhone, grey bg)
  "orbit-view" (Orbit View — 360° rotation, Android, blue bg)
  "quick-promo" (Quick Promo — fast slide-up, iPhone, teal bg)
  "zoom-focus" (Zoom Focus — corner zoom entrance, iPhone, purple bg)
  "single-hero" (Single Hero — cinematic close-up, iPhone, blue bg)
  "slide-clean" (Clean Slide — simple left entrance, Android, green bg)
  "side-scroll-10" (Side Scroll — 10 devices scrolling, multi-device)
  "angled-3" (Triple Angled — 3 phones angled zoom out, multi-device)
  "circle-4" (Circle Spin — 4 phones rotating circle, multi-device)
  "angled-zoom-4" (Angled Zoom — 4 phones dramatic angles, multi-device)
  "carousel-6" (Carousel — 6 phones offset carousel, multi-device)
  "floating-phone-laptop" (Phone + Laptop — floating showcase, multi-device)
  "phone-front-laptop" (Phone on Laptop — phone slides in front, multi-device)
  "flat-scatter" (Flat Grid — 7 phones lying flat, multi-device)
  "offset-circle" (Offset Ring — phones in offset circle, multi-device)
- When user asks to "switch template" or names a template, return ONLY {"templateId":"<id>"}. Do NOT combine templateId with other fields.

Device & Animation:
- deviceType: "iphone", "android", "both", "ipad", "macbook"
- animation (device entrance): "showcase", "orbit", "flip", "scroll", "single", "slideLeft", "slideRight", "slideDown", "slideUp", "slideRightRotate", "slideLeftRotate", "zoomBottomLeft", "zoomTopRight", "heroRise", "sideBySide", "laptopOpen", "laptopClose", "sideScroll10", "angled3ZoomOut", "circle4Rotate", "angledZoom4", "carousel6", "flatScatter7", "offsetCircleRotate", "floatingPhoneLaptop", "phoneInFrontLaptop"
- outroAnimation: "none", "slideLeft", "slideRight", "slideDown", "slideUp", "slideLeftRotate", "slideRightRotate", "zoomOut", "flip"

Background & Appearance:
- bgColor: any hex color string
- bgGradient: boolean (true = gradient overlay on background, false = solid color)
- showBase: boolean (true = show contact shadow under device, false = hide)
- showDeviceShadow: boolean (true = show per-device floating drop shadow, false = hide)
- whatsappTheme: "wa-dark", "wa-light", "wa-beige", "wa-green", or null

Text Overlay:
- textOverlay: {"text":string,"fontSize":number,"color":string,"animation":string,"posY":number}
- textOverlay.posY: 0.45 = top, 0 = center, -0.45 = bottom (vertical text position, meaningful in horizontal layout)
- textOverlay.animation: "slideFromLeft", "slideFromRight", "slideFromTop", "slideFromBottom", "none"
- textSplit: number 0.25-0.75 (how much space text takes vs device; 0.5 = even split)
- layoutFlipped: boolean (swap text and device positions)

Timing & Zoom:
- clipDuration: number (seconds, 2-15)
- addZoom: boolean (true = add a 2x zoom effect at the current time)
- removeZoom: boolean (true = remove all zoom effects)

Aspect Ratio:
- aspectRatio: "none", "16:9", "9:16", "1:1", "4:5", "4:3" (canvas shape)

Logo:
- outroLogo: "whatsapp", "whatsapp-business", or null

Music:
- musicId: string (library track ID to set as background music) or null (to remove music)
  Available tracks: "f-5" (Beautiful, You Are), "f-6" (Easy To Love), "f-7" (Good Intentions), "f-8" (Knockout), "f-9" (Paint Me Happy), "f-10" (Pink Confetti), "f-11" (Take Me Home), "f-1" (Check This Out), "f-2" (Friday The 13th), "f-3" (Happy Days), "f-4" (I Love You More), "t-1" (Upbeat Drive), "t-2" (Chill Electronic), "t-3" (Bright Energy), "t-4" (Smooth Groove), "t-5" (Positive Vibes), "t-6" (Tech Flow), "t-7" (Happy Motion), "t-8" (Modern Beat), "t-9" (Synth Wave), "t-10" (Digital Sunrise), "t-11" (Ambient Pulse), "t-12" (Lo-Fi Chill), "t-13" (Funky Rhythm), "t-14" (Indie Electronic), "t-15" (Deep Focus), "t-16" (Neon Nights), "t-17" (Retro Synth), "t-18" (Electric Dream), "t-19" (Summer Energy), "t-20" (Future Pop)

Timeline:
- clipDuration: number (change duration of current/all clips, in seconds, 2-30)
- totalDuration: number (desired total video length in seconds — all clips will be scaled proportionally)
- addTextOverlay: boolean (true = add a new text overlay at the current playback time)
- removeTextOverlay: boolean (true = remove all text overlays)
- textOverlay.startTime: number (when text appears, in seconds from video start)
- textOverlay.endTime: number (when text disappears, in seconds from video start)
- musicVolume: number 0-1 (music track volume, 0.5 default)

Export Settings:
- quality: "720p", "1080p", "4k"
- exportFormat: "mp4", "webm", "gif"

LAYOUT BEHAVIOR:
- When textOverlay.animation is "slideFromLeft" or "slideFromRight", text and device are arranged SIDE BY SIDE (horizontal split)
- When textOverlay.animation is "slideFromTop" or "slideFromBottom", text and device STACK VERTICALLY (text above or below the device)
- "slideFromTop" → text appears on top, device moves to bottom half
- "slideFromBottom" → text appears on bottom, device moves to top half
- textSplit controls how much space the text region takes (0.5 = half, 0.6 = text gets 60%)

CRITICAL DISTINCTION — "animation" vs "textOverlay":
- "animation" controls the DEVICE/phone entrance movement (how the phone slides/rotates in)
- "textOverlay.animation" controls how the TEXT appears (slide from left/right/top/bottom) AND determines layout direction
- "textOverlay.posY" controls WHERE the text is positioned vertically within its region
- When the user says "move text to center/top/bottom", change textOverlay.posY
- When the user says "stack vertically", "text above device" → textOverlay.animation: "slideFromTop"
- When the user says "text below device" → textOverlay.animation: "slideFromBottom"
- When the user says "side by side", "text on left/right" → textOverlay.animation to slideFromLeft/slideFromRight
- When the user says "orbit animation", "flip animation" → change animation (device)

MUSIC MATCHING:
- When user asks for music, pick the best matching track from the available list.
- "upbeat"/"energetic" → "t-1" or "t-3". "chill"/"relaxed" → "t-2" or "t-12". "happy" → "t-7" or "f-3".
- "remove music"/"no music" → musicId: null
- If user names a specific track, use the matching ID.

RULES:
- Only return changed fields as a flat delta object.
- For textOverlay changes, return the textOverlay object with only modified sub-fields.
- When user asks to change or switch to a template, return ONLY {"templateId":"<id>"}. A template applies all settings at once.
- "switch to product launch" → {"templateId":"product-launch"}. "use carousel template" → {"templateId":"carousel-6"}.
- "use a laptop template" → {"templateId":"laptop-demo"}. "show multiple devices" → pick a multi-device template.
- "dual device" → {"templateId":"dual-device"}. "phone and laptop" → {"templateId":"floating-phone-laptop"}.
- Interpret natural language: "make it dark" → bgColor + text color, "bigger text" → fontSize, "zoom in" → addZoom: true, etc.
- "add gradient" → bgGradient: true. "remove gradient" → bgGradient: false.
- "show shadow"/"base shadow" → showBase: true. "hide shadow"/"no shadow" → showBase: false.
- "device shadow"/"floating shadow"/"drop shadow" → showDeviceShadow: true. "remove device shadow" → showDeviceShadow: false.
- "zoom in"/"add zoom" → addZoom: true. "remove zoom"/"no zoom" → removeZoom: true.
- "landscape" → aspectRatio: "16:9". "portrait" → aspectRatio: "9:16". "square" → aspectRatio: "1:1".
- "play some music"/"add music" → pick a suitable musicId. "stop music"/"remove music" → musicId: null.
- "more space for text" → increase textSplit. "more space for device" → decrease textSplit.
- "make it longer"/"extend video" → increase totalDuration or clipDuration. "shorter video" → decrease totalDuration or clipDuration.
- "make it 10 seconds" → totalDuration: 10. "each clip 5 seconds" → clipDuration: 5.
- "add text"/"new text overlay" → addTextOverlay: true. "remove all text" → removeTextOverlay: true.
- "show text for first 3 seconds" → textOverlay: { startTime: 0, endTime: 3 }.
- "louder music" → musicVolume: 0.8. "quieter music"/"lower volume" → musicVolume: 0.3. "mute music" → musicVolume: 0.
- Keep responses minimal and precise.
- ONLY output JSON. No explanation, no markdown.

Example input: "Make the background blue and text bigger"
Example output: {"bgColor":"#A3C9F9","textOverlay":{"fontSize":56}}

Example input: "Switch to orbit animation"
Example output: {"animation":"orbit"}

Example input: "Add a gradient and show the shadow"
Example output: {"bgGradient":true,"showBase":true}

Example input: "Add a device shadow to make it look like it's floating"
Example output: {"showDeviceShadow":true}

Example input: "Make it square and add some chill music"
Example output: {"aspectRatio":"1:1","musicId":"t-2"}

Example input: "Zoom in on the device"
Example output: {"addZoom":true}

Example input: "Make it portrait for Instagram"
Example output: {"aspectRatio":"9:16"}

Example input: "Remove the music and add a WhatsApp logo at the end"
Example output: {"musicId":null,"outroLogo":"whatsapp"}

Example input: "Give the text more space"
Example output: {"textSplit":0.6}

Example input: "Set quality to 4k"
Example output: {"quality":"4k"}

Example input: "Make it dark with white text"
Example output: {"bgColor":"#0A1014","textOverlay":{"color":"#FFFFFF"}}

Example input: "Make the video 10 seconds long"
Example output: {"totalDuration":10}

Example input: "Show the text only for the first 3 seconds"
Example output: {"textOverlay":{"startTime":0,"endTime":3}}

Example input: "Lower the music volume"
Example output: {"musicVolume":0.3}

Example input: "Add a new text overlay"
Example output: {"addTextOverlay":true}

Example input: "Export as gif in 720p"
Example output: {"exportFormat":"gif","quality":"720p"}

Example input: "Switch to the product launch template"
Example output: {"templateId":"product-launch"}

Example input: "Use the carousel template"
Example output: {"templateId":"carousel-6"}

Example input: "Show me a laptop demo"
Example output: {"templateId":"laptop-demo"}

Example input: "I want to show multiple phones"
Example output: {"templateId":"side-scroll-10"}`

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
  zoom: 'zoomBottomLeft', carousel: 'carousel6', 'hero rise': 'heroRise', 'hero': 'heroRise', 'rise': 'heroRise',
  'laptop open': 'laptopOpen', 'laptop close': 'laptopClose',
}

const TEMPLATE_MAP = {
  'app showcase': 'app-showcase', 'showcase': 'app-showcase',
  'product launch': 'product-launch', 'launch': 'product-launch',
  'dual device': 'dual-device', 'dual': 'dual-device', 'side by side devices': 'dual-device',
  'minimal scroll': 'minimal-scroll', 'scroll template': 'minimal-scroll',
  'laptop demo': 'laptop-demo', 'macbook': 'laptop-demo', 'laptop': 'laptop-demo',
  'ipad': 'ipad-present', 'ipad presentation': 'ipad-present', 'tablet': 'ipad-present',
  'dynamic intro': 'dynamic-intro', 'dynamic': 'dynamic-intro',
  'orbit view': 'orbit-view', '360': 'orbit-view',
  'quick promo': 'quick-promo', 'promo': 'quick-promo',
  'zoom focus': 'zoom-focus',
  'single hero': 'single-hero', 'hero': 'single-hero',
  'clean slide': 'slide-clean',
  'side scroll': 'side-scroll-10', '10 devices': 'side-scroll-10', '10 phones': 'side-scroll-10', 'multiple phones': 'side-scroll-10',
  'triple angled': 'angled-3', '3 phones': 'angled-3', 'three phones': 'angled-3',
  'circle spin': 'circle-4', '4 phones circle': 'circle-4', 'circle': 'circle-4',
  'angled zoom': 'angled-zoom-4', '4 phones angled': 'angled-zoom-4',
  'carousel': 'carousel-6', '6 phones': 'carousel-6',
  'phone.*laptop': 'floating-phone-laptop', 'phone and laptop': 'floating-phone-laptop', 'phone + laptop': 'floating-phone-laptop',
  'phone on laptop': 'phone-front-laptop', 'phone front laptop': 'phone-front-laptop',
  'flat grid': 'flat-scatter', 'flat scatter': 'flat-scatter', '7 phones': 'flat-scatter',
  'offset ring': 'offset-circle', 'offset circle': 'offset-circle',
}

function fallbackRefine(instruction, currentConfig) {
  const lower = instruction.toLowerCase().trim()
  const delta = {}

  // --- Template switching ---
  if (/switch.*template|change.*template|use.*template|apply.*template|template/.test(lower)) {
    for (const [keyword, id] of Object.entries(TEMPLATE_MAP)) {
      if (lower.includes(keyword)) {
        return { templateId: id }
      }
    }
  }
  // Also match template names without the word "template"
  for (const [keyword, id] of Object.entries(TEMPLATE_MAP)) {
    if (keyword.length > 5 && lower.includes(keyword) && /switch|change|use|apply|try|show me/.test(lower)) {
      return { templateId: id }
    }
  }

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

  // --- Duration / video length ---
  const durMatch = lower.match(/(\d+)\s*(?:sec|second|s\b)/)
  if (durMatch) {
    const secs = parseInt(durMatch[1])
    if (/\b(total|video|length|long)\b/.test(lower)) {
      delta.totalDuration = Math.min(Math.max(secs, 2), 60)
    } else if (/\b(clip|each)\b/.test(lower)) {
      delta.clipDuration = Math.min(Math.max(secs, 2), 30)
    } else {
      delta.totalDuration = Math.min(Math.max(secs, 2), 60)
    }
  }
  if (/\b(longer|extend|slow)\b/.test(lower) && !durMatch) {
    delta.totalDuration = (currentConfig?.totalDuration || currentConfig?.clipDuration || 5) + 3
  }
  if (/\b(shorter|fast|quick|trim)\b/.test(lower) && !durMatch) {
    delta.totalDuration = Math.max((currentConfig?.totalDuration || currentConfig?.clipDuration || 5) - 3, 2)
  }

  // --- Text position ---
  if (/\b(center|middle)\b.*\b(text|heading|title)\b|\b(text|heading|title)\b.*\b(center|middle)\b|move.*text.*center|center.*align|text.*center/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), posY: 0 }
  } else if (/\b(top)\b.*\b(text|heading|title)\b|\b(text|heading|title)\b.*\b(top)\b|move.*text.*top|text.*up/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), posY: 0.45 }
  } else if (/\b(bottom)\b.*\b(text|heading|title)\b|\b(text|heading|title)\b.*\b(bottom)\b|move.*text.*bottom|text.*down/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), posY: -0.45 }
  }

  // --- Vertical / horizontal stacking commands ---
  if (/text\s*(above|on\s*top|over)\s*(the\s*)?(device|phone)|stack.*vertical.*text.*top|text.*top.*device/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromTop' }
  } else if (/text\s*(below|under|beneath|underneath)\s*(the\s*)?(device|phone)|stack.*vertical.*text.*bottom|text.*bottom.*device/.test(lower)) {
    delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromBottom' }
  } else if (/side\s*by\s*side|text.*(?:left|right)\s*(?:of|side)|horizontal\s*layout/.test(lower)) {
    if (/right/.test(lower)) {
      delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromRight' }
    } else {
      delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromLeft' }
    }
  }

  // --- Text animation ---
  if (!delta.textOverlay?.animation) {
    if (/text.*from.*left|slide.*left.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromLeft' }
    else if (/text.*from.*right|slide.*right.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromRight' }
    else if (/text.*from.*top|slide.*top.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromTop' }
    else if (/text.*from.*bottom|slide.*bottom.*text/.test(lower)) delta.textOverlay = { ...(delta.textOverlay || {}), animation: 'slideFromBottom' }
  }

  // --- Outro animation ---
  if (/no\s*outro|remove\s*outro|disable\s*outro/.test(lower)) delta.outroAnimation = 'none'
  if (/zoom\s*out\s*outro/.test(lower)) delta.outroAnimation = 'zoomOut'
  if (/slide\s*left\s*outro/.test(lower)) delta.outroAnimation = 'slideLeft'
  if (/slide\s*right\s*outro/.test(lower)) delta.outroAnimation = 'slideRight'
  if (/flip\s*outro/.test(lower)) delta.outroAnimation = 'flip'

  // --- Gradient overlay ---
  if (/add\s*gradient|enable\s*gradient|gradient\s*on|show\s*gradient/.test(lower)) delta.bgGradient = true
  else if (/remove\s*gradient|disable\s*gradient|no\s*gradient|gradient\s*off|hide\s*gradient/.test(lower)) delta.bgGradient = false

  // --- Base shadow ---
  if (/show\s*shadow|add\s*shadow|enable\s*shadow|shadow\s*on|show\s*base|base\s*shadow/.test(lower)) delta.showBase = true
  else if (/hide\s*shadow|remove\s*shadow|no\s*shadow|shadow\s*off|hide\s*base|remove\s*base/.test(lower)) delta.showBase = false

  // --- Device shadow (floating drop shadow) ---
  if (/device\s*shadow|floating\s*shadow|drop\s*shadow|float.*shadow/.test(lower)) delta.showDeviceShadow = true
  else if (/remove\s*device\s*shadow|no\s*device\s*shadow|hide\s*device\s*shadow/.test(lower)) delta.showDeviceShadow = false

  // --- Zoom ---
  if (/add\s*zoom|zoom\s*in|enable\s*zoom/.test(lower)) delta.addZoom = true
  else if (/remove\s*zoom|no\s*zoom|disable\s*zoom|clear\s*zoom/.test(lower)) delta.removeZoom = true

  // --- Aspect ratio ---
  if (/\b(landscape)\b|16.?9/.test(lower)) delta.aspectRatio = '16:9'
  else if (/\b(portrait)\b|9.?16/.test(lower)) delta.aspectRatio = '9:16'
  else if (/\b(square)\b|1.?1/.test(lower)) delta.aspectRatio = '1:1'
  else if (/4.?5|\bfeed\b/.test(lower)) delta.aspectRatio = '4:5'
  else if (/4.?3|\bclassic\b/.test(lower)) delta.aspectRatio = '4:3'
  else if (/\b(full|none|reset)\b.*\b(aspect|ratio)\b|\b(aspect|ratio)\b.*\b(full|none|reset)\b/.test(lower)) delta.aspectRatio = 'none'

  // --- Logo ---
  if (/whatsapp\s*business\s*logo|smb\s*logo|business\s*logo/.test(lower)) delta.outroLogo = 'whatsapp-business'
  else if (/whatsapp\s*logo|wa\s*logo|add\s*logo/.test(lower)) delta.outroLogo = 'whatsapp'
  else if (/remove\s*logo|no\s*logo|hide\s*logo/.test(lower)) delta.outroLogo = null

  // --- Music ---
  if (/remove\s*music|no\s*music|stop\s*music|mute\s*music|disable\s*music/.test(lower)) {
    delta.musicId = null
  } else if (/add\s*music|play\s*music|some\s*music|background\s*music/.test(lower)) {
    if (/chill|relax|calm|lo.?fi/.test(lower)) delta.musicId = 't-2'
    else if (/upbeat|energetic|energy|fast/.test(lower)) delta.musicId = 't-1'
    else if (/happy|joy|cheerful/.test(lower)) delta.musicId = 'f-3'
    else if (/modern|tech|digital/.test(lower)) delta.musicId = 't-8'
    else if (/retro|synth|synthwave/.test(lower)) delta.musicId = 't-17'
    else if (/funky|groove|groovy/.test(lower)) delta.musicId = 't-13'
    else if (/ambient|focus|deep/.test(lower)) delta.musicId = 't-15'
    else if (/neon|night/.test(lower)) delta.musicId = 't-16'
    else delta.musicId = 'f-5'
  } else {
    const musicMatch = lower.match(/\bmusic.*?(?:to|with|called|named)\s+["']?([^"']+)["']?/i)
    if (musicMatch) {
      const name = musicMatch[1].toLowerCase().trim()
      const TRACK_MAP = {
        'beautiful': 'f-5', 'easy to love': 'f-6', 'good intentions': 'f-7',
        'knockout': 'f-8', 'paint me happy': 'f-9', 'pink confetti': 'f-10',
        'take me home': 'f-11', 'check this out': 'f-1', 'friday': 'f-2',
        'happy days': 'f-3', 'i love you': 'f-4', 'upbeat': 't-1',
        'chill': 't-2', 'bright': 't-3', 'smooth': 't-4', 'positive': 't-5',
        'tech': 't-6', 'happy': 't-7', 'modern': 't-8', 'synth wave': 't-9',
        'digital': 't-10', 'ambient': 't-11', 'lo-fi': 't-12', 'lofi': 't-12',
        'funky': 't-13', 'indie': 't-14', 'focus': 't-15', 'neon': 't-16',
        'retro': 't-17', 'electric': 't-18', 'summer': 't-19', 'future': 't-20',
      }
      for (const [keyword, id] of Object.entries(TRACK_MAP)) {
        if (name.includes(keyword)) { delta.musicId = id; break }
      }
    }
  }

  // --- Text split ---
  if (/more\s*space.*text|text.*more\s*space|bigger\s*text\s*area|expand\s*text/.test(lower)) {
    delta.textSplit = Math.min((currentConfig?.textSplit || 0.5) + 0.1, 0.75)
  } else if (/more\s*space.*device|device.*more\s*space|bigger\s*device|smaller\s*text\s*area|shrink\s*text/.test(lower)) {
    delta.textSplit = Math.max((currentConfig?.textSplit || 0.5) - 0.1, 0.25)
  }
  const splitMatch = lower.match(/text\s*split\s*(?:to\s*)?(\d+(?:\.\d+)?)|split\s*(\d+(?:\.\d+)?)/)
  if (splitMatch) {
    const val = parseFloat(splitMatch[1] || splitMatch[2])
    if (val > 0 && val <= 1) delta.textSplit = Math.min(0.75, Math.max(0.25, val))
  }

  // --- Layout flip ---
  if (/flip\s*layout|swap\s*layout|swap\s*sides|flip\s*text|swap\s*text\s*and\s*device/.test(lower)) {
    delta.layoutFlipped = !(currentConfig?.layoutFlipped || false)
  }

  // --- Quality ---
  if (/\b4k\b|ultra\s*hd/.test(lower)) delta.quality = '4k'
  else if (/\b1080p?\b|full\s*hd/.test(lower)) delta.quality = '1080p'
  else if (/\b720p?\b/.test(lower)) delta.quality = '720p'

  // --- Export format ---
  if (/\bwebm\b/.test(lower)) delta.exportFormat = 'webm'
  else if (/\bgif\b/.test(lower)) delta.exportFormat = 'gif'
  else if (/\bmp4\b/.test(lower)) delta.exportFormat = 'mp4'

  // --- Add / remove text overlay ---
  if (/add\s*(?:new\s*)?text|new\s*text\s*overlay/.test(lower)) delta.addTextOverlay = true
  else if (/remove\s*(?:all\s*)?text|clear\s*text|delete\s*text|no\s*text/.test(lower)) delta.removeTextOverlay = true

  // --- Text timing ---
  const textTimingMatch = lower.match(/text.*?(?:for|first|last)\s*(\d+)\s*(?:sec|second|s\b)/)
  if (textTimingMatch) {
    const secs = parseInt(textTimingMatch[1])
    if (/first/.test(lower)) {
      delta.textOverlay = { ...(delta.textOverlay || {}), startTime: 0, endTime: secs }
    } else if (/last/.test(lower)) {
      const total = currentConfig?.totalDuration || 6
      delta.textOverlay = { ...(delta.textOverlay || {}), startTime: Math.max(0, total - secs), endTime: total }
    } else {
      delta.textOverlay = { ...(delta.textOverlay || {}), startTime: 0, endTime: secs }
    }
  }

  // --- Music volume ---
  if (/louder\s*music|increase.*volume|music.*louder|volume\s*up|turn\s*up/.test(lower)) {
    delta.musicVolume = Math.min((currentConfig?.musicVolume || 0.5) + 0.2, 1)
  } else if (/quieter\s*music|lower.*volume|music.*quieter|volume\s*down|turn\s*down|softer/.test(lower)) {
    delta.musicVolume = Math.max((currentConfig?.musicVolume || 0.5) - 0.2, 0.05)
  } else if (/mute\s*music|music.*mute|silence\s*music/.test(lower)) {
    delta.musicVolume = 0
  } else if (/full\s*volume|max\s*volume/.test(lower)) {
    delta.musicVolume = 1
  }
  const volMatch = lower.match(/volume\s*(?:to\s*)?(\d+(?:\.\d+)?)\s*%?/)
  if (volMatch) {
    let v = parseFloat(volMatch[1])
    if (v > 1) v = v / 100
    delta.musicVolume = Math.min(1, Math.max(0, v))
  }

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
