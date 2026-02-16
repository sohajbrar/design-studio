import './Header.css'

export default function Header({ children }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="8" height="14" rx="2" fill="url(#g1)" />
              <rect x="14" y="4" width="8" height="14" rx="2" fill="url(#g2)" opacity="0.7" />
              <defs>
                <linearGradient id="g1" x1="2" y1="4" x2="10" y2="18">
                  <stop stopColor="#21C063" />
                  <stop offset="1" stopColor="#2ed874" />
                </linearGradient>
                <linearGradient id="g2" x1="14" y1="4" x2="22" y2="18">
                  <stop stopColor="#1aad56" />
                  <stop offset="1" stopColor="#21C063" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">Design Studio</span><span className="logo-byline">by Sohaj</span>
        </div>
      </div>
      <div className="header-center">
      </div>
      <div className="header-right">
        {children}
      </div>
    </header>
  )
}
