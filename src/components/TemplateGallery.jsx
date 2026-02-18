import { useState, useRef, useCallback, Suspense, lazy } from 'react'
import './TemplateGallery.css'

const MiniPreviewCanvas = lazy(() => import('./MiniPreview'))

export const TEMPLATES = [
  {
    id: 'app-showcase',
    name: 'App Showcase',
    description: 'Cinematic sweep with floating motion',
    category: 'Popular',
    deviceType: 'iphone',
    animation: 'showcase',
    outroAnimation: 'zoomOut',
    bgColor: '#CFC4FB',
    bgGradient: false,
    showBase: false,
    clipDuration: 4,
    textOverlay: { text: 'Your App Name', fontSize: 52, color: '#000000', posY: -0.45, animation: 'slideFromBottom' },
    musicId: 't-1',
    preview: {
      gradient: '#CFC4FB',
      accentColor: '#4a3d8f',
    },
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Dramatic flip entry for big reveals',
    category: 'Popular',
    deviceType: 'iphone',
    animation: 'flip',
    outroAnimation: 'flip',
    bgColor: '#A2D5F2',
    bgGradient: false,
    showBase: false,
    clipDuration: 4,
    textOverlay: { text: 'Launching Soon', fontSize: 56, color: '#000000', posY: 0.45, animation: 'slideFromTop' },
    musicId: 't-3',
    preview: {
      gradient: '#A2D5F2',
      accentColor: '#1a5276',
    },
  },
  {
    id: 'dual-device',
    name: 'Dual Device',
    description: 'iPhone & Android side by side',
    category: 'Comparison',
    deviceType: 'both',
    animation: 'sideBySide',
    outroAnimation: 'slideLeft',
    bgColor: '#BEFAB3',
    bgGradient: false,
    showBase: false,
    clipDuration: 4,
    textOverlay: null,
    musicId: 't-6',
    preview: {
      gradient: '#BEFAB3',
      accentColor: '#2d6a1e',
    },
  },
  {
    id: 'minimal-scroll',
    name: 'Minimal Scroll',
    description: 'Clean vertical pan through your UI',
    category: 'Clean',
    deviceType: 'iphone',
    animation: 'scroll',
    outroAnimation: 'none',
    bgColor: '#FBE5B5',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: null,
    musicId: 't-12',
    preview: {
      gradient: '#FBE5B5',
      accentColor: '#7a5c1f',
    },
  },
  {
    id: 'laptop-demo',
    name: 'Laptop Demo',
    description: 'MacBook lid-open reveal animation',
    category: 'Desktop',
    deviceType: 'macbook',
    animation: 'laptopOpen',
    outroAnimation: 'laptopClose',
    bgColor: '#F4C3B0',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: { text: 'Built for Desktop', fontSize: 44, color: '#000000', posY: -0.45, animation: 'slideFromBottom' },
    musicId: 't-8',
    preview: {
      gradient: '#F4C3B0',
      accentColor: '#7a3b24',
    },
  },
  {
    id: 'ipad-present',
    name: 'iPad Presentation',
    description: 'Elegant tablet showcase',
    category: 'Desktop',
    deviceType: 'ipad',
    animation: 'showcase',
    outroAnimation: 'zoomOut',
    bgColor: '#F3AFC6',
    bgGradient: false,
    showBase: false,
    clipDuration: 4,
    textOverlay: null,
    musicId: 't-5',
    preview: {
      gradient: '#F3AFC6',
      accentColor: '#8a2851',
    },
  },
  {
    id: 'dynamic-intro',
    name: 'Dynamic Intro',
    description: 'Spin + slide with energetic motion',
    category: 'Energetic',
    deviceType: 'iphone',
    animation: 'slideRightRotate',
    outroAnimation: 'slideLeftRotate',
    bgColor: '#D4D6D8',
    bgGradient: false,
    showBase: false,
    clipDuration: 3,
    textOverlay: { text: 'Download Now', fontSize: 48, color: '#000000', posY: -0.45, animation: 'slideFromRight' },
    musicId: 't-7',
    preview: {
      gradient: '#D4D6D8',
      accentColor: '#3d3f41',
    },
  },
  {
    id: 'orbit-view',
    name: 'Orbit View',
    description: '360-degree continuous rotation',
    category: 'Energetic',
    deviceType: 'android',
    animation: 'orbit',
    outroAnimation: 'none',
    bgColor: '#A3C9F9',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: null,
    musicId: 't-9',
    preview: {
      gradient: '#A3C9F9',
      accentColor: '#1e4d7a',
    },
  },
  {
    id: 'quick-promo',
    name: 'Quick Promo',
    description: 'Fast slide-up for social ads',
    category: 'Social',
    deviceType: 'iphone',
    animation: 'slideUp',
    outroAnimation: 'slideDown',
    bgColor: '#A4D9D4',
    bgGradient: false,
    showBase: false,
    clipDuration: 2.5,
    textOverlay: { text: 'Try It Free', fontSize: 52, color: '#000000', posY: 0.45, animation: 'slideFromTop' },
    musicId: 't-19',
    preview: {
      gradient: '#A4D9D4',
      accentColor: '#2a5e58',
    },
  },
  {
    id: 'zoom-focus',
    name: 'Zoom Focus',
    description: 'Dramatic corner zoom entrance',
    category: 'Clean',
    deviceType: 'iphone',
    animation: 'zoomBottomLeft',
    outroAnimation: 'zoomOut',
    bgColor: '#CFC4FB',
    bgGradient: false,
    showBase: false,
    clipDuration: 4,
    textOverlay: null,
    musicId: 't-15',
    preview: {
      gradient: '#CFC4FB',
      accentColor: '#4a3d8f',
    },
  },
  {
    id: 'single-hero',
    name: 'Single Hero',
    description: 'Cinematic close-up with slow arc',
    category: 'Popular',
    deviceType: 'iphone',
    animation: 'single',
    outroAnimation: 'zoomOut',
    bgColor: '#A2D5F2',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: { text: 'Designed for You', fontSize: 48, color: '#000000', posY: -0.45, animation: 'slideFromLeft' },
    musicId: 't-10',
    preview: {
      gradient: '#A2D5F2',
      accentColor: '#1a5276',
    },
  },
  {
    id: 'slide-clean',
    name: 'Clean Slide',
    description: 'Simple left-to-right entrance',
    category: 'Clean',
    deviceType: 'android',
    animation: 'slideLeft',
    outroAnimation: 'slideRight',
    bgColor: '#BEFAB3',
    bgGradient: false,
    showBase: false,
    clipDuration: 3,
    textOverlay: null,
    musicId: 't-2',
    preview: {
      gradient: '#BEFAB3',
      accentColor: '#2d6a1e',
    },
  },
  // ── Multi-device templates ──────────────────────
  {
    id: 'side-scroll-10',
    name: 'Side Scroll',
    description: '10 devices scrolling horizontally',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'sideScroll10',
    outroAnimation: 'none',
    bgColor: '#FBE5B5',
    bgGradient: false,
    showBase: false,
    clipDuration: 8,
    textOverlay: null,
    musicId: 't-1',
    screenSlots: Array.from({ length: 10 }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' })),
    preview: {
      gradient: '#FBE5B5',
      accentColor: '#7a5c1f',
      multiDevice: 'scroll10',
    },
  },
  {
    id: 'angled-3',
    name: 'Triple Angled',
    description: '3 phones angled with zoom out',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'angled3ZoomOut',
    outroAnimation: 'zoomOut',
    bgColor: '#F4C3B0',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: null,
    musicId: 't-5',
    screenSlots: [{ label: 'Left Phone', device: 'iPhone' }, { label: 'Center Phone', device: 'iPhone' }, { label: 'Right Phone', device: 'iPhone' }],
    preview: {
      gradient: '#F4C3B0',
      accentColor: '#7a3b24',
      multiDevice: 'angled3',
    },
  },
  {
    id: 'circle-4',
    name: 'Circle Spin',
    description: '4 phones in rotating circle',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'circle4Rotate',
    outroAnimation: 'none',
    bgColor: '#F3AFC6',
    bgGradient: false,
    showBase: false,
    clipDuration: 6,
    textOverlay: null,
    musicId: 't-9',
    screenSlots: [{ label: 'Front', device: 'iPhone' }, { label: 'Right', device: 'iPhone' }, { label: 'Back', device: 'iPhone' }, { label: 'Left', device: 'iPhone' }],
    preview: {
      gradient: '#F3AFC6',
      accentColor: '#8a2851',
      multiDevice: 'circle4',
    },
  },
  {
    id: 'angled-zoom-4',
    name: 'Angled Zoom',
    description: '4 phones at dramatic angles',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'angledZoom4',
    outroAnimation: 'none',
    bgColor: '#D4D6D8',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: null,
    musicId: 't-3',
    screenSlots: [{ label: 'Phone 1', device: 'iPhone' }, { label: 'Phone 2', device: 'iPhone' }, { label: 'Phone 3', device: 'iPhone' }, { label: 'Phone 4', device: 'iPhone' }],
    preview: {
      gradient: '#D4D6D8',
      accentColor: '#3d3f41',
      multiDevice: 'angledZoom4',
    },
  },
  {
    id: 'carousel-6',
    name: 'Carousel',
    description: '6 phones in offset carousel',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'carousel6',
    outroAnimation: 'none',
    bgColor: '#A3C9F9',
    bgGradient: false,
    showBase: false,
    clipDuration: 7,
    textOverlay: null,
    musicId: 't-6',
    screenSlots: Array.from({ length: 6 }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' })),
    preview: {
      gradient: '#A3C9F9',
      accentColor: '#1e4d7a',
      multiDevice: 'carousel6',
    },
  },
  {
    id: 'floating-phone-laptop',
    name: 'Phone + Laptop',
    description: 'Floating phone & laptop showcase',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'floatingPhoneLaptop',
    outroAnimation: 'none',
    bgColor: '#A4D9D4',
    bgGradient: false,
    showBase: false,
    clipDuration: 6,
    textOverlay: null,
    musicId: 't-8',
    screenSlots: [{ label: 'Phone', device: 'iPhone' }, { label: 'Laptop', device: 'MacBook' }],
    preview: {
      gradient: '#A4D9D4',
      accentColor: '#2a5e58',
      multiDevice: 'phoneLaptop',
    },
  },
  {
    id: 'phone-front-laptop',
    name: 'Phone on Laptop',
    description: 'Phone slides in front of laptop',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'phoneInFrontLaptop',
    outroAnimation: 'none',
    bgColor: '#CFC4FB',
    bgGradient: false,
    showBase: false,
    clipDuration: 5,
    textOverlay: null,
    musicId: 't-10',
    screenSlots: [{ label: 'Phone', device: 'iPhone' }, { label: 'Laptop', device: 'MacBook' }],
    preview: {
      gradient: '#CFC4FB',
      accentColor: '#4a3d8f',
      multiDevice: 'phoneLaptop',
    },
  },
  {
    id: 'flat-scatter',
    name: 'Flat Grid',
    description: '7 phones lying flat on a surface',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'flatScatter7',
    outroAnimation: 'none',
    bgColor: '#A2D5F2',
    bgGradient: false,
    showBase: false,
    clipDuration: 7,
    textOverlay: null,
    musicId: 't-12',
    screenSlots: Array.from({ length: 7 }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' })),
    preview: {
      gradient: '#A2D5F2',
      accentColor: '#1a5276',
      multiDevice: 'flatScatter',
    },
  },
  {
    id: 'offset-circle',
    name: 'Offset Ring',
    description: 'Phones in offset circle, slowly rotating',
    category: 'Multi-Device',
    deviceType: 'iphone',
    animation: 'offsetCircleRotate',
    outroAnimation: 'none',
    bgColor: '#BEFAB3',
    bgGradient: false,
    showBase: false,
    clipDuration: 7,
    textOverlay: null,
    musicId: 't-7',
    screenSlots: Array.from({ length: 6 }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' })),
    preview: {
      gradient: '#BEFAB3',
      accentColor: '#2d6a1e',
      multiDevice: 'offsetCircle',
    },
  },
]

const DEVICE_LABELS = {
  iphone: 'iPhone',
  android: 'Android',
  ipad: 'iPad',
  macbook: 'MacBook',
  both: 'Dual',
}

const DEVICE_ICONS = {
  iphone: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="6" y="2" width="12" height="20" rx="2" />
    </svg>
  ),
  android: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="6" y="2" width="12" height="20" rx="1.5" />
      <circle cx="12" cy="5" r="0.8" fill="currentColor" />
    </svg>
  ),
  ipad: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  ),
  macbook: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="12" rx="1.5" />
      <path d="M2 16h20l-1 2H3l-1-2z" />
    </svg>
  ),
  both: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="8" height="14" rx="1.5" />
      <rect x="13" y="3" width="8" height="14" rx="1.5" />
    </svg>
  ),
}

