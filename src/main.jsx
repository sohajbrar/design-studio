import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PasswordGate from './components/PasswordGate.jsx'

// Apply site theme before first paint to avoid flash
;(() => {
  const theme = localStorage.getItem('ds_siteTheme') || 'dark'
  document.documentElement.setAttribute('data-theme', theme)
})()

// Global error catcher — displays errors on screen so we can debug
window.onerror = (msg, src, line, col, err) => {
  showError(`[onerror] ${msg}\n${src}:${line}:${col}\n${err?.stack || ''}`)
}
window.onunhandledrejection = (e) => {
  showError(`[unhandledrejection] ${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`)
}

function showError(text) {
  let el = document.getElementById('global-error-display')
  if (!el) {
    el = document.createElement('pre')
    el.id = 'global-error-display'
    el.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a0000;color:#ff6b6b;' +
      'padding:20px;font-size:13px;font-family:monospace;white-space:pre-wrap;max-height:50vh;overflow:auto;border-bottom:2px solid #ff0000;'
    document.body.prepend(el)
  }
  el.textContent += text + '\n\n'
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Root ErrorBoundary caught:', error, info)
    showError(`[ErrorBoundary] ${error.message}\n${error.stack}\n\nComponent stack:${info?.componentStack || 'N/A'}`)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff6b6b', fontFamily: 'monospace', background: '#0a0a0f', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: 16 }}>App Crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#ffaaaa' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 20, padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <PasswordGate>
      <App />
    </PasswordGate>
  </RootErrorBoundary>,
)
