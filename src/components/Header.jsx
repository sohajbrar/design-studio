import './Header.css'

export default function Header({ children, centerContent, leftAction, siteTheme, onToggleTheme }) {
  return (
    <header className="header">
      <div className="header-left">
        {leftAction}
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="2" width="14" height="20" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="9.5" y="19" width="5" height="1" rx="0.5" fill="currentColor" opacity="0.3" />
              <path d="M10 8V16L16 12L10 8Z" fill="currentColor" opacity="0.85" />
            </svg>
          </div>
          <span className="logo-text">AI Design Studio</span><span className="logo-byline">by <a href="https://fb.workplace.com/profile.php?id=100043015364125" target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'underline'}}>Sohaj</a></span>
        </div>
      </div>
      <div className="header-center">
        {centerContent}
      </div>
      <div className="header-right">
        {onToggleTheme && (
          <button
            className="btn-theme-toggle"
            onClick={onToggleTheme}
            title={siteTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {siteTheme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        )}
        {children}
      </div>
    </header>
  )
}
