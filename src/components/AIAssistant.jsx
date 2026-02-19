import { useState, useRef, useEffect, useCallback } from 'react'
import './AIAssistant.css'

export default function AIAssistant({ getCurrentConfig, onApplyDelta }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
      if (messages.length === 0) {
        setMessages([{
          role: 'bot',
          text: 'I can help with anything — switch templates, change animation, background, text, music, zoom, duration, aspect ratio, export settings, and more. Just tell me what you want!',
        }])
      }
    }
  }, [isOpen, messages.length])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const instruction = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: instruction }])
    setIsLoading(true)

    try {
      const currentConfig = getCurrentConfig()
      const res = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, currentConfig }),
      })
      const data = await res.json()

      if (data.delta) {
        onApplyDelta(data.delta)
        let summary
        if (data.delta.templateId) {
          const name = data.delta.templateId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          summary = `Switched to the ${name} template.`
        } else {
          const changes = Object.keys(data.delta)
            .filter(k => k !== 'addZoom' && k !== 'removeZoom' && k !== 'addTextOverlay' && k !== 'removeTextOverlay')
            .map(k => {
              if (k === 'textOverlay') return 'text'
              if (k === 'musicId') return data.delta.musicId === null ? 'removed music' : 'music'
              if (k === 'musicVolume') return 'music volume'
              if (k === 'bgGradient') return 'gradient'
              if (k === 'showBase') return 'shadow'
              if (k === 'totalDuration' || k === 'clipDuration') return 'duration'
              if (k === 'aspectRatio') return 'aspect ratio'
              if (k === 'textSplit') return 'text/device split'
              if (k === 'layoutFlipped') return 'layout'
              if (k === 'exportFormat') return 'export format'
              return k.replace(/([A-Z])/g, ' $1').toLowerCase()
            })
            .join(', ')
          const actions = []
          if (data.delta.addZoom) actions.push('added zoom effect')
          if (data.delta.removeZoom) actions.push('removed zoom effects')
          if (data.delta.addTextOverlay) actions.push('added text overlay')
          if (data.delta.removeTextOverlay) actions.push('removed text overlays')
          const parts = [changes, ...actions].filter(Boolean).join(', ')
          summary = `Done! Updated ${parts}.`
        }
        setMessages(prev => [...prev, {
          role: 'bot',
          text: summary,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: "I couldn't process that change. Try things like \"switch to product launch template\", \"make it darker\", \"add music\", \"zoom in\", \"make it 10 seconds\", or \"portrait mode\".",
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, isLoading, getCurrentConfig, onApplyDelta])

  if (!isOpen) {
    return (
      <button className="ai-assistant-fab" onClick={() => setIsOpen(true)} title="AI Assistant">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          <path d="M20 3v4" /><path d="M22 5h-4" />
        </svg>
      </button>
    )
  }

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <div className="ai-assistant-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
          <span>AI Refine</span>
        </div>
        <button className="ai-assistant-close" onClick={() => setIsOpen(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="ai-assistant-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-assist-msg ai-assist-msg-${msg.role}`}>
            <div className="ai-assist-bubble">{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-assist-msg ai-assist-msg-bot">
            <div className="ai-assist-bubble ai-assist-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="ai-assistant-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. switch to carousel, add music, zoom in..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}
