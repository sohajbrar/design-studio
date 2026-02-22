import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import './App.css'
import './components/ControlsPanel.css'
import UploadPanel from './components/UploadPanel'
import PreviewScene from './components/PreviewScene'
import TemplateGallery, { TEMPLATES } from './components/TemplateGallery'

import Header from './components/Header'
import ExportModal from './components/ExportModal'
import Timeline from './components/Timeline'
import AIAssistant from './components/AIAssistant'
import AudioEngine from './utils/audioEngine'
import { MUSIC_LIBRARY, generateTrack } from './utils/musicLibrary'

const ANIMATION_PRESETS = [
  { id: 'showcase', name: 'Showcase' },
  { id: 'orbit', name: 'Orbit' },
  { id: 'flip', name: 'Flip' },
  { id: 'scroll', name: 'Scroll' },
  { id: 'sideBySide', name: 'Side by Side', bothOnly: true },
  { id: 'single', name: 'Single' },
  { id: 'slideLeft', name: 'Slide Left' },
  { id: 'slideRight', name: 'Slide Right' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideRightRotate', name: 'Right + Rotate' },
  { id: 'slideLeftRotate', name: 'Left + Rotate' },
  { id: 'zoomBottomLeft', name: 'Zoom BL' },
  { id: 'zoomTopRight', name: 'Zoom TR' },
  { id: 'heroRise', name: 'Hero Rise' },
  { id: 'laptopOpen', name: 'Laptop Open', macbookOnly: true },
  { id: 'laptopClose', name: 'Laptop Close', macbookOnly: true },
]

const OUTRO_PRESETS = [
  { id: 'none', name: 'None' },
  { id: 'slideLeft', name: 'Slide Left' },
  { id: 'slideRight', name: 'Slide Right' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideLeftRotate', name: 'Left + Rotate' },
  { id: 'slideRightRotate', name: 'Right + Rotate' },
  { id: 'zoomOut', name: 'Zoom Out' },
  { id: 'flip', name: 'Flip' },
]

const WA_THEMES = [
  {
    id: 'wa-dark',
    name: 'Dark',
    bgColor: '#0A1014',
    bgGradient: false,
    textColor: '#FFFFFF',
    secondaryTextColor: '#1DAA61',
    swatch: 'linear-gradient(135deg, #0A1014 50%, #1DAA61 50%)',
  },
  {
    id: 'wa-light',
    name: 'Light',
    bgColor: '#E7FDE3',
    bgGradient: false,
    textColor: '#FFFFFF',
    secondaryTextColor: '#1DAA61',
    swatch: 'linear-gradient(135deg, #E7FDE3 50%, #1DAA61 50%)',
  },
  {
    id: 'wa-beige',
    name: 'Beige',
    bgColor: '#FEF4EB',
    bgGradient: false,
    textColor: '#FFFFFF',
    secondaryTextColor: '#1DAA61',
    swatch: 'linear-gradient(135deg, #FEF4EB 50%, #1DAA61 50%)',
  },
  {
    id: 'wa-green',
    name: 'Green Pop',
    bgColor: '#1DAA61',
    bgGradient: false,
    textColor: '#FFFFFF',
    secondaryTextColor: '#15603E',
    swatch: 'linear-gradient(135deg, #1DAA61 50%, #15603E 50%)',
  },
]

const GRADIENT_PRESETS = [
  { id: 'aurora', name: 'Aurora', bg: '#1a0a2e', blobs: [
    { cx: 0.15, cy: 0.65, r: 0.6, c: [224, 64, 160], a: 0.7 },
    { cx: 0.75, cy: 0.25, r: 0.55, c: [96, 32, 176], a: 0.6 },
    { cx: 0.35, cy: 0.9, r: 0.4, c: [255, 140, 64], a: 0.45 },
  ]},
  { id: 'midnight', name: 'Midnight', bg: '#0a1420', blobs: [
    { cx: 0.45, cy: 0.5, r: 0.55, c: [20, 60, 110], a: 0.5 },
    { cx: 0.55, cy: 0.55, r: 0.35, c: [30, 80, 130], a: 0.35 },
  ]},
  { id: 'ocean', name: 'Ocean', bg: '#0c1830', blobs: [
    { cx: 0.3, cy: 0.35, r: 0.65, c: [25, 65, 140], a: 0.5 },
    { cx: 0.7, cy: 0.65, r: 0.55, c: [15, 35, 90], a: 0.4 },
    { cx: 0.5, cy: 0.3, r: 0.4, c: [50, 100, 190], a: 0.25 },
  ]},
  { id: 'nordic', name: 'Nordic', bg: '#0f1a30', blobs: [
    { cx: 0.3, cy: 0.3, r: 0.55, c: [20, 60, 130], a: 0.5 },
    { cx: 0.7, cy: 0.7, r: 0.5, c: [40, 30, 100], a: 0.4 },
    { cx: 0.5, cy: 0.5, r: 0.35, c: [30, 80, 160], a: 0.25 },
  ]},
  { id: 'northern-lights', name: 'Northern Lights', bg: '#0a1828', blobs: [
    { cx: 0.25, cy: 0.4, r: 0.55, c: [20, 180, 160], a: 0.5 },
    { cx: 0.7, cy: 0.3, r: 0.5, c: [80, 40, 180], a: 0.45 },
    { cx: 0.5, cy: 0.7, r: 0.45, c: [40, 120, 200], a: 0.35 },
  ]},
  { id: 'neon', name: 'Neon', bg: '#150820', blobs: [
    { cx: 0.3, cy: 0.4, r: 0.55, c: [255, 50, 150], a: 0.6 },
    { cx: 0.7, cy: 0.5, r: 0.55, c: [0, 200, 255], a: 0.5 },
    { cx: 0.5, cy: 0.7, r: 0.4, c: [150, 0, 255], a: 0.3 },
  ]},
  { id: 'cloud', name: 'Cloud', bg: '#e8eef6', blobs: [
    { cx: 0.3, cy: 0.4, r: 0.65, c: [185, 210, 245], a: 0.6 },
    { cx: 0.7, cy: 0.6, r: 0.55, c: [200, 220, 248], a: 0.45 },
    { cx: 0.5, cy: 0.25, r: 0.4, c: [220, 235, 255], a: 0.3 },
  ]},
  { id: 'rose-mist', name: 'Rose Mist', bg: '#f5e5ea', blobs: [
    { cx: 0.4, cy: 0.45, r: 0.6, c: [240, 175, 200], a: 0.5 },
    { cx: 0.65, cy: 0.55, r: 0.5, c: [248, 190, 215], a: 0.4 },
    { cx: 0.25, cy: 0.7, r: 0.35, c: [252, 210, 225], a: 0.3 },
  ]},
  { id: 'peach', name: 'Peach', bg: '#fce8e0', blobs: [
    { cx: 0.35, cy: 0.5, r: 0.6, c: [255, 195, 165], a: 0.5 },
    { cx: 0.65, cy: 0.4, r: 0.5, c: [255, 180, 155], a: 0.4 },
    { cx: 0.5, cy: 0.75, r: 0.35, c: [252, 215, 195], a: 0.35 },
  ]},
  { id: 'lavender', name: 'Lavender', bg: '#e8e0f5', blobs: [
    { cx: 0.4, cy: 0.35, r: 0.6, c: [195, 165, 240], a: 0.5 },
    { cx: 0.6, cy: 0.65, r: 0.55, c: [215, 190, 250], a: 0.4 },
    { cx: 0.3, cy: 0.7, r: 0.35, c: [185, 155, 235], a: 0.3 },
  ]},
  { id: 'holographic', name: 'Holographic', bg: '#e8f0e5', blobs: [
    { cx: 0.2, cy: 0.3, r: 0.55, c: [100, 230, 200], a: 0.5 },
    { cx: 0.8, cy: 0.4, r: 0.5, c: [255, 155, 120], a: 0.45 },
    { cx: 0.5, cy: 0.8, r: 0.45, c: [240, 230, 120], a: 0.35 },
    { cx: 0.15, cy: 0.7, r: 0.35, c: [130, 210, 255], a: 0.3 },
  ]},
  { id: 'cotton-candy', name: 'Cotton Candy', bg: '#f0e5f5', blobs: [
    { cx: 0.3, cy: 0.35, r: 0.6, c: [215, 145, 240], a: 0.45 },
    { cx: 0.7, cy: 0.55, r: 0.55, c: [145, 195, 255], a: 0.4 },
    { cx: 0.5, cy: 0.8, r: 0.4, c: [255, 175, 210], a: 0.35 },
  ]},
  { id: 'sunset', name: 'Sunset', bg: '#f8e0d8', blobs: [
    { cx: 0.25, cy: 0.3, r: 0.6, c: [255, 135, 95], a: 0.5 },
    { cx: 0.7, cy: 0.5, r: 0.55, c: [255, 95, 135], a: 0.45 },
    { cx: 0.4, cy: 0.75, r: 0.45, c: [255, 175, 80], a: 0.35 },
  ]},
  { id: 'tropical', name: 'Tropical', bg: '#e0f0f5', blobs: [
    { cx: 0.2, cy: 0.4, r: 0.55, c: [0, 210, 230], a: 0.5 },
    { cx: 0.75, cy: 0.55, r: 0.55, c: [230, 60, 150], a: 0.4 },
    { cx: 0.45, cy: 0.2, r: 0.4, c: [80, 180, 255], a: 0.3 },
  ]},
  { id: 'golden-hour', name: 'Golden Hour', bg: '#f8e8d0', blobs: [
    { cx: 0.3, cy: 0.4, r: 0.6, c: [255, 195, 95], a: 0.5 },
    { cx: 0.7, cy: 0.55, r: 0.5, c: [255, 145, 95], a: 0.45 },
    { cx: 0.5, cy: 0.8, r: 0.4, c: [255, 215, 155], a: 0.3 },
  ]},
  { id: 'coral', name: 'Coral', bg: '#f5e0dc', blobs: [
    { cx: 0.35, cy: 0.45, r: 0.6, c: [255, 125, 105], a: 0.45 },
    { cx: 0.65, cy: 0.5, r: 0.5, c: [255, 155, 135], a: 0.4 },
    { cx: 0.45, cy: 0.7, r: 0.4, c: [252, 175, 165], a: 0.35 },
  ]},
  { id: 'arctic', name: 'Arctic', bg: '#e0eef8', blobs: [
    { cx: 0.3, cy: 0.3, r: 0.6, c: [95, 175, 255], a: 0.45 },
    { cx: 0.7, cy: 0.6, r: 0.55, c: [55, 145, 230], a: 0.35 },
    { cx: 0.5, cy: 0.5, r: 0.45, c: [145, 210, 255], a: 0.3 },
  ]},
  { id: 'iridescent', name: 'Iridescent', bg: '#f0e8f5', blobs: [
    { cx: 0.2, cy: 0.3, r: 0.55, c: [175, 135, 255], a: 0.45 },
    { cx: 0.8, cy: 0.4, r: 0.5, c: [255, 165, 195], a: 0.4 },
    { cx: 0.5, cy: 0.8, r: 0.45, c: [255, 205, 135], a: 0.35 },
    { cx: 0.35, cy: 0.6, r: 0.35, c: [135, 195, 255], a: 0.25 },
  ]},
  { id: 'azure-pink', name: 'Azure Pink', bg: '#e5e8f5', blobs: [
    { cx: 0.4, cy: 0.3, r: 0.6, c: [75, 135, 255], a: 0.5 },
    { cx: 0.6, cy: 0.7, r: 0.55, c: [255, 135, 175], a: 0.4 },
    { cx: 0.3, cy: 0.6, r: 0.35, c: [115, 175, 255], a: 0.25 },
  ]},
  { id: 'mint', name: 'Mint', bg: '#e5f5f0', blobs: [
    { cx: 0.35, cy: 0.4, r: 0.6, c: [125, 230, 195], a: 0.45 },
    { cx: 0.65, cy: 0.6, r: 0.5, c: [155, 240, 215], a: 0.35 },
    { cx: 0.5, cy: 0.3, r: 0.35, c: [95, 215, 185], a: 0.3 },
  ]},
]

function gradientPresetCss(preset) {
  const layers = preset.blobs.map(b =>
    `radial-gradient(circle at ${b.cx * 100}% ${b.cy * 100}%, rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.a}) 0%, transparent ${Math.round(b.r * 100)}%)`
  )
  return [...layers, preset.bg].join(', ')
}

const ANIM_ICONS = {
  showcase: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="8" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 24c0-8 14-14 28-6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4"/>
      <path d="M24 38v4M20 42h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M13 18l3 2-3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M35 26l-3 2 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  ),
  orbit: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="18" y="12" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="24" cy="23" rx="18" ry="8" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.35"/>
      <circle cx="42" cy="23" r="2" fill="currentColor" opacity="0.5"/>
      <path d="M40 20l2 3 2-1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  flip: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="10" y="12" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="26" y="10" width="12" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 10l10-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M16 36l10 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      <path d="M22 20l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  scroll: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="6" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="20" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="20" y1="18" x2="26" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="20" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <path d="M24 36v8M21 41l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  sideBySide: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="12" width="14" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="28" y="12" width="14" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M22 24h4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.3"/>
    </svg>
  ),
  single: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="14" y="8" width="20" height="32" rx="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.25"/>
      <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle cx="24" cy="24" r="1" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  slideLeft: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="22" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M40 24h-8M34 20l-4 4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideRight: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="26" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="10" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 24h8M14 20l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideDown: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="2" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="16" y="16" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 44v-6M20 40l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideUp: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="20" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2"/>
      <rect x="16" y="6" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 4v6M20 8l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  slideRightRotate: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="10" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(-15 18 24)"/>
      <path d="M8 24h8M14 20l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M34 14a8 8 0 0 1 0 16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M34 30l-2-3h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  slideLeftRotate: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="22" y="10" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(15 30 24)"/>
      <path d="M40 24h-8M34 20l-4 4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M14 14a8 8 0 0 0 0 16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M14 30l2-3h-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  none: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="17" y1="17" x2="31" y2="31" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
    </svg>
  ),
  zoomOut: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="16" y="8" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="20" y="14" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.25"/>
      <path d="M14 8l-4-4M34 8l4-4M14 36l-4 4M34 36l4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  zoomBottomLeft: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="6" y="4" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(-12 16 20)"/>
      <circle cx="12" cy="32" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M14 30l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 34l-2 0 0-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M30 10l6-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
      <path d="M32 16l6 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
    </svg>
  ),
  zoomTopRight: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="22" y="12" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" transform="rotate(12 32 28)"/>
      <circle cx="38" cy="16" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35"/>
      <path d="M36 18l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <path d="M40 14l2 0 0 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M18 38l-6 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
      <path d="M16 32l-6 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
    </svg>
  ),
  heroRise: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="14" y="22" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeDasharray="2 2" transform="rotate(-50 24 32)"/>
      <rect x="14" y="8" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 44v-4M20 42l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M24 4v4M20 6l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  laptopOpen: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="8" y="30" width="32" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.25" transform="rotate(-70 24 28)"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M20 18l4-3v6l-4-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M30 12a6 6 0 0 1 0 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    </svg>
  ),
  laptopClose: (
    <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
      <rect x="8" y="30" width="32" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.25" transform="rotate(-70 24 28)"/>
      <path d="M28 18l-4 3v-6l4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M14 12a6 6 0 0 0 0 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    </svg>
  ),
}