function MultiDevicePreviewSvg({ type }) {
  const phone = (x, y, w = 10, h = 18, opacity = 0.7) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={1.5} stroke="currentColor" strokeWidth="1.2" opacity={opacity} fill="none" />
      <rect x={x + 1.5} y={y + 2.5} width={w - 3} height={h - 5} rx={0.5} fill="currentColor" opacity="0.1" />
    </g>
  )

  switch (type) {
    case 'scroll10':
      return (
        <svg viewBox="0 0 100 50" fill="none" className="template-sidebar-svg">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => phone(4 + i * 13, 8 + Math.sin(i * 0.8) * 3, 10, 34, i < 1 || i > 5 ? 0.3 : 0.7))}
        </svg>
      )
    case 'angled3':
      return (
        <svg viewBox="0 0 80 60" fill="none" className="template-sidebar-svg">
          <g transform="translate(8,8) rotate(-12,12,25)">{phone(0, 0, 14, 50)}</g>
          <g transform="translate(33,4)">{phone(0, 0, 14, 50)}</g>
          <g transform="translate(58,8) rotate(12,12,25)">{phone(0, 0, 14, 50)}</g>
        </svg>
      )
    case 'circle4':
      return (
        <svg viewBox="0 0 70 70" fill="none" className="template-sidebar-svg">
          <g transform="translate(28,2)">{phone(0, 0, 12, 22)}</g>
          <g transform="translate(46,24) rotate(90,6,11)">{phone(0, 0, 12, 22)}</g>
          <g transform="translate(28,46)">{phone(0, 0, 12, 22)}</g>
          <g transform="translate(2,24) rotate(-90,6,11)">{phone(0, 0, 12, 22)}</g>
        </svg>
      )
    case 'angledZoom4':
      return (
        <svg viewBox="0 0 90 60" fill="none" className="template-sidebar-svg">
          <g transform="translate(2,6) rotate(-8,8,25)">{phone(0, 0, 13, 48, 0.5)}</g>
          <g transform="translate(22,4) rotate(-3,8,25)">{phone(0, 0, 13, 48, 0.65)}</g>
          <g transform="translate(44,2) rotate(3,8,25)">{phone(0, 0, 13, 48, 0.8)}</g>
          <g transform="translate(66,6) rotate(8,8,25)">{phone(0, 0, 13, 48, 0.55)}</g>
        </svg>
      )
    case 'carousel6':
      return (
        <svg viewBox="0 0 90 60" fill="none" className="template-sidebar-svg">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * 360
            const x = 38 + Math.sin((angle * Math.PI) / 180) * 28
            const y = 18 + (i % 2 === 0 ? 0 : 8)
            return <g key={i} transform={`translate(${x},${y})`}>{phone(0, 0, 10, 30, 0.5 + (i < 3 ? 0.2 : 0))}</g>
          })}
        </svg>
      )
    case 'phoneLaptop':
      return (
        <svg viewBox="0 0 90 60" fill="none" className="template-sidebar-svg">
          <rect x="28" y="4" width="40" height="26" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.6" fill="none" />
          <rect x="31" y="7" width="34" height="20" rx="1" fill="currentColor" opacity="0.08" />
          <path d="M22 30h52l-3 4H25l-3-4z" stroke="currentColor" strokeWidth="1.2" opacity="0.4" fill="none" />
          <g transform="translate(8,18)">{phone(0, 0, 12, 36)}</g>
        </svg>
      )
    case 'flatScatter':
      return (
        <svg viewBox="0 0 90 60" fill="none" className="template-sidebar-svg">
          {[
            { x: 6, y: 8, r: -12 }, { x: 28, y: 2, r: 8 }, { x: 54, y: 6, r: -5 },
            { x: 14, y: 30, r: 10 }, { x: 38, y: 26, r: -8 },
            { x: 62, y: 30, r: 15 }, { x: 24, y: 48, r: -3 },
          ].map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.r},7,10)`}>
              <rect width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1" opacity={0.5 + i * 0.05} fill="currentColor" fillOpacity="0.06" />
            </g>
          ))}
        </svg>
      )
    case 'offsetCircle':
      return (
        <svg viewBox="0 0 80 70" fill="none" className="template-sidebar-svg">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2
            const x = 32 + Math.sin(angle) * 22
            const y = 14 + [0, 8, -4, 10, -2, 6][i]
            return <g key={i} transform={`translate(${x},${y})`}>{phone(0, 0, 10, 28, 0.55)}</g>
          })}
        </svg>
      )
    default:
      return null
  }
}

function StaticPreviewSvg({ template }) {
  if (template.preview.multiDevice) return <MultiDevicePreviewSvg type={template.preview.multiDevice} />
  if (template.deviceType === 'macbook') return (
    <svg viewBox="0 0 80 56" fill="none" className="template-sidebar-svg">
      <rect x="12" y="4" width="56" height="36" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <rect x="18" y="10" width="44" height="24" rx="1" fill="currentColor" opacity="0.12" />
      <path d="M4 40h72l-4 6H8l-4-6z" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    </svg>
  )
  if (template.deviceType === 'ipad') return (
    <svg viewBox="0 0 64 80" fill="none" className="template-sidebar-svg">
      <rect x="4" y="4" width="56" height="72" rx="5" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <rect x="10" y="12" width="44" height="56" rx="2" fill="currentColor" opacity="0.12" />
      <circle cx="32" cy="10" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  )
  if (template.deviceType === 'both') return (
    <svg viewBox="0 0 80 64" fill="none" className="template-sidebar-svg">
      <rect x="6" y="6" width="28" height="52" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <rect x="12" y="14" width="16" height="36" rx="1" fill="currentColor" opacity="0.12" />
      <rect x="46" y="6" width="28" height="52" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <rect x="52" y="14" width="16" height="36" rx="1" fill="currentColor" opacity="0.12" />
    </svg>
  )
  return (
    <svg viewBox="0 0 40 72" fill="none" className="template-sidebar-svg">
      <rect x="3" y="3" width="34" height="66" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <rect x="7" y="11" width="26" height="50" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="15" y="6" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

export default function TemplateGallery({ onSelectTemplate, activeTemplateId, onStartBlank }) {
  const [hoveredId, setHoveredId] = useState(null)
  const hoverTimer = useRef(null)

  const onEnter = useCallback((id) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHoveredId(id), 150)
  }, [])

  const onLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHoveredId(null)
  }, [])

  return (
    <div className="template-sidebar">
      <h3 className="section-title">Templates</h3>
      <p className="template-sidebar-hint">Hover to preview animation</p>
      <div className="template-sidebar-grid">
        {onStartBlank && (
          <button
            className="template-sidebar-card template-blank-card"
            onClick={onStartBlank}
          >
            <div className="template-sidebar-preview template-blank-preview">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="template-sidebar-info">
              <span className="template-sidebar-name">Blank Canvas</span>
              <span className="template-sidebar-desc">Start from scratch</span>
            </div>
          </button>
        )}
        {TEMPLATES.map((template) => {
          const isHovered = hoveredId === template.id
          return (
            <button
              key={template.id}
              className={`template-sidebar-card ${activeTemplateId === template.id ? 'active' : ''}`}
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => onEnter(template.id)}
              onMouseLeave={onLeave}
            >
              <div
                className="template-sidebar-preview"
                style={{ background: template.preview.gradient }}
              >
                {isHovered ? (
                  <div className="template-mini-preview">
                    <Suspense fallback={
                      <div className="template-sidebar-device" style={{ color: template.preview.accentColor }}>
                        <StaticPreviewSvg template={template} />
                      </div>
                    }>
                      <MiniPreviewCanvas
                        animation={template.animation}
                        bgColor={template.bgColor}
                        deviceType={template.deviceType}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="template-sidebar-device" style={{ color: template.preview.accentColor }}>
                    <StaticPreviewSvg template={template} />
                  </div>
                )}
                {!isHovered && template.textOverlay && (
                  <div
                    className="template-sidebar-text-hint"
                    style={{
                      color: template.textOverlay.color,
                      [template.textOverlay.posY > 0 ? 'top' : 'bottom']: '6px',
                    }}
                  >
                    Aa
                  </div>
                )}
                <div className="template-sidebar-badge" style={{ color: template.preview.accentColor }}>
                  {template.preview.multiDevice ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="2" y="4" width="8" height="14" rx="1.5" />
                        <rect x="14" y="4" width="8" height="14" rx="1.5" />
                        <rect x="8" y="7" width="8" height="14" rx="1.5" opacity="0.5" />
                      </svg>
                      Multi
                    </>
                  ) : (
                    <>
                      {DEVICE_ICONS[template.deviceType]}
                      {DEVICE_LABELS[template.deviceType]}
                    </>
                  )}
                </div>
              </div>
              <div className="template-sidebar-info">
                <span className="template-sidebar-name">{template.name}</span>
                <span className="template-sidebar-desc">{template.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
