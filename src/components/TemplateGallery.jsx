import { useState, useRef, useCallback, useMemo, useEffect, Suspense, lazy } from 'react'
import './TemplateGallery.css'
import AIChatFlow from './AIChatFlow'

const MiniPreviewCanvas = lazy(() => import('./MiniPreview'))

// ── Brand theme collections ──────────────────────────────────
const BRAND_THEMES = {
  whatsapp: {
    label: 'WhatsApp',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    variants: [
      { id: 'wa-dark',  name: 'Dark',      bgColor: '#0A1014', textColor: '#FFFFFF', secondaryTextColor: '#1DAA61', accentColor: '#1DAA61', previewGradient: '#0A1014' },
      { id: 'wa-light', name: 'Light',     bgColor: '#E7FDE3', textColor: '#FFFFFF', secondaryTextColor: '#1DAA61', accentColor: '#1DAA61', previewGradient: '#E7FDE3' },
      { id: 'wa-beige', name: 'Beige',     bgColor: '#FEF4EB', textColor: '#FFFFFF', secondaryTextColor: '#1DAA61', accentColor: '#1DAA61', previewGradient: '#FEF4EB' },
      { id: 'wa-green', name: 'Green Pop', bgColor: '#1DAA61', textColor: '#FFFFFF', secondaryTextColor: '#15603E', accentColor: '#15603E', previewGradient: '#1DAA61' },
    ],
    musicPool: ['f-5', 'f-8', 'f-1', 'f-6', 'f-10', 'f-3'],
  },
  facebook: {
    label: 'Facebook',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    variants: [
      { id: 'fb-dark',    name: 'Dark',     bgColor: '#18191A', textColor: '#FFFFFF', secondaryTextColor: '#1877F2', accentColor: '#1877F2', previewGradient: '#18191A' },
      { id: 'fb-light',   name: 'Light',    bgColor: '#F0F2F5', textColor: '#1C1E21', secondaryTextColor: '#1877F2', accentColor: '#1877F2', previewGradient: '#F0F2F5' },
      { id: 'fb-blue',    name: 'Blue',     bgColor: '#1877F2', textColor: '#FFFFFF', secondaryTextColor: '#E4F0FF', accentColor: '#E4F0FF', previewGradient: '#1877F2' },
      { id: 'fb-navy',    name: 'Navy',     bgColor: '#0A2647', textColor: '#FFFFFF', secondaryTextColor: '#4599FF', accentColor: '#4599FF', previewGradient: '#0A2647' },
    ],
    musicPool: ['f-7', 'f-8', 'f-1', 'f-9', 'f-11', 'f-4'],
  },
  instagram: {
    label: 'Instagram',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    variants: [
      { id: 'ig-dark',     name: 'Dark',     bgColor: '#121212', textColor: '#FFFFFF', secondaryTextColor: '#E1306C', accentColor: '#E1306C', previewGradient: '#121212' },
      { id: 'ig-light',    name: 'Light',    bgColor: '#FAFAFA', textColor: '#262626', secondaryTextColor: '#E1306C', accentColor: '#E1306C', previewGradient: '#FAFAFA' },
      { id: 'ig-gradient', name: 'Gradient', bgColor: '#833AB4', textColor: '#FFFFFF', secondaryTextColor: '#FCCC63', accentColor: '#FCCC63', previewGradient: '#833AB4' },
      { id: 'ig-sunset',   name: 'Sunset',   bgColor: '#F77737', textColor: '#FFFFFF', secondaryTextColor: '#FFFFFF', accentColor: '#FFFFFF', previewGradient: '#F77737' },
    ],
    musicPool: ['f-3', 'f-10', 'f-2', 'f-6', 'f-5', 'f-7'],
  },
}

function hashStr(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h
}

function buildThemeMap(templates, brandKey) {
  if (!brandKey || !BRAND_THEMES[brandKey]) return null
  const brand = BRAND_THEMES[brandKey]
  const variants = brand.variants
  const music = brand.musicPool
  const map = {}
  templates.forEach((tmpl) => {
    const h = hashStr(tmpl.id + brandKey)
    const v = variants[h % variants.length]
    const m = music[(h >>> 8) % music.length]
    map[tmpl.id] = { variant: v, musicId: m }
  })
  return map
}

export { BRAND_THEMES }

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
    musicId: 'f-5',
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
    musicId: 'f-8',
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
    musicId: 'f-1',
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
    musicId: 'f-6',
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
    musicId: 'f-10',
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
    musicId: 'f-9',
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
    musicId: 'f-7',
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
    musicId: 'f-2',
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
    musicId: 'f-3',
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
    musicId: 'f-11',
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
    musicId: 'f-4',
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
    musicId: 'f-5',
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
    musicId: 'f-8',
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
    musicId: 'f-10',
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
    musicId: 'f-6',
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
    musicId: 'f-1',
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
    musicId: 'f-7',
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
    musicId: 'f-9',
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
    musicId: 'f-4',
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
    musicId: 'f-2',
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
    musicId: 'f-3',
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