const FONT_OPTIONS = [
  { name: 'Inter' },
  { name: 'Roboto' },
  { name: 'Poppins' },
  { name: 'Montserrat' },
  { name: 'Playfair Display' },
  { name: 'Space Grotesk' },
  { name: 'Instagram Sans' },
  { name: 'Instagram Sans Condensed' },
]

const TEXT_ANIMATIONS = [
  { id: 'none', name: 'None' },
  { id: 'slideFromRight', name: 'From Right' },
  { id: 'slideFromLeft', name: 'From Left' },
  { id: 'slideFromBottom', name: 'From Bottom' },
  { id: 'slideFromTop', name: 'From Top' },
]

const DEVICE_TYPES = ['iphone', 'android', 'both', 'ipad', 'macbook', 'media']

function findNonOverlappingSlot(existing, desiredStart, duration, maxTime) {
  const sorted = existing
    .map((e) => ({ s: e.startTime, e: e.endTime }))
    .sort((a, b) => a.s - b.s)
  const tryFit = (s) => {
    const e = s + duration
    if (e > maxTime) return null
    const overlaps = sorted.some((o) => s < o.e && e > o.s)
    if (!overlaps) return { start: s, end: e }
    return null
  }
  const fit = tryFit(desiredStart)
  if (fit) return fit
  for (const block of sorted) {
    const fit2 = tryFit(block.e)
    if (fit2) return fit2
  }
  return tryFit(0)
}

function recalcStartTimes(clips) {
  let time = 0
  return clips.map((clip) => {
    const updated = { ...clip, startTime: time }
    time += clip.duration
    return updated
  })
}

function getVideoDuration(url) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve(video.duration && isFinite(video.duration) ? video.duration : 5)
    }
    video.onerror = () => resolve(5)
    video.src = url
  })
}

function loadSaved(key, fallback) {
  try {
    const v = localStorage.getItem('ds_' + key)
    if (v === null) return fallback
    return JSON.parse(v)
  } catch { return fallback }
}

