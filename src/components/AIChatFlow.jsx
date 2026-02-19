import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react'
import './AIChatFlow.css'

const MiniPreviewCanvas = lazy(() => import('./MiniPreview'))

const STARDUST_ICON = (size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" /><path d="M22 5h-4" />
    <path d="M4 17v2" /><path d="M5 18H3" />
  </svg>
)

function buildFallbackConfig(text) {
  const lower = text.toLowerCase()
  const isWA = /whatsapp|wa\b/i.test(lower)
  const isBiz = /business|smb/i.test(lower)
  const isAndroid = /android/i.test(lower)
  const isMac = /mac|desktop|laptop/i.test(lower)
  const isIPad = /ipad|tablet/i.test(lower)
  const isDark = /dark/i.test(lower)
  const isLight = /light|bright/i.test(lower)

  const deviceType = isMac ? 'macbook' : isIPad ? 'ipad' : isAndroid ? 'android' : 'iphone'
  const animation = isMac ? 'laptopOpen' : 'showcase'
  let bgColor = '#CFC4FB'
  let textColor = '#000000'
  let whatsappTheme = null
  let outroLogo = null

  if (isWA) {
    whatsappTheme = isDark ? 'wa-dark' : isLight ? 'wa-light' : 'wa-dark'
    outroLogo = isBiz ? 'whatsapp-business' : 'whatsapp'
    bgColor = isDark ? '#0A1014' : isLight ? '#E7FDE3' : '#0A1014'
    textColor = isDark || !isLight ? '#FFFFFF' : '#000000'
  } else if (isDark) {
    bgColor = '#0A1014'; textColor = '#FFFFFF'
  } else if (isLight) {
    bgColor = '#E7FDE3'
  }

  const words = lower.replace(/[^a-z0-9 ]/g, '').split(' ')
    .filter(w => w.length > 3 && !['want', 'need', 'create', 'make', 'video', 'demo', 'feature', 'android', 'iphone', 'whatsapp', 'business', 'dark', 'light'].includes(w))
    .slice(0, 4)
  const headline = words.length > 0
    ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'New Feature'

  return {
    label: 'Auto Generated',
    deviceType,
    animation,
    outroAnimation: 'zoomOut',
    bgColor,
    whatsappTheme,
    outroLogo,
    textOverlay: {
      text: headline,
      fontSize: 48,
      color: textColor,
      animation: 'slideFromBottom',
    },
    clipDuration: 5,
    screenSlotCount: null,
  }
}

function VariantCard({ variant, index, selected, onSelect }) {
  const labels = ['A', 'B', 'C']
  return (
    <button
      className={`variant-card ${selected ? 'variant-card-selected' : ''}`}
      onClick={() => onSelect(index)}
    >
      <div className="variant-preview" style={{ background: variant.bgColor }}>
        <Suspense fallback={
          <div className="variant-preview-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
              <rect x="6" y="2" width="12" height="20" rx="2" />
            </svg>
          </div>
        }>
          <MiniPreviewCanvas
            animation={variant.animation}
            bgColor={variant.bgColor}
            deviceType={variant.deviceType}
          />
        </Suspense>
      </div>
      <div className="variant-info">
        <span className="variant-label">Option {labels[index]}</span>
        <span className="variant-desc">{variant.label}</span>
      </div>
    </button>
  )
}