export default function TemplateGallery({ onSelectTemplate, activeTemplateId, onStartBlank, onAIGenerate, aiLoading, globalBrandTheme, onBrandThemeChange, compact }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const hoverTimer = useRef(null)

  const themeMap = useMemo(
    () => buildThemeMap(TEMPLATES, globalBrandTheme),
    [globalBrandTheme]
  )

  const onEnter = useCallback((id) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHoveredId(id), 150)
  }, [])

  const onLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHoveredId(null)
  }, [])

  const handleChatComplete = useCallback((result) => {
    setShowChat(false)
    onAIGenerate(result)
  }, [onAIGenerate])

  const handleTemplateClick = useCallback((template) => {
    if (themeMap && themeMap[template.id]) {
      const { variant, musicId } = themeMap[template.id]
      const themed = {
        ...template,
        bgColor: variant.bgColor,
        bgGradient: false,
        musicId,
        _brandTheme: globalBrandTheme,
        _themeVariantId: variant.id,
        textOverlay: template.textOverlay
          ? { ...template.textOverlay, color: variant.secondaryTextColor }
          : null,
        preview: {
          ...template.preview,
          gradient: variant.previewGradient,
          accentColor: variant.accentColor,
        },
      }
      onSelectTemplate(themed)
    } else {
      onSelectTemplate(template)
    }
  }, [themeMap, globalBrandTheme, onSelectTemplate])

  const handleDropdownSelect = useCallback((key) => {
    onBrandThemeChange(key === globalBrandTheme ? null : key)
    setThemeDropdownOpen(false)
  }, [globalBrandTheme, onBrandThemeChange])

  // Close dropdown on outside click
  const handleDocClick = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setThemeDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [handleDocClick])

  if (showChat) {
    return (
      <div className="template-sidebar template-sidebar-chat">
        <AIChatFlow
          onComplete={handleChatComplete}
          onCancel={() => setShowChat(false)}
        />
      </div>
    )
  }

  const activeBrand = globalBrandTheme ? BRAND_THEMES[globalBrandTheme] : null

  return (
    <div className="template-sidebar">
      <div className="template-sidebar-header">
        <div>
          <h3 className="section-title">Templates</h3>
        </div>
        <div className="theme-dropdown-wrap" ref={dropdownRef}>
          <button
            className={`theme-dropdown-trigger ${globalBrandTheme ? 'has-theme' : ''} ${compact ? 'compact' : ''}`}
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            title={activeBrand ? activeBrand.label : 'Themes'}
          >
            {activeBrand ? (
              <>
                <span className="theme-dropdown-icon">{activeBrand.icon}</span>
                {!compact && <span>{activeBrand.label}</span>}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                {!compact && <span>Themes</span>}
              </>
            )}
            <svg className="theme-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: themeDropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {themeDropdownOpen && (
            <div className="theme-dropdown-menu">
              {Object.entries(BRAND_THEMES).map(([key, brand]) => (
                <button
                  key={key}
                  className={`theme-dropdown-item ${globalBrandTheme === key ? 'active' : ''}`}
                  onClick={() => handleDropdownSelect(key)}
                >
                  <span className="theme-dropdown-item-icon">{brand.icon}</span>
                  <span className="theme-dropdown-item-label">{brand.label}</span>
                  {globalBrandTheme === key && (
                    <svg className="theme-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
              {globalBrandTheme && (
                <>
                  <div className="theme-dropdown-divider" />
                  <button
                    className="theme-dropdown-item theme-dropdown-clear"
                    onClick={() => { onBrandThemeChange(null); setThemeDropdownOpen(false) }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span className="theme-dropdown-item-label">No Theme</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
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
        {onAIGenerate && (
          <button
            className="template-sidebar-card template-ai-card"
            onClick={() => setShowChat(true)}
          >
            <div className="template-sidebar-preview template-ai-preview">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                <path d="M20 3v4" />
                <path d="M22 5h-4" />
                <path d="M4 17v2" />
                <path d="M5 18H3" />
              </svg>
            </div>
            <div className="template-sidebar-info">
              <span className="template-sidebar-name">Create with AI</span>
              <span className="template-sidebar-desc">Describe your video</span>
            </div>
          </button>
        )}
        {TEMPLATES.map((template) => {
          const isHovered = hoveredId === template.id
          const themed = themeMap?.[template.id]
          const cardBg = themed ? themed.variant.previewGradient : template.preview.gradient
          const cardAccent = themed ? themed.variant.accentColor : template.preview.accentColor
          return (
            <button
              key={template.id}
              className={`template-sidebar-card ${activeTemplateId === template.id ? 'active' : ''}`}
              onClick={() => handleTemplateClick(template)}
              onMouseEnter={() => onEnter(template.id)}
              onMouseLeave={onLeave}
            >
              <div
                className="template-sidebar-preview"
                style={{ background: cardBg }}
              >
                {isHovered ? (
                  <div className="template-mini-preview">
                    <Suspense fallback={
                      <div className="template-sidebar-device" style={{ color: cardAccent }}>
                        <StaticPreviewSvg template={template} />
                      </div>
                    }>
                      <MiniPreviewCanvas
                        animation={template.animation}
                        bgColor={themed ? themed.variant.bgColor : template.bgColor}
                        deviceType={template.deviceType}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="template-sidebar-device" style={{ color: cardAccent }}>
                    <StaticPreviewSvg template={template} />
                  </div>
                )}
                {!isHovered && template.textOverlay && (
                  <div
                    className="template-sidebar-text-hint"
                    style={{
                      color: themed ? themed.variant.secondaryTextColor : template.textOverlay.color,
                      [template.textOverlay.posY > 0 ? 'top' : 'bottom']: '6px',
                    }}
                  >
                    Aa
                  </div>
                )}
                <div className="template-sidebar-badge" style={{ color: cardAccent }}>
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
                {themed && (
                  <div className="template-theme-badge" style={{ background: themed.variant.accentColor, color: themed.variant.textColor }}>
                    {themed.variant.name}
                  </div>
                )}
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
