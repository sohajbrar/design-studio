import './Header.css'

export default function Header({ children, centerContent, leftAction, siteTheme, onToggleTheme }) {
  return (
    <header className="header">
      <div className="header-left">
        {leftAction}
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 1L4.8 4L2 5L4.8 6L6 9L7.2 6L10 5L7.2 4Z M6 3.7L5.3 5L6 6.3L6.7 5Z" fill="currentColor" fillRule="evenodd" />
              <path d="M3 12V18C3 19.7 4.3 21 6 21H13C14.7 21 16 19.7 16 18V9C16 7.3 14.7 6 13 6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M18 11L22 8.5V17.5L18 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