export default function AIChatFlow({ onComplete, onCancel }) {
  const [messages, setMessages] = useState([])
  const [textInput, setTextInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [phase, setPhase] = useState('chat')
  const [variants, setVariants] = useState(null)
  const [textOptions, setTextOptions] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [selectedHeadline, setSelectedHeadline] = useState(null)
  const [recommendedMusicId, setRecommendedMusicId] = useState(null)
  const [voiceoverScript, setVoiceoverScript] = useState(null)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const conversationRef = useRef([])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, phase, scrollToBottom])

  const pushBotMsg = useCallback((text) => {
    setIsTyping(true)
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsTyping(false)
        setMessages((prev) => [...prev, { role: 'bot', text }])
        conversationRef.current.push({ role: 'bot', content: text })
        resolve()
      }, 400 + Math.random() * 300)
    })
  }, [])

  useEffect(() => {
    pushBotMsg("Hi! Tell me about the video you'd like to create. For example:\n\n\"I need an Android demo video for the new WhatsApp Business archive status boosting feature, make it look professional and dark\"\n\nOr just describe what you need and I'll ask follow-up questions!")
      .then(() => setTimeout(() => inputRef.current?.focus(), 100))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = useCallback((data) => {
    if (data.variants && data.variants.length > 0) {
      setVariants(data.variants)
      setSelectedVariant(0)
    }
    if (data.textOptions && data.textOptions.length > 0) {
      setTextOptions(data.textOptions)
    }
    if (data.recommendedMusicId) {
      setRecommendedMusicId(data.recommendedMusicId)
    }
    if (data.voiceoverScript) {
      setVoiceoverScript(data.voiceoverScript)
    }

    if (data.variants && data.variants.length > 0) {
      setPhase('pick-variant')
      pushBotMsg("I've created 3 different options for your video. Pick the one you like best!")
    } else if (data.textOptions && data.textOptions.length > 0) {
      setPhase('pick-headline')
      pushBotMsg("Here are some headline options for your video. Pick your favorite!")
    } else {
      const fallback = buildFallbackConfig(
        conversationRef.current.filter(m => m.role === 'user').map(m => m.content).join(' ')
      )
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: "Setting up your video now..." }])
      setTimeout(() => onComplete({
        config: fallback,
        recommendedMusicId: data.recommendedMusicId || null,
        voiceoverScript: data.voiceoverScript || null,
      }), 600)
    }
  }, [pushBotMsg, onComplete])

  const sendMessage = useCallback(async (userText) => {
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    conversationRef.current.push({ role: 'user', content: userText })

    setIsTyping(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationRef.current }),
      })
      const data = await res.json()

      if (data.action === 'ask' && data.message) {
        setIsTyping(false)
        setMessages(prev => [...prev, { role: 'bot', text: data.message }])
        conversationRef.current.push({ role: 'bot', content: data.message })
        setTimeout(() => inputRef.current?.focus(), 100)
      } else if (data.action === 'generate') {
        setIsTyping(false)
        handleGenerate(data)
      } else {
        setIsTyping(false)
        const fallback = buildFallbackConfig(userText)
        setMessages(prev => [...prev, { role: 'bot', text: "I'll set up your video now!" }])
        setTimeout(() => onComplete({
          config: fallback,
          recommendedMusicId: null,
          voiceoverScript: null,
        }), 600)
      }
    } catch {
      setIsTyping(false)
      const fallback = buildFallbackConfig(
        conversationRef.current.filter(m => m.role === 'user').map(m => m.content).join(' ')
      )
      setMessages(prev => [...prev, { role: 'bot', text: "Let me set that up for you!" }])
      setTimeout(() => onComplete({
        config: fallback,
        recommendedMusicId: null,
        voiceoverScript: null,
      }), 600)
    }
  }, [handleGenerate, onComplete])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!textInput.trim() || isTyping || phase !== 'chat') return
    const text = textInput.trim()
    setTextInput('')
    sendMessage(text)
  }

  const handleVariantSelect = (index) => {
    setSelectedVariant(index)
  }

  const handleVariantConfirm = () => {
    if (textOptions && textOptions.length > 0) {
      setPhase('pick-headline')
      pushBotMsg("Now pick a headline for your video:")
    } else {
      finalize(variants[selectedVariant], variants[selectedVariant].textOverlay?.text)
    }
  }

  const handleHeadlineSelect = (headline) => {
    setSelectedHeadline(headline)
    const config = variants ? { ...variants[selectedVariant] } : buildFallbackConfig(
      conversationRef.current.filter(m => m.role === 'user').map(m => m.content).join(' ')
    )
    finalize(config, headline)
  }

  const finalize = (config, headline) => {
    const finalConfig = { ...config }
    if (headline && finalConfig.textOverlay) {
      finalConfig.textOverlay = { ...finalConfig.textOverlay, text: headline }
    } else if (headline) {
      finalConfig.textOverlay = { text: headline, fontSize: 48, color: '#FFFFFF', animation: 'slideFromBottom' }
    }
    delete finalConfig.label

    setMessages(prev => [...prev, { role: 'bot', text: "Your video is ready! Setting it up now..." }])
    setTimeout(() => onComplete({
      config: finalConfig,
      recommendedMusicId,
      voiceoverScript,
    }), 600)
  }

  const quickPrompts = [
    "WhatsApp feature demo on Android",
    "Professional iOS app showcase",
    "Multi-device product launch",
  ]

  return (
    <div className="ai-chat-flow">
      <div className="ai-chat-header">
        <div className="ai-chat-header-left">
          <div className="ai-chat-avatar">{STARDUST_ICON(18)}</div>
          <div>
            <span className="ai-chat-title">MetaGen AI</span>
            <span className="ai-chat-subtitle">Video Assistant</span>
          </div>
        </div>
        <button className="ai-chat-close" onClick={onCancel} title="Cancel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-chat-msg ai-chat-msg-${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="ai-chat-msg-avatar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
              </div>
            )}
            <div className="ai-chat-bubble">
              {msg.text.split('\n').map((line, li) => (
                <span key={li}>{line}{li < msg.text.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="ai-chat-msg ai-chat-msg-bot">
            <div className="ai-chat-msg-avatar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </div>
            <div className="ai-chat-bubble ai-chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Quick prompts (only shown at start when no user messages) */}
        {phase === 'chat' && messages.length === 1 && !isTyping && (
          <div className="ai-quick-prompts">
            {quickPrompts.map((prompt, i) => (
              <button key={i} className="ai-quick-chip" onClick={() => {
                setTextInput('')
                sendMessage(prompt)
              }}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Variant picker */}
        {phase === 'pick-variant' && variants && !isTyping && (
          <div className="ai-variant-section">
            <div className="ai-variant-grid">
              {variants.map((v, i) => (
                <VariantCard
                  key={i}
                  variant={v}
                  index={i}
                  selected={selectedVariant === i}
                  onSelect={handleVariantSelect}
                />
              ))}
            </div>
            <button className="ai-variant-confirm" onClick={handleVariantConfirm}>
              Use Option {['A', 'B', 'C'][selectedVariant]}
            </button>
          </div>
        )}

        {/* Headline picker */}
        {phase === 'pick-headline' && textOptions && !isTyping && (
          <div className="ai-headline-section">
            {textOptions.map((headline, i) => (
              <button
                key={i}
                className={`ai-headline-chip ${selectedHeadline === headline ? 'selected' : ''}`}
                onClick={() => handleHeadlineSelect(headline)}
              >
                <span className="ai-headline-number">{i + 1}</span>
                <span className="ai-headline-text">{headline}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {phase === 'chat' && (
        <form className="ai-chat-input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="ai-chat-text-input"
            type="text"
            placeholder="Describe the video you want to create..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" className="ai-chat-send" disabled={!textInput.trim() || isTyping}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}