function App() {
  const [screens, setScreens] = useState([])
  const [deviceType, setDeviceType] = useState(() => loadSaved('deviceType', 'iphone'))
  const [animation, setAnimation] = useState('showcase')
  const [bgColor, setBgColor] = useState(() => loadSaved('bgColor', '#161717'))
  const [bgGradient, setBgGradient] = useState(() => loadSaved('bgGradient', false))
  const [showBase, setShowBase] = useState(() => loadSaved('showBase', false))
  const [showDeviceShadow, setShowDeviceShadow] = useState(() => loadSaved('showDeviceShadow', false))
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [quality, setQuality] = useState(() => loadSaved('quality', '1080p'))
  const [exportFormat, setExportFormat] = useState(() => loadSaved('exportFormat', 'mp4'))
  const [aspectRatio, setAspectRatio] = useState(() => loadSaved('aspectRatio', 'none'))
  const [sidebarTab, setSidebarTab] = useState('templates')
  const [activeTemplateId, setActiveTemplateId] = useState(null)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const hasUnsavedChanges = useRef(false)
  const [activeThemeId, setActiveThemeId] = useState(null)
  const [outroLogo, setOutroLogo] = useState(null)
  const [globalBrandTheme, setGlobalBrandTheme] = useState('whatsapp')
  const [siteTheme, setSiteTheme] = useState(() => {
    return localStorage.getItem('ds_siteTheme') || 'dark'
  })
  const canvasRef = useRef(null)
  const recorderRef = useRef(null)
  const animationRef = useRef(animation)
  animationRef.current = animation
  const templateOutroRef = useRef('none')
  const templateClipDurRef = useRef(3)
  const activeScreenSlotsRef = useRef(null)

  // ── Timeline state ───────────────────────────────
  const [timelineClips, setTimelineClips] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [zoomEffects, setZoomEffects] = useState([])
  const [textOverlays, setTextOverlays] = useState([])
  const [selectedTextId, setSelectedTextId] = useState(null)
  const [textSplit, setTextSplit] = useState(0.5)
  const [layoutFlipped, setLayoutFlipped] = useState(false)
  const [screenSlotMap, setScreenSlotMap] = useState([])
  const [activeScreenSlots, setActiveScreenSlots] = useState(null)
  const [multiDeviceCount, setMultiDeviceCount] = useState(10)
  activeScreenSlotsRef.current = activeScreenSlots

  // ── Audio state ─────────────────────────────────
  const [musicTrack, setMusicTrack] = useState(null)
  const [voiceoverTrack, setVoiceoverTrack] = useState(null)
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null)
  const [previewingTrackId, setPreviewingTrackId] = useState(null)
  const audioEngineRef = useRef(null)
  const previewAudioRef = useRef(null)

  // Initialize audio engine once
  useEffect(() => {
    audioEngineRef.current = new AudioEngine()
    return () => {
      if (audioEngineRef.current) audioEngineRef.current.dispose()
    }
  }, [])

  // Apply site theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', siteTheme)
    localStorage.setItem('ds_siteTheme', siteTheme)
  }, [siteTheme])

  // Persist user preferences to localStorage
  useEffect(() => {
    localStorage.setItem('ds_bgColor', JSON.stringify(bgColor))
    localStorage.setItem('ds_bgGradient', JSON.stringify(bgGradient))
    localStorage.setItem('ds_showBase', JSON.stringify(showBase))
    localStorage.setItem('ds_showDeviceShadow', JSON.stringify(showDeviceShadow))
    localStorage.setItem('ds_deviceType', JSON.stringify(deviceType))
    localStorage.setItem('ds_quality', JSON.stringify(quality))
    localStorage.setItem('ds_exportFormat', JSON.stringify(exportFormat))
    localStorage.setItem('ds_aspectRatio', JSON.stringify(aspectRatio))
  }, [bgColor, bgGradient, showBase, showDeviceShadow, deviceType, quality, exportFormat, aspectRatio])

  // ── Derived values ───────────────────────────────
  const totalDuration = useMemo(
    () => timelineClips.reduce((sum, c) => sum + c.duration, 0),
    [timelineClips]
  )

  const activeClip = useMemo(() => {
    if (timelineClips.length === 0) return null
    return (
      timelineClips.find(
        (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
      ) || timelineClips[timelineClips.length - 1]
    )
  }, [timelineClips, currentTime])

  const activeScreen = useMemo(() => {
    if (!activeClip) return screens[0] || null
    return screens.find((s) => s.id === activeClip.screenId) || null
  }, [activeClip, screens])

  const activeZoomLevel = useMemo(() => {
    for (const effect of zoomEffects) {
      if (currentTime >= effect.startTime && currentTime <= effect.endTime) {
        return effect.zoomLevel
      }
    }
    return 1
  }, [zoomEffects, currentTime])

  const activeAnimation = useMemo(() => {
    if (activeClip && activeClip.animation) return activeClip.animation
    return animation
  }, [activeClip, animation])

  const activeOutroAnimation = useMemo(() => {
    if (activeClip && activeClip.outroAnimation) return activeClip.outroAnimation
    return 'none'
  }, [activeClip])

  const activeClipDuration = useMemo(() => {
    if (activeClip) return activeClip.duration
    return 0
  }, [activeClip])

  const videoSeekTime = useMemo(() => {
    if (!activeClip || !activeScreen?.isVideo) return 0
    return currentTime - activeClip.startTime + activeClip.trimStart
  }, [activeClip, activeScreen, currentTime])

  const clipAnimationTime = useMemo(() => {
    if (!activeClip) return currentTime
    return currentTime - activeClip.startTime
  }, [activeClip, currentTime])

  const activeClipId = activeClip?.id || null

  const activeTextAnim = useMemo(() => {
    if (!textOverlays || textOverlays.length === 0) return 'none'
    if (textOverlays.length > 1) return 'none'
    const timed = textOverlays.find(
      (t) => t.startTime != null && t.endTime != null && currentTime >= t.startTime && currentTime <= t.endTime
    )
    if (timed) return timed.animation || 'none'
    const always = textOverlays.find((t) => t.startTime == null || t.endTime == null)
    return always ? (always.animation || 'none') : 'none'
  }, [textOverlays, currentTime])

  const slotScreens = useMemo(() => {
    if (!activeScreenSlots || screenSlotMap.length === 0) return null
    return screenSlotMap.map((screenId) => {
      if (!screenId) return null
      return screens.find((s) => s.id === screenId) || null
    })
  }, [activeScreenSlots, screenSlotMap, screens])

  // ── Sync audio engine when tracks change ─────────
  useEffect(() => {
    const ae = audioEngineRef.current
    if (!ae) return
    if (musicTrack) {
      ae.setMusic(musicTrack.url, musicTrack.volume, musicTrack.startTime, musicTrack.endTime)
    } else {
      ae.setMusic(null, 1, 0, 0)
    }
  }, [musicTrack])

  useEffect(() => {
    const ae = audioEngineRef.current
    if (!ae) return
    if (voiceoverTrack) {
      ae.setVoiceover(voiceoverTrack.url, voiceoverTrack.volume, voiceoverTrack.startTime, voiceoverTrack.endTime)
    } else {
      ae.setVoiceover(null, 1, 0, 0)
    }
  }, [voiceoverTrack])

  // ── Sync audio when scrubbing while paused ───────
  useEffect(() => {
    const ae = audioEngineRef.current
    if (ae && !isTimelinePlaying) {
      ae.sync(currentTime)
    }
  }, [currentTime, isTimelinePlaying])

  // ── Unified play/pause toggle ───────────────────
  const togglePlayback = useCallback(() => {
    setIsTimelinePlaying((prev) => {
      if (!prev && currentTime >= totalDuration) {
        setCurrentTime(0)
      }
      const next = !prev
      setIsPlaying(next)
      const ae = audioEngineRef.current
      if (ae) {
        if (next) { ae.play(); ae.sync(currentTime) }
        else ae.pause()
      }
      return next
    })
  }, [currentTime, totalDuration])

  // ── Space key handler for play/pause ─────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      if (e.code === 'Space' && hasStarted) {
        e.preventDefault()
        togglePlayback()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasStarted, togglePlayback])

  // ── Timeline playback loop ───────────────────────
  const rafRef = useRef(null)
  const lastFrameRef = useRef(null)

  useEffect(() => {
    if (!isTimelinePlaying || totalDuration === 0) {
      lastFrameRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const ae = audioEngineRef.current
      if (ae) ae.pause()
      return
    }

    const ae = audioEngineRef.current
    if (ae) { ae.play(); ae.sync(currentTime) }

    const animate = (timestamp) => {
      if (lastFrameRef.current !== null) {
        const delta = (timestamp - lastFrameRef.current) / 1000
        setCurrentTime((prev) => {
          const next = prev + delta
          if (next >= totalDuration) {
            setIsTimelinePlaying(false)
            setIsPlaying(false)
            if (ae) ae.pause()
            return totalDuration
          }
          if (ae) ae.sync(next)
          return next
        })
      }
      lastFrameRef.current = timestamp
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = null
    }
  }, [isTimelinePlaying, totalDuration])

  const markChanged = useCallback(() => { hasUnsavedChanges.current = true }, [])

  // ── Upload handler (creates clips immediately, updates video durations async) ─
  const handleUpload = useCallback((files) => {
    markChanged()
    const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.mkv', '.m4v']
    const newScreens = Array.from(files).map((file) => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      const isVideo = file.type.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)
      const isGif = ext === '.gif' || file.type === 'image/gif'
      return {
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        isVideo,
        isGif,
      }
    })

    setScreens((prev) => [...prev, ...newScreens])

    const slots = activeScreenSlotsRef.current
    if (slots && slots.length > 0) {
      // Multi-device template: assign media to empty slots only, never overwrite user picks
      setScreenSlotMap((prev) => {
        const next = [...prev]
        while (next.length < slots.length) next.push(null)
        let slotIdx = next.findIndex((id) => !id)
        if (slotIdx === -1) return next
        for (const screen of newScreens) {
          if (slotIdx === -1 || slotIdx >= slots.length) break
          next[slotIdx] = screen.id
          slotIdx++
          while (slotIdx < slots.length && next[slotIdx]) slotIdx++
          if (slotIdx >= slots.length) slotIdx = -1
        }
        return next
      })

      // Ensure at least one template clip exists in the timeline
      setTimelineClips((prev) => {
        if (prev.length > 0) return prev
        const clipDur = templateClipDurRef.current
        return recalcStartTimes([{
          id: crypto.randomUUID(),
          screenId: newScreens[0].id,
          startTime: 0,
          duration: clipDur,
          trimStart: 0,
          trimEnd: clipDur,
          effects: [],
          animation: animationRef.current,
          outroAnimation: templateOutroRef.current,
        }])
      })
    } else {
      // Single-device or no template: create a clip per file
      const clipDur = templateClipDurRef.current
      const newClips = newScreens.map((screen) => ({
        id: crypto.randomUUID(),
        screenId: screen.id,
        startTime: 0,
        duration: clipDur,
        trimStart: 0,
        trimEnd: clipDur,
        effects: [],
        animation: animationRef.current,
        outroAnimation: templateOutroRef.current,
      }))

      setTimelineClips((prev) => {
        // Assign first uploaded screen to any existing clips with no media
        const updated = prev.map((c) =>
          c.screenId === null ? { ...c, screenId: newScreens[0].id } : c
        )
        return recalcStartTimes([...updated, ...newClips])
      })

      // For videos, update duration asynchronously once metadata loads
      newScreens.forEach((screen, i) => {
        if (screen.isVideo) {
          getVideoDuration(screen.url).then((dur) => {
            const clipId = newClips[i].id
            setTimelineClips((prev) =>
              recalcStartTimes(
                prev.map((c) =>
                  c.id === clipId ? { ...c, duration: dur, trimEnd: dur } : c
                )
              )
            )
          })
        }
      })
    }
  }, [])

  // Timeline drag-drop always creates new clips (even for multi-device templates)
  const handleTimelineDrop = useCallback((files) => {
    const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.mkv', '.m4v']
    const newScreens = Array.from(files).map((file) => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      const isVideo = file.type.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)
      const isGif = ext === '.gif' || file.type === 'image/gif'
      return {
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        isVideo,
        isGif,
      }
    })

    const clipDur = templateClipDurRef.current
    const newClips = newScreens.map((screen) => ({
      id: crypto.randomUUID(),
      screenId: screen.id,
      startTime: 0,
      duration: clipDur,
      trimStart: 0,
      trimEnd: clipDur,
      effects: [],
      animation: animationRef.current,
      outroAnimation: templateOutroRef.current,
    }))

    setScreens((prev) => [...prev, ...newScreens])
    setTimelineClips((prev) => recalcStartTimes([...prev, ...newClips]))

    newScreens.forEach((screen, i) => {
      if (screen.isVideo) {
        getVideoDuration(screen.url).then((dur) => {
          const clipId = newClips[i].id
          setTimelineClips((prev) =>
            recalcStartTimes(
              prev.map((c) =>
                c.id === clipId ? { ...c, duration: dur, trimEnd: dur } : c
              )
            )
          )
        })
      }
    })
  }, [])

  const handleRemoveScreen = useCallback((id) => {
    markChanged()
    setScreens((prev) => {
      const screen = prev.find((s) => s.id === id)
      if (screen) URL.revokeObjectURL(screen.url)
      return prev.filter((s) => s.id !== id)
    })
    setTimelineClips((prev) => recalcStartTimes(prev.filter((c) => c.screenId !== id)))
    setSelectedClipId(null)
  }, [])

  const handleReorderScreens = useCallback((fromIndex, toIndex) => {
    setScreens((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }, [])

  // ── Timeline operations ──────────────────────────
  const handleUpdateClip = useCallback((clipId, updates) => {
    setTimelineClips((prev) => {
      const updated = prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
      return recalcStartTimes(updated)
    })
  }, [])

  const handleReorderClips = useCallback((fromIndex, toIndex) => {
    setTimelineClips((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return recalcStartTimes(updated)
    })
  }, [])

  const handleSplitClip = useCallback((clipId, splitTime) => {
    setTimelineClips((prev) => {
      const idx = prev.findIndex((c) => c.id === clipId)
      if (idx === -1) return prev
      const clip = prev[idx]
      const offsetInClip = splitTime - clip.startTime
      if (offsetInClip <= 0.1 || offsetInClip >= clip.duration - 0.1) return prev

      const clip1 = {
        ...clip,
        id: crypto.randomUUID(),
        duration: offsetInClip,
        trimEnd: clip.trimStart + offsetInClip,
        effects: [],
      }

      const clip2 = {
        ...clip,
        id: crypto.randomUUID(),
        duration: clip.duration - offsetInClip,
        trimStart: clip.trimStart + offsetInClip,
        effects: [],
      }

      const updated = [...prev]
      updated.splice(idx, 1, clip1, clip2)
      return recalcStartTimes(updated)
    })
  }, [])

  const handleSplitText = useCallback((textId, splitTime) => {
    markChanged()
    setTextOverlays((prev) => {
      const idx = prev.findIndex((t) => t.id === textId)
      if (idx === -1) return prev
      const overlay = prev[idx]
      const dur = (overlay.endTime || 0) - (overlay.startTime || 0)
      const offset = splitTime - (overlay.startTime || 0)
      if (offset <= 0.1 || offset >= dur - 0.1) return prev

      const left = { ...overlay, id: crypto.randomUUID(), endTime: splitTime }
      const right = { ...overlay, id: crypto.randomUUID(), startTime: splitTime }
      const updated = [...prev]
      updated.splice(idx, 1, left, right)
      return updated
    })
  }, [])

  const handleSplitZoom = useCallback((effectId, splitTime) => {
    setZoomEffects((prev) => {
      const idx = prev.findIndex((e) => e.id === effectId)
      if (idx === -1) return prev
      const effect = prev[idx]
      const dur = effect.endTime - effect.startTime
      const offset = splitTime - effect.startTime
      if (offset <= 0.1 || offset >= dur - 0.1) return prev

      const left = { ...effect, id: crypto.randomUUID(), endTime: splitTime }
      const right = { ...effect, id: crypto.randomUUID(), startTime: splitTime }
      const updated = [...prev]
      updated.splice(idx, 1, left, right)
      return updated
    })
  }, [])

  const handleAddZoomEffect = useCallback((atTime) => {
    const t = typeof atTime === 'number' && isFinite(atTime) ? atTime : currentTime
    setZoomEffects((prev) => {
      const maxT = totalDuration || 6
      const desired = { start: Math.max(0, t), end: Math.min(maxT, t + 1) }
      const placed = findNonOverlappingSlot(prev, desired.start, desired.end - desired.start, maxT)
      if (!placed) return prev
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          startTime: placed.start,
          endTime: placed.end,
          zoomLevel: 2,
        },
      ]
    })
  }, [currentTime, totalDuration])

  const handleUpdateZoomEffect = useCallback((effectId, updates) => {
    setZoomEffects((prev) => {
      return prev.map((e) => {
        if (e.id !== effectId) return e
        const updated = { ...e, ...updates }
        const others = prev.filter((o) => o.id !== effectId)
        const hasOverlap = others.some(
          (o) => updated.startTime < o.endTime && updated.endTime > o.startTime
        )
        return hasOverlap ? e : updated
      })
    })
  }, [])

  const handleRemoveZoomEffect = useCallback((effectId) => {
    setZoomEffects((prev) => prev.filter((e) => e.id !== effectId))
  }, [])

  // ── Text overlay operations ─────────────────────
  const handleAddText = useCallback((atTime) => {
    markChanged()
    const t = typeof atTime === 'number' && isFinite(atTime) ? atTime : currentTime
    setTextOverlays((prev) => {
      const dur = 2
      const maxT = totalDuration || 6
      const desired = { start: Math.max(0, t), end: Math.min(maxT, t + dur) }
      const placed = findNonOverlappingSlot(
        prev.map((t) => ({ startTime: t.startTime, endTime: t.endTime })),
        desired.start,
        desired.end - desired.start,
        maxT
      )
      if (!placed) return prev
      const newText = {
        id: crypto.randomUUID(),
        text: 'Your text here',
        fontFamily: globalBrandTheme === 'instagram' ? 'Instagram Sans' : 'Inter',
        fontSize: 48,
        fontWeight: 600,
        textAlign: 'center',
        color: '#ffffff',
        animation: 'none',
        posX: 0,
        posY: 0,
        behindDevice: false,
        startTime: placed.start,
        endTime: placed.end,
      }
      setSelectedTextId(newText.id)
      return [...prev, newText]
    })
  }, [currentTime, totalDuration, globalBrandTheme])

  const handleUpdateText = useCallback((textId, updates) => {
    markChanged()
    setTextOverlays((prev) =>
      prev.map((t) => {
        if (t.id !== textId) return t
        const updated = { ...t, ...updates }
        if (updates.startTime != null || updates.endTime != null) {
          const others = prev.filter((o) => o.id !== textId)
          const hasOverlap = others.some(
            (o) => updated.startTime < o.endTime && updated.endTime > o.startTime
          )
          if (hasOverlap) return t
        }
        return updated
      })
    )
  }, [])

  const handleRemoveText = useCallback((textId) => {
    markChanged()
    setTextOverlays((prev) => prev.filter((t) => t.id !== textId))
    setSelectedTextId((prev) => (prev === textId ? null : prev))
  }, [])

  const handleRemoveClip = useCallback((clipId) => {
    setTimelineClips((prev) => recalcStartTimes(prev.filter((c) => c.id !== clipId)))
    setSelectedClipId((prev) => (prev === clipId ? null : prev))
  }, [])

  // ── Audio track operations ─────────────────────
  const getAudioDuration = useCallback((source) => {
    return new Promise((resolve) => {
      const audio = new Audio()
      const timeout = setTimeout(() => resolve(30), 10000)
      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout)
        resolve(audio.duration)
      })
      audio.addEventListener('error', () => {
        clearTimeout(timeout)
        resolve(30)
      })
      if (typeof source === 'string') {
        audio.src = source
      } else {
        audio.src = URL.createObjectURL(source)
      }
    })
  }, [])

  const [loadingTrackId, setLoadingTrackId] = useState(null)

  const handleSetMusic = useCallback(async (source) => {
    markChanged()
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    setPreviewingTrackId(null)
    let url, name, file = null, isLibrary = false, audioDuration = 30
    if (source.file) {
      file = source.file
      url = URL.createObjectURL(file)
      name = file.name
      audioDuration = await getAudioDuration(file)
    } else {
      setLoadingTrackId(source.libraryId)
      url = generateTrack(source.libraryId)
      name = source.name
      isLibrary = true
      audioDuration = await getAudioDuration(url)
      setLoadingTrackId(null)
    }
    const maxT = totalDuration || audioDuration
    const endTime = Math.min(audioDuration, maxT)
    setMusicTrack({
      id: crypto.randomUUID(),
      name,
      url,
      file,
      startTime: 0,
      endTime,
      volume: 0.5,
      isLibrary,
    })
  }, [totalDuration, getAudioDuration])

  const handleSetVoiceover = useCallback(async (file) => {
    markChanged()
    const url = URL.createObjectURL(file)
    const audioDuration = await getAudioDuration(file)
    const maxT = totalDuration || 30
    const endTime = Math.min(audioDuration, maxT)
    setVoiceoverTrack({
      id: crypto.randomUUID(),
      name: file.name,
      url,
      file,
      startTime: 0,
      endTime,
      volume: 0.8,
      isLibrary: false,
    })
  }, [totalDuration, getAudioDuration])

  const handleRemoveMusic = useCallback(() => {
    if (musicTrack?.url && !musicTrack.isLibrary) URL.revokeObjectURL(musicTrack.url)
    setMusicTrack(null)
    setSelectedAudioTrack((prev) => prev === 'music' ? null : prev)
  }, [musicTrack])

  const handleRemoveVoiceover = useCallback(() => {
    if (voiceoverTrack?.url) URL.revokeObjectURL(voiceoverTrack.url)
    setVoiceoverTrack(null)
    setSelectedAudioTrack((prev) => prev === 'voiceover' ? null : prev)
  }, [voiceoverTrack])

  const handleUpdateMusic = useCallback((updates) => {
    setMusicTrack((prev) => prev ? { ...prev, ...updates } : null)
  }, [])

  const handleUpdateVoiceover = useCallback((updates) => {
    setVoiceoverTrack((prev) => prev ? { ...prev, ...updates } : null)
  }, [])

  const handlePreviewLibraryTrack = useCallback((trackId) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    if (previewingTrackId === trackId) {
      setPreviewingTrackId(null)
      return
    }
    setPreviewingTrackId(trackId)
    const url = generateTrack(trackId)
    const audio = new Audio(url)
    audio.volume = 0.5
    audio.play().catch(() => {
      setPreviewingTrackId(null)
    })
    audio.addEventListener('ended', () => setPreviewingTrackId(null))
    previewAudioRef.current = audio
  }, [previewingTrackId])

  // ── Export / recording ───────────────────────────
  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return
    setShowExport(true)
  }, [])

  const [convertingFormat, setConvertingFormat] = useState(null)

  const convertWebmTo = useCallback(async (webmBlob, targetFormat) => {
    setConvertingFormat(targetFormat.toUpperCase())
    try {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      })

      const webmData = await fetchFile(webmBlob)
      await ffmpeg.writeFile('input.webm', webmData)

      const outputFile = `output.${targetFormat}`
      if (targetFormat === 'mov') {
        await ffmpeg.exec([
          '-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast',
          '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
          '-movflags', '+faststart', '-f', 'mov', outputFile,
        ])
      } else {
        await ffmpeg.exec([
          '-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast',
          '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
          '-movflags', '+faststart', outputFile,
        ])
      }

      const outData = await ffmpeg.readFile(outputFile)
      const mimeType = targetFormat === 'mov' ? 'video/quicktime' : 'video/mp4'
      const outBlob = new Blob([outData.buffer], { type: mimeType })

      const url = URL.createObjectURL(outBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockup-demo-${Date.now()}.${targetFormat}`
      a.click()
      URL.revokeObjectURL(url)
      ffmpeg.terminate()
    } catch (err) {
      console.error(`${targetFormat.toUpperCase()} conversion failed, falling back to WebM:`, err)
      const url = URL.createObjectURL(webmBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockup-demo-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setConvertingFormat(null)
    }
  }, [])

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.warn('Canvas element not available for recording')
      return
    }

    const recordDuration = totalDuration > 0 ? totalDuration : 6

    setCurrentTime(0)
    setIsTimelinePlaying(true)

    const videoStream = canvas.captureStream(60)
    let stream = videoStream
    let hasAudioTracks = false

    const ae = audioEngineRef.current
    const hasAudio = ae && (musicTrack || voiceoverTrack)
    if (hasAudio) {
      try {
        const audioStream = ae.getAudioStream()
        if (ae.audioCtx && ae.audioCtx.state === 'suspended') {
          await ae.audioCtx.resume()
        }
        ae.play()
        ae.sync(0)
        hasAudioTracks = audioStream.getAudioTracks().length > 0
        if (hasAudioTracks) {
          stream = new MediaStream([
            ...videoStream.getTracks(),
            ...audioStream.getTracks(),
          ])
        }
      } catch (err) {
        console.warn('Could not attach audio to recording:', err)
      }
    }

    const mimeType = hasAudioTracks
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm;codecs=vp9'
    const videoBitsPerSecond = quality === '4k' ? 20000000 : quality === '1080p' ? 8000000 : 4000000

    const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond })

    const chunks = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const chosenFormat = exportFormat

    mediaRecorder.onstop = async () => {
      const webmBlob = new Blob(chunks, { type: 'video/webm' })
      setIsRecording(false)
      setIsPlaying(false)
      setIsTimelinePlaying(false)
      if (ae) ae.pause()

      if (chosenFormat === 'webm') {
        const url = URL.createObjectURL(webmBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mockup-demo-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        await convertWebmTo(webmBlob, chosenFormat)
      }
    }

    recorderRef.current = mediaRecorder
    setIsRecording(true)
    setIsPlaying(true)

    // Small delay to let audio elements begin playing before capture starts
    await new Promise(r => setTimeout(r, 150))
    if (ae && hasAudio) ae.sync(0)

    mediaRecorder.start()

    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, (recordDuration + 0.3) * 1000)
  }, [quality, exportFormat, convertWebmTo, totalDuration, musicTrack, voiceoverTrack])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  // ── Template handler (applies settings to existing screens/clips) ──
  const handleSelectTemplate = useCallback((template) => {
    hasUnsavedChanges.current = false
    setHasStarted(true)
    setActiveTemplateId(template.id)
    setDeviceType(template.deviceType)
    setAnimation(template.animation)
    setBgColor(template.bgColor)
    setBgGradient(template.bgGradient)
    setShowBase(template.showBase)
    templateOutroRef.current = template.outroAnimation || 'none'
    templateClipDurRef.current = template.clipDuration || 3
    setSidebarTab('media')

    if (template._themeVariantId) {
      setActiveThemeId(template._themeVariantId)
    } else {
      setActiveThemeId(null)
    }

    const clipDur = template.clipDuration || 3
    setTimelineClips((prev) => {
      if (prev.length === 0) {
        return recalcStartTimes([{
          id: crypto.randomUUID(),
          screenId: null,
          duration: clipDur,
          trimStart: 0,
          trimEnd: clipDur,
          animation: template.animation,
          outroAnimation: template.outroAnimation || 'none',
        }])
      }
      return recalcStartTimes(
        prev.map((c) => ({
          ...c,
          duration: c.duration > 0 ? c.duration : clipDur,
          animation: template.animation,
          outroAnimation: template.outroAnimation || 'none',
        }))
      )
    })

    if (template.textOverlay) {
      const t = template.textOverlay
      setTextOverlays((prev) => {
        const totalClipDur = timelineClips.reduce((s, c) => s + c.duration, 0) || clipDur
        return [{
          id: prev[0]?.id || crypto.randomUUID(),
          text: t.text,
          fontFamily: globalBrandTheme === 'instagram' ? 'Instagram Sans' : 'Inter',
          fontSize: t.fontSize,
          color: t.color,
          animation: t.animation || 'none',
          posY: t.posY || 0,
          startTime: 0,
          endTime: Math.min(2.5, totalClipDur),
        }]
      })
    } else {
      setTextOverlays([])
    }

    if (template.musicId) {
      const track = MUSIC_LIBRARY.find((m) => m.id === template.musicId)
      if (track) {
        handleSetMusic({ libraryId: track.id, name: track.name })
      }
    }

    setZoomEffects([])

    if (template.screenSlots) {
      setActiveScreenSlots(template.screenSlots)
      setMultiDeviceCount(template.screenSlots.length)
      setScreenSlotMap((prev) => {
        const newMap = template.screenSlots.map((_, i) => {
          if (prev[i]) return prev[i]
          return screens[i]?.id || screens[0]?.id || null
        })
        return newMap
      })
    } else {
      setActiveScreenSlots(null)
      setScreenSlotMap([])
    }

    setCurrentTime(0)
    setTimeout(() => {
      setIsPlaying(true)
      setIsTimelinePlaying(true)
      hasUnsavedChanges.current = false
    }, 250)
  }, [handleSetMusic, timelineClips, screens])

  const [aiLoading, setAiLoading] = useState(false)
  const [aiVoiceoverScript, setAiVoiceoverScript] = useState(null)
  const [aiFeatureContext, setAiFeatureContext] = useState(null)
  const [voiceoverScriptLoading, setVoiceoverScriptLoading] = useState(false)
  const [shareToast, setShareToast] = useState(null)
  const shareToastTimer = useRef(null)
  const [isSaving, setIsSaving] = useState(false)

  const getCurrentConfig = useCallback(() => ({
    activeTemplateId,
    deviceType,
    animation,
    bgColor,
    bgGradient,
    showBase,
    showDeviceShadow,
    whatsappTheme: activeThemeId,
    outroLogo,
    outroAnimation: templateOutroRef.current || 'none',
    textOverlay: textOverlays[0] ? {
      text: textOverlays[0].text,
      fontSize: textOverlays[0].fontSize,
      color: textOverlays[0].color,
      animation: textOverlays[0].animation,
      posY: textOverlays[0].posY,
      startTime: textOverlays[0].startTime,
      endTime: textOverlays[0].endTime,
    } : null,
    textSplit,
    layoutFlipped,
    clipDuration: templateClipDurRef.current || 5,
    totalDuration: totalDuration || templateClipDurRef.current || 5,
    aspectRatio,
    quality,
    exportFormat,
    hasZoomEffects: zoomEffects.length > 0,
    musicTrackName: musicTrack?.name || null,
    musicVolume: musicTrack?.volume ?? null,
    currentTime,
  }), [activeTemplateId, deviceType, animation, bgColor, bgGradient, showBase, showDeviceShadow, activeThemeId, outroLogo, textOverlays, textSplit, layoutFlipped, totalDuration, aspectRatio, quality, exportFormat, zoomEffects, musicTrack, currentTime])

  const applyConfigDelta = useCallback((delta) => {
    if (!delta) return

    // Template switch — applies the full template preset then returns
    if (delta.templateId) {
      const tmpl = TEMPLATES.find(t => t.id === delta.templateId)
      if (tmpl) {
        handleSelectTemplate(tmpl)
        return
      }
    }

    // Device & animation
    if (delta.deviceType) setDeviceType(delta.deviceType)
    if (delta.animation) {
      setAnimation(delta.animation)
      setTimelineClips(prev => recalcStartTimes(prev.map(c => ({ ...c, animation: delta.animation }))))
    }
    if (delta.outroAnimation) {
      templateOutroRef.current = delta.outroAnimation
      setTimelineClips(prev => recalcStartTimes(prev.map(c => ({ ...c, outroAnimation: delta.outroAnimation }))))
    }

    // Background & appearance
    if (delta.bgColor) setBgColor(delta.bgColor)
    if (delta.bgGradient !== undefined) setBgGradient(delta.bgGradient)
    if (delta.showBase !== undefined) setShowBase(delta.showBase)
    if (delta.showDeviceShadow !== undefined) setShowDeviceShadow(delta.showDeviceShadow)
    if (delta.whatsappTheme) {
      setActiveThemeId(delta.whatsappTheme)
      const themeColors = { 'wa-dark': '#0A1014', 'wa-light': '#E7FDE3', 'wa-beige': '#FEF4EB', 'wa-green': '#1DAA61' }
      if (themeColors[delta.whatsappTheme]) setBgColor(themeColors[delta.whatsappTheme])
    }
    if (delta.whatsappTheme === null) setActiveThemeId(null)

    // Logo
    if (delta.outroLogo !== undefined) setOutroLogo(delta.outroLogo)

    // Aspect ratio
    if (delta.aspectRatio) setAspectRatio(delta.aspectRatio)

    // Layout
    if (delta.textSplit !== undefined) setTextSplit(delta.textSplit)
    if (delta.layoutFlipped !== undefined) setLayoutFlipped(delta.layoutFlipped)

    // Duration — scale all clips proportionally if totalDuration is set
    if (delta.totalDuration) {
      const targetDur = delta.totalDuration
      setTimelineClips(prev => {
        if (prev.length === 0) return prev
        const curTotal = prev.reduce((sum, c) => sum + c.duration, 0)
        if (curTotal <= 0) return prev
        const scale = targetDur / curTotal
        return recalcStartTimes(prev.map(c => ({ ...c, duration: Math.max(1, c.duration * scale) })))
      })
      templateClipDurRef.current = targetDur
    } else if (delta.clipDuration) {
      templateClipDurRef.current = delta.clipDuration
      setTimelineClips(prev => {
        if (prev.length === 0) return prev
        return recalcStartTimes(prev.map(c => ({ ...c, duration: delta.clipDuration })))
      })
    }

    // Zoom effects
    if (delta.addZoom) {
      handleAddZoomEffect(currentTime)
    }
    if (delta.removeZoom) {
      setZoomEffects([])
    }

    // Text overlay — add/remove
    if (delta.addTextOverlay) {
      handleAddText(currentTime)
    }
    if (delta.removeTextOverlay) {
      setTextOverlays([])
      setSelectedTextId(null)
    }

    // Text overlay — modify first overlay
    if (delta.textOverlay) {
      setTextOverlays(prev => {
        if (prev.length === 0) {
          return [{
            id: crypto.randomUUID(),
            text: delta.textOverlay.text || 'New Text',
            fontFamily: globalBrandTheme === 'instagram' ? 'Instagram Sans' : 'Inter',
            fontSize: delta.textOverlay.fontSize || 48,
            color: delta.textOverlay.color || '#FFFFFF',
            animation: delta.textOverlay.animation || 'slideFromBottom',
            posY: delta.textOverlay.posY ?? -0.45,
            startTime: delta.textOverlay.startTime ?? 0,
            endTime: delta.textOverlay.endTime ?? 2.5,
          }]
        }
        return prev.map((t, i) => {
          if (i !== 0) return t
          const merged = { ...t }
          if (delta.textOverlay.text !== undefined) merged.text = delta.textOverlay.text
          if (delta.textOverlay.fontSize !== undefined) merged.fontSize = delta.textOverlay.fontSize
          if (delta.textOverlay.color !== undefined) merged.color = delta.textOverlay.color
          if (delta.textOverlay.animation !== undefined) merged.animation = delta.textOverlay.animation
          if (delta.textOverlay.posY !== undefined) merged.posY = delta.textOverlay.posY
          if (delta.textOverlay.startTime !== undefined) merged.startTime = delta.textOverlay.startTime
          if (delta.textOverlay.endTime !== undefined) merged.endTime = delta.textOverlay.endTime
          return merged
        })
      })
    }

    // Music — set by library ID or remove
    if (delta.musicId !== undefined) {
      if (delta.musicId === null) {
        setMusicTrack(null)
      } else {
        const track = MUSIC_LIBRARY.find(t => t.id === delta.musicId)
        if (track) {
          handleSetMusic({ libraryId: track.id, name: track.name })
        }
      }
    }

    // Music volume
    if (delta.musicVolume !== undefined) {
      setMusicTrack(prev => prev ? { ...prev, volume: delta.musicVolume } : prev)
    }

    // Export settings
    if (delta.quality) setQuality(delta.quality)
    if (delta.exportFormat) setExportFormat(delta.exportFormat)

    markChanged()
  }, [markChanged, currentTime, handleAddZoomEffect, handleAddText, handleSetMusic, handleSelectTemplate])

  // ── Sharing via jsonblob.com (config + base64 media) ─────────────────────────

  const fileToDataUrl = useCallback((file) => {
    return new Promise((resolve) => {
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }, [])

  const videoToThumbnail = useCallback((file) => {
    return new Promise((resolve) => {
      if (!file) { resolve(null); return }
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      const url = URL.createObjectURL(file)
      video.src = url
      video.onloadeddata = () => {
        video.currentTime = 0.1
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(video.videoWidth, 1280)
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth))
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        URL.revokeObjectURL(url)
        resolve(dataUrl)
      }
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      setTimeout(() => { URL.revokeObjectURL(url); resolve(null) }, 5000)
    })
  }, [])

  const buildShareableConfig = useCallback(async () => {
    const musicLib = musicTrack?.isLibrary
      ? MUSIC_LIBRARY.find(t => t.name === musicTrack.name)
      : null

    const mediaEntries = await Promise.all(screens.map(async (s) => {
      if (!s.file) return { id: s.id, n: s.name, vid: s.isVideo || false, gif: s.isGif || false, data: null }
      let data = null
      if (s.isVideo) {
        data = await videoToThumbnail(s.file)
      } else {
        data = await fileToDataUrl(s.file)
      }
      return { id: s.id, n: s.name, vid: s.isVideo || false, gif: s.isGif || false, data }
    }))

    return {
      v: 3,
      tid: activeTemplateId || null,
      dt: deviceType,
      anim: animation,
      bg: bgColor,
      bgG: bgGradient || null,
      base: showBase,
      shd: showDeviceShadow,
      theme: activeThemeId || null,
      logo: outroLogo,
      outro: templateOutroRef.current || 'none',
      split: textSplit,
      flip: layoutFlipped,
      ar: aspectRatio,
      q: quality,
      fmt: exportFormat,
      cdur: templateClipDurRef.current || 5,
      mdc: multiDeviceCount,

      sc: mediaEntries,
      tc: timelineClips.map(c => ({
        id: c.id,
        sid: c.screenId,
        st: c.startTime,
        d: c.duration,
        ts: c.trimStart,
        te: c.trimEnd,
        a: c.animation,
        oa: c.outroAnimation,
      })),
      tx: textOverlays.map(t => ({
        id: t.id,
        t: t.text,
        ff: t.fontFamily,
        fs: t.fontSize,
        c: t.color,
        a: t.animation,
        py: t.posY,
        fw: t.fontWeight,
        ta: t.textAlign,
        s: t.startTime,
        e: t.endTime,
      })),
      zx: zoomEffects.map(z => ({
        id: z.id,
        s: z.startTime,
        e: z.endTime,
        z: z.zoomLevel,
      })),
      mt: musicTrack ? {
        n: musicTrack.name,
        lib: musicLib?.id || null,
        s: musicTrack.startTime,
        e: musicTrack.endTime,
        vol: musicTrack.volume,
        isLib: !!musicTrack.isLibrary,
      } : null,
      vo: voiceoverTrack ? {
        n: voiceoverTrack.name,
        s: voiceoverTrack.startTime,
        e: voiceoverTrack.endTime,
        vol: voiceoverTrack.volume,
      } : null,
      ssm: screenSlotMap.length > 0 ? screenSlotMap : null,
      ass: activeScreenSlotsRef.current,
    }
  }, [activeTemplateId, deviceType, animation, bgColor, bgGradient, showBase, showDeviceShadow, activeThemeId, outroLogo, textSplit, layoutFlipped, aspectRatio, quality, exportFormat, screens, timelineClips, textOverlays, zoomEffects, musicTrack, voiceoverTrack, screenSlotMap, multiDeviceCount, fileToDataUrl, videoToThumbnail])

  const shareBlobIdRef = useRef(null)

  const handleShare = useCallback(async () => {
    setIsSaving(true)
    try {
      const config = await buildShareableConfig()

      let blobId = shareBlobIdRef.current
      let resp
      if (blobId) {
        resp = await fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(config),
        })
        if (!resp.ok) blobId = null
      }
      if (!blobId) {
        resp = await fetch('https://jsonblob.com/api/jsonBlob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(config),
        })
        if (!resp.ok) throw new Error('Failed to save project')
        blobId = resp.headers.get('X-jsonblob-id') || resp.headers.get('location')?.split('/').pop()
      }
      if (!blobId) throw new Error('No blob ID returned')
      shareBlobIdRef.current = blobId

      const url = new URL(window.location.href)
      url.search = ''
      url.hash = ''
      url.searchParams.set('p', blobId)

      const shareUrl = url.toString()

      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareToast('Link copied — includes media & effects')
      }).catch(() => {
        setShareToast('Link ready — copy from address bar')
        window.history.replaceState(null, '', shareUrl)
      })
    } catch (err) {
      console.error('Share failed:', err)
      setShareToast('Share failed — please try again')
    }
    setIsSaving(false)

    if (shareToastTimer.current) clearTimeout(shareToastTimer.current)
    shareToastTimer.current = setTimeout(() => setShareToast(null), 3000)
  }, [buildShareableConfig])

  // ── Load shared project from ?p=<blobId> or legacy ?config= ─────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // v3: load from jsonblob.com
    const blobId = params.get('p')
    if (blobId) {
      ;(async () => {
        try {
          const resp = await fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`, {
            headers: { Accept: 'application/json' },
          })
          if (!resp.ok) throw new Error('Project not found')
          const c = await resp.json()

          shareBlobIdRef.current = blobId
          setHasStarted(true)

          if (c.tid) setActiveTemplateId(c.tid)
          if (c.dt) setDeviceType(c.dt)
          if (c.anim) setAnimation(c.anim)
          if (c.bg) setBgColor(c.bg)
          if (c.bgG !== undefined) setBgGradient(c.bgG)
          if (c.base !== undefined) setShowBase(c.base)
          if (c.shd !== undefined) setShowDeviceShadow(c.shd)
          if (c.ar) setAspectRatio(c.ar)
          if (c.q) setQuality(c.q)
          if (c.fmt) setExportFormat(c.fmt)
          if (c.logo !== undefined) setOutroLogo(c.logo)
          if (c.outro) templateOutroRef.current = c.outro
          if (c.cdur) templateClipDurRef.current = c.cdur
          if (c.split !== undefined) setTextSplit(c.split)
          if (c.flip !== undefined) setLayoutFlipped(c.flip)
          if (c.mdc) setMultiDeviceCount(c.mdc)
          if (c.theme) {
            setActiveThemeId(c.theme)
            const themeColors = { 'wa-dark': '#0A1014', 'wa-light': '#E7FDE3', 'wa-beige': '#FEF4EB', 'wa-green': '#1DAA61' }
            if (themeColors[c.theme]) setBgColor(themeColors[c.theme])
          }

          // Restore screens from base64 data URLs
          if (c.sc?.length) {
            const restoredScreens = await Promise.all(c.sc.map(async (s) => {
              if (!s.data) return { id: s.id, file: null, url: '', name: s.n, isVideo: s.vid || false, isGif: s.gif || false }
              try {
                const mediaResp = await fetch(s.data)
                const blob = await mediaResp.blob()
                const file = new File([blob], s.n, { type: blob.type })
                const localUrl = URL.createObjectURL(file)
                return { id: s.id, file, url: localUrl, name: s.n, isVideo: false, isGif: false }
              } catch {
                return { id: s.id, file: null, url: '', name: s.n, isVideo: s.vid || false, isGif: s.gif || false }
              }
            }))
            setScreens(restoredScreens)
          }

          if (c.tc?.length) {
            setTimelineClips(recalcStartTimes(c.tc.map(cl => ({
              id: cl.id || crypto.randomUUID(),
              screenId: cl.sid,
              startTime: cl.st || 0,
              duration: cl.d || 5,
              trimStart: cl.ts || 0,
              trimEnd: cl.te || cl.d || 5,
              animation: cl.a || c.anim || 'showcase',
              outroAnimation: cl.oa || 'none',
            }))))
          }

          if (c.tx?.length) {
            setTextOverlays(c.tx.map(t => ({
              id: t.id || crypto.randomUUID(),
              text: t.t || '',
              fontFamily: t.ff || 'Inter',
              fontSize: t.fs || 48,
              color: t.c || '#FFFFFF',
              animation: t.a || 'none',
              posY: t.py ?? 0,
              fontWeight: t.fw ?? 600,
              textAlign: t.ta || 'center',
              startTime: t.s ?? 0,
              endTime: t.e ?? 2.5,
            })))
          }

          if (c.zx?.length) {
            setZoomEffects(c.zx.map(z => ({
              id: z.id || crypto.randomUUID(),
              startTime: z.s,
              endTime: z.e,
              zoomLevel: z.z || 2,
            })))
          }

          if (c.ssm) setScreenSlotMap(c.ssm)
          if (c.ass) {
            setActiveScreenSlots(c.ass)
            activeScreenSlotsRef.current = c.ass
          }

          if (c.mt) {
            if (c.mt.isLib && c.mt.lib) {
              const libTrack = MUSIC_LIBRARY.find(t => t.id === c.mt.lib)
              if (libTrack) handleSetMusic({ libraryId: libTrack.id, name: libTrack.name })
            }
          }

          setSidebarTab('media')
          hasUnsavedChanges.current = false
          setTimeout(() => { setIsPlaying(true); setIsTimelinePlaying(true) }, 500)
        } catch (e) { console.warn('Failed to load shared project:', e) }
      })()
      return
    }

    // Legacy: handle old ?config= base64 links
    const encoded = params.get('config')
    if (encoded) {
      try {
        const json = decodeURIComponent(escape(atob(encoded)))
        const config = JSON.parse(json)
        if (config.templateId) {
          const tmpl = TEMPLATES.find(t => t.id === config.templateId)
          if (tmpl) {
            handleSelectTemplate(tmpl)
            setTimeout(() => {
              if (config.textOverlay) {
                setTextOverlays(prev => {
                  if (prev.length === 0) {
                    return [{ id: crypto.randomUUID(), text: config.textOverlay.text || 'New Text', fontFamily: 'Inter', fontSize: config.textOverlay.fontSize || 48, color: config.textOverlay.color || '#FFFFFF', animation: config.textOverlay.animation || 'none', posY: config.textOverlay.posY ?? 0, startTime: config.textOverlay.startTime ?? 0, endTime: config.textOverlay.endTime ?? 2.5 }]
                  }
                  return prev.map((t, i) => i === 0 ? { ...t, ...config.textOverlay } : t)
                })
              }
              if (config.textSplit !== undefined) setTextSplit(config.textSplit)
              if (config.layoutFlipped !== undefined) setLayoutFlipped(config.layoutFlipped)
            }, 200)
          }
        } else {
          setHasStarted(true)
          if (config.deviceType) setDeviceType(config.deviceType)
          if (config.animation) {
            setAnimation(config.animation)
            const clipDur = config.clipDuration || 5
            setTimelineClips(recalcStartTimes([{ id: crypto.randomUUID(), screenId: null, duration: clipDur, trimStart: 0, trimEnd: clipDur, animation: config.animation, outroAnimation: config.outroAnimation || 'none' }]))
            templateClipDurRef.current = clipDur
          }
          if (config.outroAnimation) templateOutroRef.current = config.outroAnimation
          if (config.bgColor) setBgColor(config.bgColor)
          if (config.bgGradient !== undefined) setBgGradient(config.bgGradient)
          if (config.showBase !== undefined) setShowBase(config.showBase)
          if (config.showDeviceShadow !== undefined) setShowDeviceShadow(config.showDeviceShadow)
          if (config.aspectRatio) setAspectRatio(config.aspectRatio)
          if (config.outroLogo !== undefined) setOutroLogo(config.outroLogo)
          if (config.whatsappTheme) {
            setActiveThemeId(config.whatsappTheme)
            const themeColors = { 'wa-dark': '#0A1014', 'wa-light': '#E7FDE3', 'wa-beige': '#FEF4EB', 'wa-green': '#1DAA61' }
            if (themeColors[config.whatsappTheme]) setBgColor(themeColors[config.whatsappTheme])
          }
          if (config.textOverlay) {
            setTextOverlays([{ id: crypto.randomUUID(), text: config.textOverlay.text || 'New Text', fontFamily: 'Inter', fontSize: config.textOverlay.fontSize || 48, color: config.textOverlay.color || '#FFFFFF', animation: config.textOverlay.animation || 'none', posY: config.textOverlay.posY ?? 0, startTime: config.textOverlay.startTime ?? 0, endTime: config.textOverlay.endTime ?? 2.5 }])
          }
          if (config.textSplit !== undefined) setTextSplit(config.textSplit)
          if (config.layoutFlipped !== undefined) setLayoutFlipped(config.layoutFlipped)
          if (config.musicId) {
            const track = MUSIC_LIBRARY.find(t => t.id === config.musicId)
            if (track) handleSetMusic({ libraryId: track.id, name: track.name })
          }
          setSidebarTab('media')
          setTimeout(() => { setIsPlaying(true); setIsTimelinePlaying(true) }, 300)
        }
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('config')
        window.history.replaceState(null, '', cleanUrl.toString())
      } catch (e) { console.warn('Failed to restore shared config:', e) }
      return
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAIGenerate = useCallback((result) => {
    const config = result?.config || result
    if (!config) return
    hasUnsavedChanges.current = false

    if (result?.voiceoverScript) setAiVoiceoverScript(result.voiceoverScript)
    if (result?.featureContext) setAiFeatureContext(result.featureContext)

    setHasStarted(true)
    setActiveTemplateId('ai-generated')

    if (config.deviceType) setDeviceType(config.deviceType)
    if (config.animation) setAnimation(config.animation)
    if (config.bgColor) setBgColor(config.bgColor)
    setBgGradient(false)
    setShowBase(false)

    if (config.whatsappTheme) {
      setActiveThemeId(config.whatsappTheme)
      const themeColors = {
        'wa-dark': '#0A1014',
        'wa-light': '#E7FDE3',
        'wa-beige': '#FEF4EB',
        'wa-green': '#1DAA61',
      }
      if (themeColors[config.whatsappTheme]) setBgColor(themeColors[config.whatsappTheme])
    } else {
      setActiveThemeId(null)
    }

    setOutroLogo(config.outroLogo || null)

    templateOutroRef.current = config.outroAnimation || 'none'
    templateClipDurRef.current = config.clipDuration || 5

    if (config.textOverlay) {
      const t = config.textOverlay
      setTextOverlays([{
        id: crypto.randomUUID(),
        text: t.text,
        fontFamily: globalBrandTheme === 'instagram' ? 'Instagram Sans' : 'Inter',
        fontSize: t.fontSize || 48,
        color: t.color || '#FFFFFF',
        animation: t.animation || 'slideFromBottom',
        posY: -0.45,
        startTime: 0,
        endTime: Math.min(2.5, config.clipDuration || 5),
      }])
    } else {
      setTextOverlays([])
    }

    const multiAnims = new Set([
      'sideScroll10', 'angled3ZoomOut', 'circle4Rotate', 'angledZoom4',
      'carousel6', 'flatScatter7', 'offsetCircleRotate',
    ])

    if (multiAnims.has(config.animation) && config.screenSlotCount) {
      const count = config.screenSlotCount
      setMultiDeviceCount(count)
      const slots = Array.from({ length: count }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' }))
      setActiveScreenSlots(slots)
      setScreenSlotMap(slots.map((_, i) => screens[i]?.id || null))
    } else if (config.animation === 'floatingPhoneLaptop' || config.animation === 'phoneInFrontLaptop') {
      setActiveScreenSlots([
        { label: 'Phone', device: 'iPhone' },
        { label: 'Laptop', device: 'MacBook' },
      ])
      setScreenSlotMap([screens[0]?.id || null, screens[1]?.id || null])
    } else {
      setActiveScreenSlots(null)
      setScreenSlotMap([])
    }

    const clipDur = config.clipDuration || 5
    setTimelineClips((prev) => {
      if (prev.length === 0) {
        return recalcStartTimes([{
          id: crypto.randomUUID(),
          screenId: null,
          duration: clipDur,
          trimStart: 0,
          trimEnd: clipDur,
          animation: config.animation || 'none',
          outroAnimation: config.outroAnimation || 'none',
        }])
      }
      return recalcStartTimes(
        prev.map((c) => ({
          ...c,
          duration: c.duration > 0 ? c.duration : clipDur,
          animation: config.animation || c.animation,
          outroAnimation: config.outroAnimation || 'none',
        }))
      )
    })

    setZoomEffects([])

    if (result?.recommendedMusicId) {
      setTimeout(() => {
        handleSetMusic({ libraryId: result.recommendedMusicId, name: MUSIC_LIBRARY.find(t => t.id === result.recommendedMusicId)?.name || 'AI Pick' })
      }, 300)
    }

    setSidebarTab('media')
    setCurrentTime(0)
    setTimeout(() => {
      setIsPlaying(true)
      setIsTimelinePlaying(true)
      hasUnsavedChanges.current = false
    }, 500)
  }, [screens, handleSetMusic])

  const handleStartBlank = useCallback(() => {
    hasUnsavedChanges.current = false
    setHasStarted(true)
    setDeviceType('iphone')
    setSidebarTab('media')
    setTimelineClips((prev) => {
      if (prev.length > 0) return prev
      return recalcStartTimes([{
        id: crypto.randomUUID(),
        screenId: null,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
        animation: animation,
        outroAnimation: 'none',
      }])
    })
    if (globalBrandTheme === 'whatsapp') {
      const theme = WA_THEMES.find((t) => t.id === 'wa-light')
      if (theme) {
        setActiveThemeId(theme.id)
        setBgColor(theme.bgColor)
        setBgGradient(theme.bgGradient)
        setShowBase(false)
      }
    }
  }, [globalBrandTheme, animation])

  const toggleSiteTheme = useCallback(() => {
    setSiteTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  // ── Back / reset handler ────────────────────────
  const handleConfirmBack = useCallback(() => {
    setIsPlaying(false)
    setIsTimelinePlaying(false)
    try {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop()
      }
    } catch (_) { /* ignore */ }
    setIsRecording(false)

    try {
      screens.forEach((s) => URL.revokeObjectURL(s.url))
      if (musicTrack?.url && !musicTrack.isLibrary) URL.revokeObjectURL(musicTrack.url)
      if (voiceoverTrack?.url) URL.revokeObjectURL(voiceoverTrack.url)
    } catch (_) { /* ignore cleanup errors */ }

    setScreens([])
    setTimelineClips([])
    setCurrentTime(0)
    setSelectedClipId(null)
    setZoomEffects([])
    setTextOverlays([])
    setSelectedTextId(null)
    setMusicTrack(null)
    setVoiceoverTrack(null)
    setSelectedAudioTrack(null)
    setActiveTemplateId(null)
    setActiveThemeId(null)
    setOutroLogo(null)
    setDeviceType(loadSaved('deviceType', 'iphone'))
    setAnimation('showcase')
    setBgColor(loadSaved('bgColor', '#161717'))
    setBgGradient(loadSaved('bgGradient', false))
    setShowBase(loadSaved('showBase', false))
    setShowDeviceShadow(loadSaved('showDeviceShadow', false))
    setQuality(loadSaved('quality', '1080p'))
    setAspectRatio(loadSaved('aspectRatio', 'none'))
    setScreenSlotMap([])
    setActiveScreenSlots(null)
    templateOutroRef.current = 'none'
    templateClipDurRef.current = 3
    setSidebarTab('templates')
    setShowBackConfirm(false)
    setHasStarted(false)
    hasUnsavedChanges.current = false

    shareBlobIdRef.current = null

    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('p')
    cleanUrl.searchParams.delete('s')
    cleanUrl.searchParams.delete('project')
    cleanUrl.searchParams.delete('config')
    window.history.replaceState(null, '', cleanUrl.toString())
  }, [screens, musicTrack, voiceoverTrack])

  const handleBackClick = useCallback(() => {
    if (hasUnsavedChanges.current) {
      setShowBackConfirm(true)
    } else {
      window.history.back()
    }
  }, [])

  const handleConfirmBackFromModal = useCallback(() => {
    hasUnsavedChanges.current = false
    setShowBackConfirm(false)
    window.history.back()
  }, [])

  // Push a history entry when entering the editor so browser back returns to home
  useEffect(() => {
    if (!hasStarted) return
    window.history.pushState({ editor: true }, '')

    const handlePopState = () => {
      if (hasUnsavedChanges.current) {
        window.history.pushState({ editor: true }, '')
        setShowBackConfirm(true)
      } else {
        handleConfirmBack()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hasStarted, handleConfirmBack])

  // Warn on browser refresh when there are unsaved changes
  useEffect(() => {
    if (!hasStarted || screens.length === 0) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasStarted, screens.length])

  const hasScreens = screens.length > 0

  return (
    <div className="app">
      <Header
        siteTheme={siteTheme}
        onToggleTheme={toggleSiteTheme}
        leftAction={hasStarted ? (
          <button
            className="btn btn-header btn-back"
            onClick={handleBackClick}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : null}
      >
        {hasStarted && !convertingFormat && (
          <>
            <button
              className="btn btn-header btn-share"
              onClick={handleShare}
              disabled={isSaving}
              title="Copy shareable link"
            >
              {isSaving ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              )}
              {isSaving ? 'Saving…' : 'Share'}
            </button>
            <button
              className="btn btn-header btn-secondary"
              onClick={togglePlayback}
            >
              {isTimelinePlaying ? '⏸ Pause' : '▶ Preview'}
            </button>
            <button
              className={`btn btn-header btn-primary ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : () => setShowExport(true)}
              disabled={!hasScreens}
            >
              {isRecording ? '⏹ Stop Recording' : '⏺ Record & Export'}
            </button>
          </>
        )}
        {hasStarted && convertingFormat && (
          <div className="btn btn-header btn-converting">
            Converting to {convertingFormat}...
          </div>
        )}
      </Header>
      <main className="main-layout">
        {!hasStarted ? (
          <div className="landing-page">
            <div className="landing-hero">
              <div className="upload-hero-bg" />
              <div className="landing-content">
                <div className="upload-icon-large">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="12" width="20" height="36" rx="4" stroke="url(#ug1)" strokeWidth="2.5" />
                    <rect x="36" y="12" width="20" height="36" rx="4" stroke="url(#ug2)" strokeWidth="2.5" />
                    <path d="M32 4L28 10H36L32 4Z" fill="#21C063" opacity="0.5" />
                    <path d="M32 60L28 54H36L32 60Z" fill="#1aad56" opacity="0.5" />
                    <defs>
                      <linearGradient id="ug1" x1="8" y1="12" x2="28" y2="48">
                        <stop stopColor="#21C063" />
                        <stop offset="1" stopColor="#2ed874" />
                      </linearGradient>
                      <linearGradient id="ug2" x1="36" y1="12" x2="56" y2="48">
                        <stop stopColor="#1aad56" />
                        <stop offset="1" stopColor="#21C063" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h1 className="upload-title">Create Stunning Demo Videos</h1>
                <p className="upload-subtitle">
                  Pick a template to get started, or begin with a blank canvas
                </p>
              </div>
            </div>
            <div className="landing-section">
              <TemplateGallery
                onSelectTemplate={handleSelectTemplate}
                activeTemplateId={activeTemplateId}
                onStartBlank={handleStartBlank}
                onAIGenerate={handleAIGenerate}
                aiLoading={aiLoading}
                globalBrandTheme={globalBrandTheme}
                onBrandThemeChange={setGlobalBrandTheme}
              />
            </div>
          </div>
        ) : (
          <>
            <aside className="sidebar">
              <nav className="sidebar-tabs">
                {[
                  { id: 'ai', label: 'AI', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    </svg>
                  )},
                  { id: 'templates', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  )},
                  { id: 'media', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )},
                  { id: 'animations', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="7" rx="9" ry="3.5" opacity="0.4" />
                      <ellipse cx="12" cy="12" rx="9" ry="3.5" opacity="0.7" />
                      <ellipse cx="12" cy="17" rx="9" ry="3.5" />
                    </svg>
                  )},
                  { id: 'text', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9.5" y1="20" x2="14.5" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  )},
                  { id: 'audio', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  )},
                  { id: 'device', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                  )},
                  { id: 'background', label: 'Themes', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                  )},
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
                    onClick={() => setSidebarTab(tab.id)}
                  >
                    {tab.icon}
                    <span className="sidebar-tab-label">{tab.label || tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}</span>
                  </button>
                ))}
              </nav>
              <div className="sidebar-content">
                {sidebarTab === 'ai' && (
                  <AIAssistant
                    getCurrentConfig={getCurrentConfig}
                    onApplyDelta={applyConfigDelta}
                    inline
                  />
                )}

                {sidebarTab === 'templates' && (
                  <TemplateGallery
                    onSelectTemplate={handleSelectTemplate}
                    activeTemplateId={activeTemplateId}
                    onAIGenerate={handleAIGenerate}
                    aiLoading={aiLoading}
                    globalBrandTheme={globalBrandTheme}
                    onBrandThemeChange={setGlobalBrandTheme}
                    compact
                  />
                )}

                {sidebarTab === 'media' && (
                  <>
                    <UploadPanel onUpload={handleUpload} compact />

                    <div className="screen-list">
                      <h3 className="section-title">Screens ({screens.length})</h3>
                      {screens.map((screen, index) => (
                        <div key={screen.id} className="screen-thumb">
                          {screen.isVideo ? (
                            <video src={screen.url} muted className="screen-thumb-video" />
                          ) : (
                            <img src={screen.url} alt={screen.name} />
                          )}
                          <div className="screen-thumb-info">
                            <span className="screen-thumb-name">{screen.name}</span>
                            <span className="screen-thumb-index">
                              {screen.isVideo ? 'Video' : screen.isGif ? 'GIF' : `Screen ${index + 1}`}
                            </span>
                          </div>
                          <button
                            className="screen-thumb-remove"
                            onClick={() => handleRemoveScreen(screen.id)}
                            aria-label="Remove screen"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {activeScreenSlots && activeScreenSlots.length > 0 && (
                      <div className="screen-slot-panel">
                        <h3 className="section-title">Assign Media to Devices</h3>
                        <p className="slot-hint">Select which screen each device shows</p>
                        {['sideScroll10', 'carousel6', 'flatScatter7', 'offsetCircleRotate', 'angledZoom4', 'circle4Rotate'].includes(animation) && (() => {
                          const maxDevices = animation === 'circle4Rotate' ? 6 : 20
                          return (
                          <div className="device-count-row">
                            <span className="device-count-label">Number of devices</span>
                            <div className="device-count-stepper">
                              <button
                                className="stepper-btn"
                                disabled={multiDeviceCount <= 2}
                                onClick={() => {
                                  const next = Math.max(2, multiDeviceCount - 1)
                                  setMultiDeviceCount(next)
                                  const slots = Array.from({ length: next }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' }))
                                  setActiveScreenSlots(slots)
                                  setScreenSlotMap((prev) => {
                                    return slots.map((_, i) => prev[i] || screens[i]?.id || screens[0]?.id || null)
                                  })
                                }}
                              >
                                −
                              </button>
                              <span className="stepper-value">{multiDeviceCount}</span>
                              <button
                                className="stepper-btn"
                                disabled={multiDeviceCount >= maxDevices}
                                onClick={() => {
                                  const next = Math.min(maxDevices, multiDeviceCount + 1)
                                  setMultiDeviceCount(next)
                                  const slots = Array.from({ length: next }, (_, i) => ({ label: `Phone ${i + 1}`, device: 'iPhone' }))
                                  setActiveScreenSlots(slots)
                                  setScreenSlotMap((prev) => {
                                    return slots.map((_, i) => prev[i] || screens[i]?.id || screens[0]?.id || null)
                                  })
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          )
                        })()}
                        <div className="screen-slot-list">
                          {activeScreenSlots.map((slot, i) => {
                            const assignedId = screenSlotMap[i] || null
                            const assignedScreen = assignedId ? screens.find((s) => s.id === assignedId) : null
                            return (
                              <div key={i} className="screen-slot-row">
                                <div className="screen-slot-label">
                                  <span className="slot-index">{i + 1}</span>
                                  <div className="slot-info">
                                    <span className="slot-name">{slot.label}</span>
                                    <span className="slot-device">{slot.device}</span>
                                  </div>
                                </div>
                                <div className="screen-slot-picker">
                                  {assignedScreen ? (
                                    <div className="slot-preview-wrap">
                                      {assignedScreen.isVideo ? (
                                        <video src={assignedScreen.url} muted className="slot-preview-thumb" />
                                      ) : (
                                        <img src={assignedScreen.url} alt="" className="slot-preview-thumb" />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="slot-preview-empty" />
                                  )}
                                  <select
                                    className="slot-select"
                                    value={assignedId || ''}
                                    onChange={(e) => {
                                      const val = e.target.value || null
                                      setScreenSlotMap((prev) => {
                                        const next = [...prev]
                                        next[i] = val
                                        return next
                                      })
                                    }}
                                  >
                                    <option value="">
                                      {screens.length === 0 ? 'No media uploaded' : 'Select media…'}
                                    </option>
                                    {screens.map((s, si) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name || `Screen ${si + 1}`}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sidebarTab === 'text' && (() => {
                  const selectedText = textOverlays.find((t) => t.id === selectedTextId)
                  return (
                    <div className="controls-panel">
                      <div className="control-group">
                        <h3 className="section-title">Text Overlays</h3>
                        <div className="text-add-wrap">
                          <button className="btn-add-text" onClick={handleAddText}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Text
                          </button>
                        </div>
                        {textOverlays.length === 0 && (
                          <p className="anim-hint">Add text overlays to your video</p>
                        )}
                        <div className="text-list">
                          {textOverlays.map((overlay) => (
                            <div
                              key={overlay.id}
                              className={`text-item ${selectedTextId === overlay.id ? 'active' : ''}`}
                              onClick={() => setSelectedTextId(overlay.id)}
                            >
                              <span className="text-item-preview">{overlay.text || 'Empty'}</span>
                              <button
                                className="text-item-remove"
                                onClick={(e) => { e.stopPropagation(); handleRemoveText(overlay.id) }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedText && (
                        <div className="control-group">
                          <h3 className="section-title">Edit</h3>
                          <div className="text-editor">
                            <div className="te-row">
                              <input
                                type="text"
                                className="te-input"
                                value={selectedText.text}
                                onChange={(e) => handleUpdateText(selectedText.id, { text: e.target.value })}
                                placeholder="Enter text..."
                              />
                            </div>
                            <div className="te-row">
                              <label className="control-label">Font</label>
                              <select
                                className="te-select"
                                value={selectedText.fontFamily}
                                onChange={(e) => {
                                  const font = FONT_OPTIONS.find((f) => f.name === e.target.value)
                                  handleUpdateText(selectedText.id, { fontFamily: font.name })
                                }}
                              >
                                {FONT_OPTIONS.map((f) => (
                                  <option key={f.name} value={f.name}>{f.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Size</label>
                              <div className="te-size-wrap">
                                <input
                                  type="range"
                                  min="16"
                                  max="120"
                                  step="1"
                                  value={selectedText.fontSize}
                                  onChange={(e) => handleUpdateText(selectedText.id, { fontSize: parseInt(e.target.value) })}
                                  className="te-slider"
                                />
                                <span className="te-size-val">{selectedText.fontSize}px</span>
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Weight</label>
                              <div className="control-chips">
                                {[
                                  { val: 300, label: 'Light' },
                                  { val: 400, label: 'Regular' },
                                  { val: 600, label: 'Semi' },
                                  { val: 700, label: 'Bold' },
                                  { val: 900, label: 'Black' },
                                ].map((w) => (
                                  <button
                                    key={w.val}
                                    className={`chip small ${(selectedText.fontWeight || 600) === w.val ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { fontWeight: w.val })}
                                  >
                                    {w.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Align</label>
                              <div className="control-chips">
                                {[
                                  { val: 'left', icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                                    </svg>
                                  )},
                                  { val: 'center', icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                                    </svg>
                                  )},
                                  { val: 'right', icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                                    </svg>
                                  )},
                                ].map((a) => (
                                  <button
                                    key={a.val}
                                    className={`chip small ${(selectedText.textAlign || 'center') === a.val ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { textAlign: a.val })}
                                    title={a.val.charAt(0).toUpperCase() + a.val.slice(1)}
                                  >
                                    {a.icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Color</label>
                              <div className="color-picker-wrap">
                                <input
                                  type="color"
                                  value={selectedText.color}
                                  onChange={(e) => handleUpdateText(selectedText.id, { color: e.target.value })}
                                  className="color-input"
                                />
                                <input
                                  type="text"
                                  className="color-value color-value-edit"
                                  value={selectedText.color}
                                  onChange={(e) => {
                                    let v = e.target.value
                                    if (!v.startsWith('#')) v = '#' + v
                                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleUpdateText(selectedText.id, { color: v })
                                  }}
                                  onBlur={(e) => {
                                    let v = e.target.value
                                    if (/^#[0-9a-fA-F]{6}$/.test(v)) handleUpdateText(selectedText.id, { color: v })
                                  }}
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Position</label>
                              <div className="control-chips">
                                {[
                                  { val: 0.45, label: 'Top' },
                                  { val: 0, label: 'Center' },
                                  { val: -0.45, label: 'Bottom' },
                                ].map((pos) => (
                                  <button
                                    key={pos.val}
                                    className={`chip small ${selectedText.posY === pos.val && (selectedText.posX || 0) === 0 ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { posX: 0, posY: pos.val })}
                                  >
                                    {pos.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="te-row">
                              <label className="control-label">Layer</label>
                              <div className="control-chips">
                                <button
                                  className={`chip small ${!selectedText.behindDevice ? 'active' : ''}`}
                                  onClick={() => handleUpdateText(selectedText.id, { behindDevice: false })}
                                >
                                  In Front
                                </button>
                                <button
                                  className={`chip small ${selectedText.behindDevice ? 'active' : ''}`}
                                  onClick={() => handleUpdateText(selectedText.id, { behindDevice: true })}
                                >
                                  Behind
                                </button>
                              </div>
                            </div>
                            {textOverlays.length <= 1 && (
                            <div className="te-row-col">
                              <label className="control-label">Animation</label>
                              <div className="text-anim-options">
                                {TEXT_ANIMATIONS.map((anim) => (
                                  <button
                                    key={anim.id}
                                    className={`text-anim-btn ${selectedText.animation === anim.id ? 'active' : ''}`}
                                    onClick={() => handleUpdateText(selectedText.id, { animation: anim.id })}
                                  >
                                    {anim.id === 'none' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="8" opacity="0.4" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromRight' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 5 5 12 12 19" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromLeft' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromBottom' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                                      </svg>
                                    )}
                                    {anim.id === 'slideFromTop' && (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {sidebarTab === 'device' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">Device Type</h3>
                      <div className="animation-grid">
                        {[
                          { id: 'iphone', label: 'iPhone', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="14" y="6" width="20" height="36" rx="3" />
                              <line x1="21" y1="10" x2="27" y2="10" opacity="0.5" />
                              <circle cx="24" cy="37" r="1" fill="currentColor" opacity="0.3" />
                            </svg>
                          )},
                          { id: 'android', label: 'Android', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="14" y="6" width="20" height="36" rx="2.5" />
                              <circle cx="24" cy="10" r="1" fill="currentColor" opacity="0.4" />
                            </svg>
                          )},
                          { id: 'ipad', label: 'iPad', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="10" y="8" width="28" height="32" rx="3" />
                              <circle cx="24" cy="11" r="0.8" fill="currentColor" opacity="0.3" />
                            </svg>
                          )},
                          { id: 'macbook', label: 'MacBook', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="10" y="10" width="28" height="20" rx="2" />
                              <path d="M6 30 L42 30 L40 34 L8 34 Z" />
                            </svg>
                          )},
                          { id: 'both', label: 'Both', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="8" y="8" width="16" height="28" rx="2.5" />
                              <line x1="14" y1="11" x2="18" y2="11" opacity="0.5" />
                              <rect x="28" y="8" width="16" height="28" rx="2" />
                              <circle cx="36" cy="11" r="0.8" fill="currentColor" opacity="0.4" />
                            </svg>
                          )},
                          { id: 'media', label: 'None', icon: (
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="12" y="8" width="24" height="32" rx="4" strokeDasharray="4 2" />
                              <path d="M20 18 L32 24 L20 30 Z" fill="currentColor" opacity="0.3" />
                            </svg>
                          )},
                        ].map((d) => (
                          <button
                            key={d.id}
                            className={`animation-tile ${deviceType === d.id ? 'active' : ''}`}
                            onClick={() => { markChanged(); setDeviceType(d.id) }}
                          >
                            <div className="animation-tile-icon">{d.icon}</div>
                            <span className="animation-tile-name">{d.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="control-group">
                      <h3 className="section-title">Aspect Ratio</h3>
                      <div className="aspect-ratio-grid">
                        <button
                          className={`aspect-ratio-tile ${aspectRatio === 'none' ? 'active' : ''}`}
                          onClick={() => setAspectRatio('none')}
                        >
                          <div className="aspect-ratio-icon">
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                              <rect x="7" y="7" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="currentColor" fillOpacity="0.04" />
                              <path d="M10 13V10h3M23 10h3v3M26 23v3h-3M13 26h-3v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <span className="aspect-ratio-label">None</span>
                          <span className="aspect-ratio-desc">Full</span>
                        </button>
                        {[
                          { id: '16:9', label: '16:9', desc: 'Landscape', w: 16, h: 9 },
                          { id: '9:16', label: '9:16', desc: 'Portrait', w: 9, h: 16 },
                          { id: '1:1', label: '1:1', desc: 'Square', w: 1, h: 1 },
                          { id: '4:5', label: '4:5', desc: 'Feed', w: 4, h: 5 },
                          { id: '4:3', label: '4:3', desc: 'Classic', w: 4, h: 3 },
                        ].map((ar) => (
                          <button
                            key={ar.id}
                            className={`aspect-ratio-tile ${aspectRatio === ar.id ? 'active' : ''}`}
                            onClick={() => setAspectRatio(ar.id)}
                          >
                            <div className="aspect-ratio-icon">
                              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                {(() => {
                                  const maxDim = 22
                                  const scale = maxDim / Math.max(ar.w, ar.h)
                                  const rw = ar.w * scale
                                  const rh = ar.h * scale
                                  const rx = (36 - rw) / 2
                                  const ry = (36 - rh) / 2
                                  return (
                                    <rect
                                      x={rx} y={ry} width={rw} height={rh} rx="2"
                                      stroke="currentColor" strokeWidth="1.5"
                                      fill="currentColor" fillOpacity="0.08"
                                    />
                                  )
                                })()}
                              </svg>
                            </div>
                            <span className="aspect-ratio-label">{ar.label}</span>
                            <span className="aspect-ratio-desc">{ar.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="control-group">
                      <h3 className="section-title">Export</h3>
                      <div className="control-row">
                        <label className="control-label">Quality</label>
                        <div className="control-chips">
                          {['720p', '1080p', '4k'].map((q) => (
                            <button
                              key={q}
                              className={`chip small ${quality === q ? 'active' : ''}`}
                              onClick={() => setQuality(q)}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {sidebarTab === 'animations' && (() => {
                  const selClip = timelineClips.find((c) => c.id === selectedClipId)
                  const targetClip = selClip || activeClip
                  const currentAnim = targetClip ? targetClip.animation : animation
                  const currentOutro = targetClip ? (targetClip.outroAnimation || 'none') : 'none'
                  return (
                    <div className="controls-panel">
                      <div className="control-group">
                        <h3 className="section-title">
                          {selClip ? `Intro — ${screens.find((s) => s.id === selClip.screenId)?.name || 'Clip'}` : 'Intro Animation'}
                        </h3>
                        {!selClip && timelineClips.length > 1 && (
                          <p className="anim-hint">Select a clip in the timeline to set a different animation per clip</p>
                        )}
                        <div className="animation-grid">
                          {ANIMATION_PRESETS.filter((preset) => {
                            if (preset.macbookOnly) return deviceType === 'macbook'
                            if (preset.bothOnly) return deviceType === 'both'
                            return !preset.macbookOnly
                          }).map((preset) => (
                            <button
                              key={preset.id}
                              className={`animation-tile ${currentAnim === preset.id ? 'active' : ''}`}
                              onClick={() => {
                                markChanged()
                                const clip = selClip || activeClip
                                if (clip) {
                                  handleUpdateClip(clip.id, { animation: preset.id })
                                  setCurrentTime(clip.startTime)
                                }
                                setAnimation(preset.id)
                                setIsPlaying(true)
                                setIsTimelinePlaying(true)
                              }}
                            >
                              <div className="animation-tile-icon">
                                {ANIM_ICONS[preset.id]}
                              </div>
                              <span className="animation-tile-name">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="control-group">
                        <h3 className="section-title">Exit Animation</h3>
                        <p className="anim-hint">Plays during the last 1.8s of the clip</p>
                        <div className="animation-grid">
                          {OUTRO_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              className={`animation-tile ${currentOutro === preset.id ? 'active' : ''}`}
                              onClick={() => {
                                markChanged()
                                const clip = selClip || activeClip
                                if (clip) {
                                  handleUpdateClip(clip.id, { outroAnimation: preset.id })
                                  if (preset.id !== 'none') {
                                    setCurrentTime(Math.max(0, clip.startTime + clip.duration - 1.8))
                                  }
                                }
                                setIsPlaying(true)
                                setIsTimelinePlaying(true)
                              }}
                            >
                              <div className="animation-tile-icon">
                                {ANIM_ICONS[preset.id] || (
                                  <svg viewBox="0 0 48 48" fill="none" className="anim-icon">
                                    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                                  </svg>
                                )}
                              </div>
                              <span className="animation-tile-name">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {sidebarTab === 'audio' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">Background Music</h3>
                      {musicTrack ? (
                        <div className="audio-active-track">
                          <div className="audio-track-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                            <span className="audio-track-name">{musicTrack.name}</span>
                            <button className="audio-track-remove" onClick={handleRemoveMusic} title="Remove">×</button>
                          </div>
                          <div className="audio-volume-row">
                            <label className="control-label-sm">Volume</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={musicTrack.volume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                handleUpdateMusic({ volume: v })
                                if (audioEngineRef.current) audioEngineRef.current.setMusicVolume(v)
                              }}
                              className="volume-slider"
                            />
                            <span className="volume-val">{Math.round(musicTrack.volume * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="music-library-grid">
                            {MUSIC_LIBRARY.map((track) => {
                              const isLoading = loadingTrackId === track.id
                              const isPreviewing = previewingTrackId === track.id
                              return (
                                <div
                                  key={track.id}
                                  className={`music-card ${isLoading ? 'loading' : ''}`}
                                >
                                  <div className="music-card-info">
                                    <span className="music-card-name">{track.name}</span>
                                  </div>
                                  <div className="music-card-actions">
                                    <button
                                      className={`music-card-preview ${isPreviewing ? 'playing' : ''}`}
                                      onClick={() => handlePreviewLibraryTrack(track.id)}
                                      disabled={isLoading && !isPreviewing}
                                      title={isPreviewing ? 'Stop' : 'Preview'}
                                    >
                                      {isLoading && !isPreviewing ? (
                                        <span className="music-card-spinner" />
                                      ) : isPreviewing ? '⏹' : '▶'}
                                    </button>
                                    <button
                                      className="music-card-select"
                                      onClick={() => handleSetMusic({ libraryId: track.id, name: track.name })}
                                      disabled={isLoading}
                                    >
                                      {isLoading ? '...' : 'Use'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="audio-upload-section">
                            <span className="audio-or-label">or upload your own</span>
                            <label className="btn-audio-upload">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Upload Music
                              <input
                                type="file"
                                accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files[0]) handleSetMusic({ file: e.target.files[0] })
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="control-group">
                      <h3 className="section-title">Voiceover</h3>
                      {voiceoverTrack ? (
                        <div className="audio-active-track">
                          <div className="audio-track-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span className="audio-track-name">{voiceoverTrack.name}</span>
                            <button className="audio-track-remove" onClick={handleRemoveVoiceover} title="Remove">×</button>
                          </div>
                          <div className="audio-volume-row">
                            <label className="control-label-sm">Volume</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={voiceoverTrack.volume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                handleUpdateVoiceover({ volume: v })
                                if (audioEngineRef.current) audioEngineRef.current.setVoiceoverVolume(v)
                              }}
                              className="volume-slider"
                            />
                            <span className="volume-val">{Math.round(voiceoverTrack.volume * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label className="btn-audio-upload">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload Voiceover
                            <input
                              type="file"
                              accept="audio/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files[0]) handleSetVoiceover(e.target.files[0])
                                e.target.value = ''
                              }}
                            />
                          </label>
                          <button
                            className="btn-ai-voiceover"
                            onClick={async () => {
                              setVoiceoverScriptLoading(true)
                              try {
                                const headline = textOverlays[0]?.text || ''
                                const res = await fetch('/api/ai/voiceover', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    feature: aiFeatureContext || headline,
                                    product: activeThemeId?.startsWith('wa-') ? 'WhatsApp' : null,
                                    headline,
                                  }),
                                })
                                const data = await res.json()
                                if (data.script) setAiVoiceoverScript(data.script)
                              } catch {
                                /* silent */
                              } finally {
                                setVoiceoverScriptLoading(false)
                              }
                            }}
                            disabled={voiceoverScriptLoading}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                            </svg>
                            {voiceoverScriptLoading ? 'Generating...' : 'Generate Script with AI'}
                          </button>
                        </>
                      )}
                      {aiVoiceoverScript && !voiceoverTrack && (
                        <div className="voiceover-script-card">
                          <div className="voiceover-script-header">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                            </svg>
                            <span>AI Voiceover Script</span>
                            <button
                              className="voiceover-script-copy"
                              onClick={() => navigator.clipboard.writeText(aiVoiceoverScript)}
                              title="Copy to clipboard"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                          <p className="voiceover-script-text">{aiVoiceoverScript}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {sidebarTab === 'background' && (
                  <div className="controls-panel">
                    <div className="control-group">
                      <h3 className="section-title">WhatsApp Themes</h3>
                      <div className="theme-grid">
                        {WA_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            className={`theme-card ${activeThemeId === theme.id ? 'active' : ''}`}
                            onClick={() => {
                              markChanged()
                              setActiveThemeId(theme.id)
                              setBgColor(theme.bgColor)
                              setBgGradient(theme.bgGradient)
                              setShowBase(false)
                              setTextOverlays((prev) =>
                                prev.map((t) => ({ ...t, color: theme.secondaryTextColor || theme.textColor }))
                              )
                            }}
                          >
                            <div className="theme-swatch" style={{ background: theme.swatch }} />
                            <span className="theme-name">{theme.name}</span>
                          </button>
                        ))}
                      </div>
                      {activeThemeId && (
                        <>
                          <h3 className="section-title" style={{ marginTop: 4 }}>Outro Logo</h3>
                          <p className="anim-hint">Appears at the end of the video</p>
                          <div className="logo-picker-row">
                            <button
                              className={`logo-pick-btn ${outroLogo === 'whatsapp' ? 'active' : ''}`}
                              onClick={() => { markChanged(); setOutroLogo(prev => prev === 'whatsapp' ? null : 'whatsapp') }}
                            >
                              <img src="/logos/whatsapp.svg" alt="WhatsApp" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              className={`logo-pick-btn ${outroLogo === 'whatsapp-business' ? 'active' : ''}`}
                              onClick={() => { markChanged(); setOutroLogo(prev => prev === 'whatsapp-business' ? null : 'whatsapp-business') }}
                            >
                              <img src="/logos/whatsapp-business.svg" alt="WA Business" />
                              <span>Business</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="control-group">
                      <h3 className="section-title">Gradients</h3>
                      <div className="gradient-grid">
                        <button
                          className={`gradient-swatch ${!bgGradient && !activeThemeId ? 'active' : ''}`}
                          onClick={() => { markChanged(); setBgGradient(false); setActiveThemeId(null) }}
                          title="Solid color"
                        >
                          <div className="gradient-swatch-inner" style={{ background: bgGradient ? '#161717' : bgColor }} />
                          <span className="gradient-swatch-label">None</span>
                        </button>
                        {GRADIENT_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            className={`gradient-swatch ${bgGradient === preset.id ? 'active' : ''}`}
                            onClick={() => {
                              markChanged()
                              setBgGradient(preset.id)
                              setBgColor(preset.bg)
                              setActiveThemeId(null)
                            }}
                            title={preset.name}
                          >
                            <div className="gradient-swatch-inner" style={{ background: gradientPresetCss(preset) }} />
                            <span className="gradient-swatch-label">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="control-group">
                      <h3 className="section-title">Custom</h3>
                      <div className="control-row">
                        <label className="control-label">Color</label>
                        <div className="color-picker-wrap">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => { markChanged(); setBgColor(e.target.value); setBgGradient(false); setActiveThemeId(null) }}
                            className="color-input"
                          />
                          <input
                            type="text"
                            className="color-value color-value-edit"
                            value={bgColor}
                            onChange={(e) => {
                              let v = e.target.value
                              if (!v.startsWith('#')) v = '#' + v
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) { markChanged(); setBgColor(v); setBgGradient(false); setActiveThemeId(null) }
                            }}
                            onBlur={(e) => {
                              let v = e.target.value
                              if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v)
                            }}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                      <div className="control-row">
                        <label className="control-label">Base shadow</label>
                        <button
                          className={`toggle ${showBase ? 'active' : ''}`}
                          onClick={() => setShowBase(!showBase)}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                      <div className="control-row">
                        <label className="control-label">Device shadow</label>
                        <button
                          className={`toggle ${showDeviceShadow ? 'active' : ''}`}
                          onClick={() => { markChanged(); setShowDeviceShadow(!showDeviceShadow) }}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
            <section className="preview-area">
              <PreviewScene
                screens={screens}
                activeScreen={activeScreen}
                zoomLevel={activeZoomLevel}
                videoSeekTime={videoSeekTime}
                timelinePlaying={isTimelinePlaying}
                deviceType={deviceType}
                animation={activeAnimation}
                outroAnimation={activeOutroAnimation}
                clipDuration={activeClipDuration}
                bgColor={bgColor}
                bgGradient={typeof bgGradient === 'string' ? (GRADIENT_PRESETS.find(g => g.id === bgGradient) || false) : bgGradient}
                showBase={showBase}
                showDeviceShadow={showDeviceShadow}
                isPlaying={isPlaying}
                canvasRef={canvasRef}
                textOverlays={textOverlays}
                currentTime={currentTime}
                clipAnimationTime={clipAnimationTime}
                activeClipId={activeClipId}
                activeTextAnim={activeTextAnim}
                aspectRatio={aspectRatio}
                textSplit={textSplit}
                onTextSplitChange={setTextSplit}
                layoutFlipped={layoutFlipped}
                onFlipLayout={() => { markChanged(); setLayoutFlipped(f => !f) }}
                slotScreens={slotScreens}
                outroLogo={activeThemeId ? outroLogo : null}
                totalDuration={totalDuration}
                multiDeviceCount={multiDeviceCount}
                onTextClick={(id) => { setSidebarTab('text'); setSelectedTextId(id) }}
                onTextDrag={(id, pos) => handleUpdateText(id, pos)}
                onDeviceClick={() => setSidebarTab('animations')}
                onDrop={handleUpload}
              />
              {hasStarted && (
                <Timeline
                  clips={timelineClips}
                  screens={screens}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  selectedClipId={selectedClipId}
                  setSelectedClipId={setSelectedClipId}
                  isPlaying={isTimelinePlaying}
                  setIsPlaying={setIsTimelinePlaying}
                  totalDuration={totalDuration}
                  onUpdateClip={handleUpdateClip}
                  onReorderClips={handleReorderClips}
                  onSplitClip={handleSplitClip}
                  onRemoveClip={handleRemoveClip}
                  zoomEffects={zoomEffects}
                  onAddZoomEffect={handleAddZoomEffect}
                  onUpdateZoomEffect={handleUpdateZoomEffect}
                  onRemoveZoomEffect={handleRemoveZoomEffect}
                  onSplitZoom={handleSplitZoom}
                  onUpload={handleTimelineDrop}
                  textOverlays={textOverlays}
                  onAddText={handleAddText}
                  onUpdateText={handleUpdateText}
                  onRemoveText={handleRemoveText}
                  onSplitText={handleSplitText}
                  selectedTextId={selectedTextId}
                  setSelectedTextId={setSelectedTextId}
                  setSidebarTab={setSidebarTab}
                  musicTrack={musicTrack}
                  voiceoverTrack={voiceoverTrack}
                  onUpdateMusic={handleUpdateMusic}
                  onUpdateVoiceover={handleUpdateVoiceover}
                  onRemoveMusic={handleRemoveMusic}
                  onRemoveVoiceover={handleRemoveVoiceover}
                  selectedAudioTrack={selectedAudioTrack}
                  setSelectedAudioTrack={setSelectedAudioTrack}
                />
              )}
            </section>
          </>
        )}
      </main>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          onRecord={startRecording}
          quality={quality}
          setQuality={setQuality}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
        />
      )}

      {showBackConfirm && (
        <div className="modal-overlay" onClick={() => setShowBackConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Go back?</h2>
              <button className="modal-close" onClick={() => setShowBackConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-info modal-info-warn">
                <p>All your current changes will be lost, including uploaded screens, timeline edits, and applied settings. This cannot be undone.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBackConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmBackFromModal}>
                Yes, go back
              </button>
            </div>
          </div>
        </div>
      )}

      {shareToast && (
        <div className="share-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {shareToast}
        </div>
      )}
    </div>
  )
}

export default App
