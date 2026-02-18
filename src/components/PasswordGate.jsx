import { useState, useEffect } from 'react'
import './PasswordGate.css'

const SITE_PASSWORD = 'AIhaswon'
const AUTH_KEY = 'ds_authenticated'

export default function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    setTimeout(() => {
      if (password === SITE_PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, 'true')
        setAuthenticated(true)
      } else {
        setError(true)
        setPassword('')
      }
      setLoading(false)
    }, 400)
  }

  if (authenticated) return children

  return (
    <div className="pw-gate">
      <div className="pw-bg-glow" />
      <form className="pw-card" onSubmit={handleSubmit}>
        <div className="pw-logo">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <rect x="14" y="6" width="20" height="36" rx="4" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="10" x2="27" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            <circle cx="24" cy="37" r="1.5" fill="currentColor" opacity="0.3"/>
            <rect x="18" y="16" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <path d="M22 22l2 2 4-4" stroke="#21C063" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="pw-title">Design Studio</h1>
        <p className="pw-subtitle">Enter the password to access this project</p>

        <div className={`pw-input-wrap ${error ? 'pw-error' : ''}`}>
          <svg className="pw-lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            type="password"
            className="pw-input"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            autoComplete="off"
          />
        </div>

        {error && <p className="pw-error-msg">Incorrect password. Please try again.</p>}

        <button
          type="submit"
          className="pw-btn"
          disabled={loading || !password}
        >
          {loading ? (
            <span className="pw-spinner" />
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </div>
  )
}
