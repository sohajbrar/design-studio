import { useRef, useEffect, useMemo, useCallback, Suspense, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DeviceFrame from './DeviceFrame'
import './PreviewScene.css'

// ── Easing functions ──────────────────────────────────────────
function easeOutCubic(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3) }
function easeOutQuart(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4) }
function easeInOutCubic(t) { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function easeOutBack(t) { t = Math.min(1, Math.max(0, t)); const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
function easeInCubic(t) { t = Math.min(1, Math.max(0, t)); return t * t * t }
function smoothSin(t, freq, amp) { return Math.sin(t * freq) * amp }

// ── Rounded-rect contact shadow for flat-grid devices ────────
const FLAT_SHADOW_TEX = (() => {
  const w = 128, h = 256
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const blur = 14
  const r = 18
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.beginPath()
  ctx.roundRect(blur, blur, w - blur * 2, h - blur * 2, r)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
})()

// ── Derive tinted light colors from background ───────────────
function useTintedLights(bgColor) {
  return useMemo(() => {
    const base = new THREE.Color(bgColor)
    const hsl = {}
    base.getHSL(hsl)

    const isVeryDark = hsl.l < 0.15
    const isNeutral = hsl.s < 0.08

    let tintHue = hsl.h
    let tintSat = hsl.s
    if (isNeutral) {
      tintSat = 0.05
    }

    const fill = new THREE.Color().setHSL(tintHue, Math.min(tintSat * 0.7, 0.6), isVeryDark ? 0.55 : 0.5)
    const rim1 = new THREE.Color().setHSL(tintHue, Math.min(tintSat * 0.8, 0.65), isVeryDark ? 0.5 : 0.45)
    const rim2 = new THREE.Color().setHSL((tintHue + 0.03) % 1, Math.min(tintSat * 0.6, 0.5), isVeryDark ? 0.45 : 0.4)
    const accent = new THREE.Color().setHSL(tintHue, Math.min(tintSat * 0.9, 0.7), isVeryDark ? 0.5 : 0.45)

    return {
      fill: '#' + fill.getHexString(),
      rim1: '#' + rim1.getHexString(),
      rim2: '#' + rim2.getHexString(),
      accent: '#' + accent.getHexString(),
    }
  }, [bgColor])
}

// ── Scene background ──────────────────────────────────────────
function SceneBackground({ bgColor, bgGradient }) {
  const { scene } = useThree()
  const meshRef = useRef()
  const [gradientTex, setGradientTex] = useState(null)

  useEffect(() => {
    if (bgGradient && typeof bgGradient === 'object' && bgGradient.blobs) {
      const W = 1024, H = 1024
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = bgGradient.bg || bgColor
      ctx.fillRect(0, 0, W, H)

      for (const blob of bgGradient.blobs) {
        const x = blob.cx * W, y = (1 - blob.cy) * H, rad = blob.r * W
        const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
        const [r, g, b] = blob.c
        grad.addColorStop(0, `rgba(${r},${g},${b},${blob.a})`)
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${blob.a * 0.6})`)
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${blob.a * 0.2})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)
      }
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      scene.background = null
      setGradientTex(tex)
    } else if (bgGradient === true) {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, 512, 512)
      const glowColor = new THREE.Color(bgColor)
      const hsl = {}
      glowColor.getHSL(hsl)
      const glowLight = new THREE.Color().setHSL(hsl.h, Math.min(hsl.s + 0.2, 1), Math.min(hsl.l + 0.35, 0.75))
      const r = Math.round(glowLight.r * 255)
      const g = Math.round(glowLight.g * 255)
      const b = Math.round(glowLight.b * 255)
      const glow = ctx.createRadialGradient(256, 256, 0, 256, 256, 358)
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.1)`)
      glow.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0)`)
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, 512, 512)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      scene.background = null
      setGradientTex(tex)
    } else {
      scene.background = new THREE.Color(bgColor)
      setGradientTex(null)
    }
  }, [bgColor, bgGradient, scene])

  if (!gradientTex) return null

  return (
    <mesh ref={meshRef} position={[0, 0, -50]} renderOrder={-1000}>
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial map={gradientTex} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

// ── Camera animator (for presets that move the camera) ─────────
function CameraAnimator({ animation, isPlaying, multiDeviceCount, clipDuration, clipAnimationTime }) {
  const { camera } = useThree()
  const timeRef = useRef(0)
  const defaultPos = useRef(new THREE.Vector3(0, 0, 2.5))

  useEffect(() => {
    timeRef.current = 0
    camera.position.copy(defaultPos.current)
    camera.lookAt(0, 0, 0)
  }, [animation, camera])

  useFrame((_, delta) => {
    if (!isPlaying) return
    timeRef.current += delta

    switch (animation) {
      case 'sideScroll10': {
        const t = clipAnimationTime != null ? clipAnimationTime : timeRef.current
        const count = multiDeviceCount || 10
        const spacing = 0.8
        const halfSpan = ((count - 1) * spacing) / 2
        const dur = clipDuration || 8
        const progress = easeInOutCubic(Math.min(1, Math.max(0, t) / dur))
        const camX = -halfSpan + progress * halfSpan * 2
        camera.position.set(camX, 0.05, 2.5)
        camera.lookAt(camX + 0.3, 0, 0)
        break
      }
      case 'scroll': {
        const st = timeRef.current
        const camZ = 2.5 + smoothSin(st, 0.2, 0.25)
        const camY = smoothSin(st, 0.15, 0.2)
        const camX = smoothSin(st, 0.12, 0.1)
        camera.position.set(camX, camY, camZ)
        camera.lookAt(0, smoothSin(st, 0.15, 0.08), 0)
        break
      }
      case 'single': {
        const st = timeRef.current
        const introT = Math.min(1, st / 2.5)
        const eased = easeOutCubic(introT)
        const targetZ = 2.5 - eased * 0.4
        const orbitAngle = st * 0.25
        const radius = targetZ
        camera.position.set(
          Math.sin(orbitAngle) * radius * 0.1,
          smoothSin(st, 0.2, 0.1),
          radius + smoothSin(st, 0.15, 0.1)
        )
        camera.lookAt(0, smoothSin(st, 0.12, 0.05), 0)
        break
      }
      default: {
        camera.position.lerp(defaultPos.current, 0.05)
        camera.lookAt(0, 0, 0)
      }
    }
  })

  return null
}

// ── Calculate visible width/height at a given z-depth ────────
function useVisibleWidth(zDepth) {
  const { camera, viewport } = useThree()
  return useMemo(() => {
    const dist = camera.position.z - zDepth
    const vFov = (camera.fov * Math.PI) / 180
    const visH = 2 * Math.tan(vFov / 2) * dist
    return visH * viewport.aspect
  }, [camera.fov, camera.position.z, zDepth, viewport.aspect])
}

function useVisibleHeight(zDepth) {
  const { camera } = useThree()
  return useMemo(() => {
    const dist = camera.position.z - zDepth
    const vFov = (camera.fov * Math.PI) / 180
    return 2 * Math.tan(vFov / 2) * dist
  }, [camera.fov, camera.position.z, zDepth])
}

// ── Main animated devices ─────────────────────────────────────
function AnimatedDevices({ screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, isPlaying, currentTime, clipAnimationTime, activeClipId, activeTextAnim, textSplit, textOnLeft, isVerticalLayout, textOnTop, showDeviceShadow, onDeviceClick, resetKey, onManualAdjust, interactionMode }) {
  const groupRef = useRef()
  const iphoneRef = useRef()
  const androidRef = useRef()
  const ipadRef = useRef()
  const macbookRef = useRef()
  const mediaRef = useRef()
  const currentZoomRef = useRef(1)
  const lidAngleRef = useRef(Math.PI / 2)
  const textOffsetRef = useRef({ x: 0, y: 0 })
  const prevTextAnim = useRef('none')
  const ctRef = useRef(clipAnimationTime || 0)
  ctRef.current = clipAnimationTime || 0
  const visibleWidth = useVisibleWidth(0)
  const visibleHeight = useVisibleHeight(0)

  const userRotRef = useRef({ x: 0, y: 0 })
  const userPosRef = useRef({ x: 0, y: 0 })
  const heroRiseActive = useRef(false)
  const dragRef = useRef({ active: false, mode: null, startX: 0, startY: 0, moved: false })

  // Per-clip position/rotation storage
  const clipAdjMap = useRef({})
  const prevClipIdRef = useRef(activeClipId)
  const activeClipIdRef = useRef(activeClipId)
  activeClipIdRef.current = activeClipId

  // Transition blending between clips
  const transFromRef = useRef(null)
  const transTRef = useRef(1)
  const TRANS_DUR = 0.7

  useEffect(() => {
    userRotRef.current = { x: 0, y: 0 }
    userPosRef.current = { x: 0, y: 0 }
    if (activeClipId) clipAdjMap.current[activeClipId] = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
  }, [resetKey])

  const isSingleDevice = deviceType !== 'both'

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    const mode = interactionMode === 'move' ? 'translate' : 'rotate'
    dragRef.current = {
      active: true, mode, moved: false,
      startX: e.clientX, startY: e.clientY,
      origRotX: userRotRef.current.x, origRotY: userRotRef.current.y,
      origPosX: userPosRef.current.x, origPosY: userPosRef.current.y,
    }

    const onMove = (ev) => {
      const dr = dragRef.current
      if (!dr.active) return
      const dx = ev.clientX - dr.startX
      const dy = ev.clientY - dr.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.moved = true

      if (dr.mode === 'rotate') {
        userRotRef.current.y = dr.origRotY + dx * 0.005
        userRotRef.current.x = dr.origRotX + dy * 0.005
      } else {
        userPosRef.current.x = dr.origPosX + dx * 0.004
        userPosRef.current.y = dr.origPosY - dy * 0.004
      }
    }
    const onUp = () => {
      const dr = dragRef.current
      dr.active = false
      if (!dr.moved && onDeviceClick) onDeviceClick()
      const hasAdj = Math.abs(userRotRef.current.x) > 0.001 || Math.abs(userRotRef.current.y) > 0.001 ||
                     Math.abs(userPosRef.current.x) > 0.001 || Math.abs(userPosRef.current.y) > 0.001
      if (onManualAdjust) onManualAdjust(hasAdj)
      const cid = activeClipIdRef.current
      if (cid) {
        clipAdjMap.current[cid] = {
          pos: { ...userPosRef.current },
          rot: { ...userRotRef.current },
        }
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [onDeviceClick, onManualAdjust, interactionMode])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    userRotRef.current = { x: 0, y: 0 }
    userPosRef.current = { x: 0, y: 0 }
    const cid = activeClipIdRef.current
    if (cid) {
      clipAdjMap.current[cid] = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
    }
    if (onManualAdjust) onManualAdjust(false)
  }, [onManualAdjust])

  const firstScreen = activeScreen || screens[0] || null
  const secondScreen = screens[1] || screens[0] || null

  const showIphone = deviceType === 'iphone' || deviceType === 'both'
  const showAndroid = deviceType === 'android' || deviceType === 'both'
  const showIpad = deviceType === 'ipad'
  const showMacbook = deviceType === 'macbook'
  const showMedia = deviceType === 'media'
  const isBoth = deviceType === 'both'

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Synchronous per-clip adjustment swap (runs in animation loop, no timing gap)
    const curClipId = activeClipIdRef.current
    if (curClipId !== prevClipIdRef.current) {
      if (prevClipIdRef.current) {
        clipAdjMap.current[prevClipIdRef.current] = {
          pos: { ...userPosRef.current },
          rot: { ...userRotRef.current },
        }
      }
      const incoming = clipAdjMap.current[curClipId]
      if (incoming) {
        userPosRef.current = { ...incoming.pos }
        userRotRef.current = { ...incoming.rot }
      } else {
        userPosRef.current = { x: 0, y: 0 }
        userRotRef.current = { x: 0, y: 0 }
      }
      if (groupRef.current) {
        const g = groupRef.current
        transFromRef.current = {
          px: g.position.x, py: g.position.y, pz: g.position.z,
          rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z,
          sx: g.scale.x, sy: g.scale.y, sz: g.scale.z,
        }
        transTRef.current = 0
      }
      prevClipIdRef.current = curClipId
    }

    const t = ctRef.current
    const group = groupRef.current
    const iph = iphoneRef.current
    const and = androidRef.current

    // Reset all transforms
    group.rotation.set(0, 0, 0)
    group.position.set(0, 0, 0)
    group.scale.set(1, 1, 1)

    const iphBaseX = isBoth ? -0.8 : 0
    const andBaseX = isBoth ? 0.8 : 0
    if (iph) { iph.rotation.set(0, 0, 0); iph.position.set(iphBaseX, 0, 0); iph.scale.set(1, 1, 1) }
    if (and) { and.rotation.set(0, 0, 0); and.position.set(andBaseX, 0, 0); and.scale.set(1, 1, 1) }

    heroRiseActive.current = false

    switch (animation) {
      // ── SHOWCASE: Sweeping arc with floating ──────────────
      case 'showcase': {
        group.rotation.y = smoothSin(t, 0.25, 0.35)
        group.rotation.x = smoothSin(t, 0.18, 0.05)
        group.position.y = smoothSin(t, 0.35, 0.1)

        if (iph) {
          iph.rotation.y = (isBoth ? 0.2 : 0) + smoothSin(t, 0.3, 0.04)
          iph.position.y = smoothSin(t + 0.5, 0.4, 0.03)
        }
        if (and) {
          and.rotation.y = (isBoth ? -0.2 : 0) + smoothSin(t + 1, 0.28, 0.04)
          and.position.y = smoothSin(t + 1.0, 0.4, 0.03)
        }
        break
      }

      // ── ORBIT: Smooth continuous 360° rotation ────────────
      case 'orbit': {
        group.rotation.y = t * 0.4
        group.position.y = smoothSin(t, 0.5, 0.06)
        group.rotation.x = smoothSin(t, 0.3, 0.03)

        if (iph) iph.rotation.y = isBoth ? 0.2 : 0
        if (and) and.rotation.y = isBoth ? -0.2 : 0
        break
      }

      // ── FLIP REVEAL: Dramatic 3D entry then settle ────────
      case 'flip': {
        const introTime = 2.2
        const stagger = 0.4

        if (t < introTime + stagger) {
          const groupProgress = easeOutBack(t / introTime)
          group.rotation.y = (1 - groupProgress) * Math.PI * 1.2
          group.position.y = (1 - easeOutCubic(t / introTime)) * 1.2
          group.rotation.x = (1 - easeOutCubic(t / introTime)) * 0.3

          if (iph && isBoth) {
            const iphP = easeOutBack(Math.max(0, t - 0.0) / introTime)
            iph.position.x = iphBaseX - (1 - iphP) * 2
            iph.rotation.y = 0.2 + (1 - iphP) * 0.4
          }
          if (and && isBoth) {
            const andP = easeOutBack(Math.max(0, t - stagger) / introTime)
            and.position.x = andBaseX + (1 - andP) * 2
            and.rotation.y = -0.2 - (1 - andP) * 0.4
          }
        } else {
          const postT = t - introTime - stagger
          group.rotation.y = smoothSin(postT, 0.22, 0.3)
          group.rotation.x = smoothSin(postT, 0.15, 0.04)
          group.position.y = smoothSin(postT, 0.3, 0.08)

          if (iph) {
            iph.position.x = iphBaseX
            iph.rotation.y = (isBoth ? 0.2 : 0) + smoothSin(postT, 0.25, 0.03)
          }
          if (and) {
            and.position.x = andBaseX
            and.rotation.y = (isBoth ? -0.2 : 0) + smoothSin(postT + 0.5, 0.25, 0.03)
          }
        }
        break
      }

      // ── SCROLL: Vertical panning with parallax ────────────
      case 'scroll': {
        group.rotation.y = smoothSin(t, 0.18, 0.2)
        group.rotation.x = smoothSin(t, 0.12, 0.06)
        group.position.y = smoothSin(t, 0.2, 0.15)

        if (iph) {
          iph.rotation.y = (isBoth ? 0.15 : 0) + smoothSin(t, 0.2, 0.03)
          iph.position.y = smoothSin(t + 0.3, 0.25, 0.04)
        }
        if (and) {
          and.rotation.y = (isBoth ? -0.15 : 0) + smoothSin(t + 0.5, 0.2, 0.03)
          and.position.y = smoothSin(t + 0.8, 0.25, 0.04)
        }
        break
      }

      // ── SIDE BY SIDE: Spread apart with coordinated dance ─
      case 'sideBySide': {
        const introT = Math.min(1, t / 1.8)
        const eased = easeOutQuart(introT)

        group.rotation.y = smoothSin(t, 0.2, 0.2)
        group.rotation.x = smoothSin(t, 0.14, 0.04)
        group.position.y = smoothSin(t, 0.3, 0.06)

        if (iph && isBoth) {
          const spreadX = -1.2 - smoothSin(t, 0.15, 0.1)
          iph.position.x = iphBaseX + (spreadX - iphBaseX) * eased
          iph.rotation.y = 0.3 * eased + smoothSin(t, 0.25, 0.05)
          iph.rotation.z = smoothSin(t + 0.3, 0.2, 0.02)
          iph.position.y = smoothSin(t, 0.35, 0.04)
        }
        if (and && isBoth) {
          const spreadX = 1.2 + smoothSin(t, 0.15, 0.1)
          and.position.x = andBaseX + (spreadX - andBaseX) * eased
          and.rotation.y = -0.3 * eased + smoothSin(t + 1, 0.25, 0.05)
          and.rotation.z = smoothSin(t + 0.8, 0.2, -0.02)
          and.position.y = smoothSin(t + 0.5, 0.35, 0.04)
        }
        break
      }

      // ── SINGLE FOCUS: Cinematic close-up with slow arc ────
      case 'single': {
        group.rotation.y = smoothSin(t, 0.15, 0.4)
        group.rotation.x = smoothSin(t, 0.1, 0.06)
        group.position.y = smoothSin(t, 0.2, 0.1)

        const s = 1.0 + smoothSin(t, 0.2, 0.03)
        group.scale.set(s, s, s)

        if (iph) {
          iph.rotation.y = (isBoth ? 0.15 : 0) + smoothSin(t, 0.18, 0.03)
        }
        if (and) {
          and.rotation.y = (isBoth ? -0.15 : 0) + smoothSin(t + 0.5, 0.18, 0.03)
        }
        break
      }

      // ── SLIDE FROM LEFT ─────────────────────────────
      case 'slideLeft': {
        const introT = Math.min(1, t / 1.4)
        const eased = easeOutCubic(introT)
        group.position.x = (-4) * (1 - eased)
        group.position.y = smoothSin(t, 0.3, 0.06)
        group.rotation.y = smoothSin(t, 0.2, 0.08)
        break
      }

      // ── SLIDE FROM RIGHT ────────────────────────────
      case 'slideRight': {
        const introT = Math.min(1, t / 1.4)
        const eased = easeOutCubic(introT)
        group.position.x = 4 * (1 - eased)
        group.position.y = smoothSin(t, 0.3, 0.06)
        group.rotation.y = smoothSin(t, 0.2, 0.08)
        break
      }

      // ── SLIDE DOWN (enters from top) ────────────────
      case 'slideDown': {
        const introT = Math.min(1, t / 1.4)
        const eased = easeOutCubic(introT)
        group.position.y = 4 * (1 - eased) + smoothSin(t, 0.3, 0.06)
        group.rotation.x = smoothSin(t, 0.2, 0.04)
        break
      }

      // ── SLIDE UP (enters from bottom) ───────────────
      case 'slideUp': {
        const introT = Math.min(1, t / 1.4)
        const eased = easeOutCubic(introT)
        group.position.y = (-4) * (1 - eased) + smoothSin(t, 0.3, 0.06)
        group.rotation.x = smoothSin(t, 0.2, 0.04)
        break
      }

      // ── SLIDE RIGHT + ROTATE ────────────────────────
      case 'slideRightRotate': {
        const introT = Math.min(1, t / 2.0)
        const eased = easeOutCubic(introT)
        group.position.x = 4 * (1 - eased)
        group.rotation.y = (Math.PI * 0.5) * (1 - eased) + smoothSin(t, 0.2, 0.08)
        group.position.y = smoothSin(t, 0.3, 0.06)
        break
      }

      // ── SLIDE LEFT + ROTATE ─────────────────────────
      case 'slideLeftRotate': {
        const introT = Math.min(1, t / 2.0)
        const eased = easeOutCubic(introT)
        group.position.x = (-4) * (1 - eased)
        group.rotation.y = (-Math.PI * 0.5) * (1 - eased) + smoothSin(t, 0.2, 0.08)
        group.position.y = smoothSin(t, 0.3, 0.06)
        break
      }

      // ── ZOOM BOTTOM LEFT: Skew & zoom, centered ─
      case 'zoomBottomLeft': {
        const introT = Math.min(1, t / 2.2)
        const eased = easeOutCubic(introT)
        const targetScale = 1.5
        const s = 1 + (targetScale - 1) * eased
        group.scale.set(s, s, s)
        group.rotation.x = -0.25 * eased + smoothSin(t, 0.15, 0.02)
        group.rotation.y = 0.35 * eased + smoothSin(t, 0.12, 0.03)
        group.rotation.z = -0.12 * eased
        group.position.y = smoothSin(t, 0.22, 0.03)
        group.position.z = 0.3 * eased
        break
      }

      // ── ZOOM TOP RIGHT: Skew & zoom, centered ─
      case 'zoomTopRight': {
        const introT = Math.min(1, t / 2.2)
        const eased = easeOutCubic(introT)
        const targetScale = 1.5
        const s = 1 + (targetScale - 1) * eased
        group.scale.set(s, s, s)
        group.rotation.x = 0.25 * eased + smoothSin(t, 0.15, 0.02)
        group.rotation.y = -0.35 * eased + smoothSin(t, 0.12, 0.03)
        group.rotation.z = 0.12 * eased
        group.position.y = smoothSin(t, 0.22, 0.03)
        group.position.z = 0.3 * eased
        break
      }

      // ── LAPTOP OPEN: lid opens from closed (folded down) to upright ─
      // ── HERO RISE: hold initial pose, then rise to upright ─
      case 'heroRise': {
        const holdDur = 1.5
        const riseDur = 2.4
        const riseT = Math.max(0, t - holdDur)
        const introT = Math.min(1, riseT / riseDur)
        const eased = easeOutCubic(introT)

        const startRotX = -1.1 + userRotRef.current.x
        const startRotY = 0.15 + userRotRef.current.y
        const startRotZ = 0.08
        const startScale = 1.6
        const startPosX = userPosRef.current.x
        const startPosY = -0.15 + userPosRef.current.y
        const startZ = 0.5

        group.rotation.x = startRotX * (1 - eased) + smoothSin(t, 0.15, 0.02)
        group.rotation.y = startRotY * (1 - eased) + smoothSin(t, 0.2, 0.06)
        group.rotation.z = startRotZ * (1 - eased)
        const s = startScale - (startScale - 1) * eased
        group.scale.set(s, s, s)
        group.position.x = startPosX * (1 - eased)
        group.position.y = startPosY * (1 - eased) + smoothSin(t, 0.3, 0.06)
        group.position.z = startZ * (1 - eased)
        heroRiseActive.current = true
        break
      }

      case 'laptopOpen': {
        const introT = Math.min(1, t / 2.0)
        const eased = easeOutCubic(introT)
        lidAngleRef.current = Math.PI - eased * (Math.PI / 2)
        group.rotation.y = smoothSin(t, 0.2, 0.15)
        group.position.y = smoothSin(t, 0.3, 0.05)
        break
      }

      // ── LAPTOP CLOSE: lid closes from upright to folded down ─
      case 'laptopClose': {
        const introT = Math.min(1, t / 2.0)
        const eased = easeOutCubic(introT)
        lidAngleRef.current = (Math.PI / 2) + eased * (Math.PI / 2)
        group.rotation.y = smoothSin(t, 0.2, 0.15)
        group.position.y = smoothSin(t, 0.3, 0.05)
        break
      }

      default: {
        lidAngleRef.current = Math.PI / 2
        group.rotation.y = smoothSin(t, 0.3, 0.3)
        group.position.y = smoothSin(t, 0.4, 0.08)
      }
    }

    // Reset lid to open for non-laptop animations
    if (animation !== 'laptopOpen' && animation !== 'laptopClose') {
      lidAngleRef.current = Math.PI / 2
    }

    // ── Outro animation (applied additively on top of intro) ───
    const outroDur = 2.8
    if (outroAnimation && outroAnimation !== 'none' && clipDuration > outroDur + 0.5) {
      const outroStart = clipDuration - outroDur
      if (t > outroStart) {
        const p = easeInCubic((t - outroStart) / outroDur)

        switch (outroAnimation) {
          case 'slideLeft':
            group.position.x += -4 * p
            break
          case 'slideRight':
            group.position.x += 4 * p
            break
          case 'slideDown':
            group.position.y += -4 * p
            break
          case 'slideUp':
            group.position.y += 4 * p
            break
          case 'slideLeftRotate':
            group.position.x += -4 * p
            group.rotation.y += (-Math.PI * 0.5) * p
            break
          case 'slideRightRotate':
            group.position.x += 4 * p
            group.rotation.y += (Math.PI * 0.5) * p
            break
          case 'zoomOut': {
            const s = 1 - p * 0.85
            group.scale.x *= s
            group.scale.y *= s
            group.scale.z *= s
            break
          }
          case 'flip':
            group.rotation.y += Math.PI * 2 * p
            group.position.y += 3.5 * p
            group.rotation.x += 0.4 * p
            break
        }
      }
    }

    // Apply timeline zoom effect — scales the entire phone group smoothly
    const targetZoom = zoomLevel || 1
    currentZoomRef.current += (targetZoom - currentZoomRef.current) * 0.08
    const zs = currentZoomRef.current
    group.scale.set(
      group.scale.x * zs,
      group.scale.y * zs,
      group.scale.z * zs
    )

    // Shift device to make room for text
    let targetOffX = 0
    let targetOffY = 0
    if (activeTextAnim && activeTextAnim !== 'none') {
      const split = textSplit || 0.5
      const deviceFraction = 1 - split
      if (isVerticalLayout) {
        // Vertical: shift device up or down
        if (textOnTop) {
          targetOffY = -(visibleHeight / 2) + (visibleHeight * deviceFraction) / 2
        } else {
          targetOffY = (visibleHeight / 2) - (visibleHeight * deviceFraction) / 2
        }
      } else {
        // Horizontal: shift device left or right
        if (textOnLeft) {
          targetOffX = (visibleWidth / 2) - (visibleWidth * deviceFraction) / 2
        } else {
          targetOffX = -(visibleWidth / 2) + (visibleWidth * deviceFraction) / 2
        }
      }
    }

    prevTextAnim.current = activeTextAnim
    const lerpSpeed = 0.06
    textOffsetRef.current.x += (targetOffX - textOffsetRef.current.x) * lerpSpeed
    textOffsetRef.current.y += (targetOffY - textOffsetRef.current.y) * lerpSpeed
    group.position.x += textOffsetRef.current.x
    group.position.y += textOffsetRef.current.y

    if (!heroRiseActive.current) {
      group.rotation.x += userRotRef.current.x
      group.rotation.y += userRotRef.current.y
      group.position.x += userPosRef.current.x
      group.position.y += userPosRef.current.y
    }

    // Smooth transition blending between clips
    if (transFromRef.current && transTRef.current < TRANS_DUR) {
      const p = easeOutCubic(transTRef.current / TRANS_DUR)
      const f = transFromRef.current
      group.position.x = f.px + (group.position.x - f.px) * p
      group.position.y = f.py + (group.position.y - f.py) * p
      group.position.z = f.pz + (group.position.z - f.pz) * p
      group.rotation.x = f.rx + (group.rotation.x - f.rx) * p
      group.rotation.y = f.ry + (group.rotation.y - f.ry) * p
      group.rotation.z = f.rz + (group.rotation.z - f.rz) * p
      group.scale.x = f.sx + (group.scale.x - f.sx) * p
      group.scale.y = f.sy + (group.scale.y - f.sy) * p
      group.scale.z = f.sz + (group.scale.z - f.sz) * p
      transTRef.current += delta
    } else if (transFromRef.current) {
      transFromRef.current = null
    }
  })

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>
      {showIphone && (
        <group ref={iphoneRef} position={[isBoth ? -0.8 : 0, 0, 0]}>
          <DeviceFrame
            type="iphone"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            isGif={firstScreen?.isGif || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
            showShadow={showDeviceShadow}
          />
        </group>
      )}
      {showAndroid && (
        <group ref={androidRef} position={[isBoth ? 0.8 : 0, 0, 0]}>
          <DeviceFrame
            type="android"
            screenUrl={secondScreen?.url || null}
            screenFile={secondScreen?.file || null}
            isVideo={secondScreen?.isVideo || false}
            isGif={secondScreen?.isGif || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
            showShadow={showDeviceShadow}
          />
        </group>
      )}
      {showIpad && (
        <group ref={ipadRef} position={[0, 0, 0]}>
          <DeviceFrame
            type="ipad"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            isGif={firstScreen?.isGif || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
            showShadow={showDeviceShadow}
          />
        </group>
      )}
      {showMacbook && (
        <group ref={macbookRef} position={[0, -0.4, 0]}>
          <DeviceFrame
            type="macbook"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            isGif={firstScreen?.isGif || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.38}
            lidAngleRef={lidAngleRef}
            showShadow={showDeviceShadow}
          />
        </group>
      )}
      {showMedia && (
        <group ref={mediaRef} position={[0, 0, 0]}>
          <DeviceFrame
            type="media"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            isGif={firstScreen?.isGif || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
            showShadow={showDeviceShadow}
          />
        </group>
      )}
    </group>
  )
}

// ── Multi-device animations ──────────────────────────────────
const MULTI_DEVICE_ANIMS = new Set([
  'sideScroll10', 'angled3ZoomOut', 'circle4Rotate', 'angledZoom4',
  'carousel6', 'floatingPhoneLaptop', 'phoneInFrontLaptop', 'phoneOnKeyboard', 'offsetCircleRotate',
  'flatScatter7',
])

function MultiDeviceScene({ screens, activeScreen, animation, clipAnimationTime, activeClipId, videoSeekTime, timelinePlaying, outroAnimation, clipDuration, slotScreens, multiDeviceCount, showDeviceShadow, onDeviceClick, resetKey, onManualAdjust, interactionMode, deviceType = 'iphone' }) {
  const groupRef = useRef()
  const devRefs = useRef({})
  const userRotRef = useRef({ x: 0, y: 0 })
  const userPosRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false })

  const hasLaptopSlot = slotScreens && slotScreens.length === 2
  const isPhoneLaptop = animation === 'floatingPhoneLaptop' || animation === 'phoneInFrontLaptop' || animation === 'phoneOnKeyboard' || hasLaptopSlot

  // Per-device adjustments for phone+laptop templates
  const deviceAdjRef = useRef({
    phone: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
    laptop: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
  })
  const deviceDragRef = useRef({ active: false, device: null, startX: 0, startY: 0, moved: false })

  // Per-clip position/rotation storage
  const clipAdjMap = useRef({})
  const clipDeviceAdjMap = useRef({})
  const prevClipIdRef = useRef(activeClipId)
  const activeClipIdRef = useRef(activeClipId)
  activeClipIdRef.current = activeClipId

  // Transition blending
  const transFromRef = useRef(null)
  const transTRef = useRef(1)
  const TRANS_DUR = 0.7

  useEffect(() => {
    userRotRef.current = { x: 0, y: 0 }
    userPosRef.current = { x: 0, y: 0 }
    deviceAdjRef.current = {
      phone: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
      laptop: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
    }
    if (activeClipId) {
      clipAdjMap.current[activeClipId] = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
      clipDeviceAdjMap.current[activeClipId] = {
        phone: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
        laptop: { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } },
      }
    }
  }, [resetKey])

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    const mode = interactionMode === 'move' ? 'translate' : 'rotate'
    dragRef.current = {
      active: true, mode, moved: false,
      startX: e.clientX, startY: e.clientY,
      origRotX: userRotRef.current.x, origRotY: userRotRef.current.y,
      origPosX: userPosRef.current.x, origPosY: userPosRef.current.y,
    }
    const onMove = (ev) => {
      const dr = dragRef.current
      if (!dr.active) return
      const dx = ev.clientX - dr.startX
      const dy = ev.clientY - dr.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.moved = true
      if (dr.mode === 'rotate') {
        userRotRef.current.y = dr.origRotY + dx * 0.005
        userRotRef.current.x = dr.origRotX + dy * 0.005
      } else {
        userPosRef.current.x = dr.origPosX + dx * 0.004
        userPosRef.current.y = dr.origPosY - dy * 0.004
      }
    }
    const onUp = () => {
      const dr = dragRef.current
      dr.active = false
      if (!dr.moved && onDeviceClick) onDeviceClick()
      const hasAdj = Math.abs(userRotRef.current.x) > 0.001 || Math.abs(userRotRef.current.y) > 0.001 ||
                     Math.abs(userPosRef.current.x) > 0.001 || Math.abs(userPosRef.current.y) > 0.001
      if (onManualAdjust) onManualAdjust(hasAdj)
      const cid = activeClipIdRef.current
      if (cid) {
        clipAdjMap.current[cid] = {
          pos: { ...userPosRef.current },
          rot: { ...userRotRef.current },
        }
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [onDeviceClick, onManualAdjust, interactionMode])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    userRotRef.current = { x: 0, y: 0 }
    userPosRef.current = { x: 0, y: 0 }
    const cid = activeClipIdRef.current
    if (cid) {
      clipAdjMap.current[cid] = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
    }
    if (onManualAdjust) onManualAdjust(false)
  }, [onManualAdjust])

  const makeDevicePointerDown = useCallback((deviceKey) => (e) => {
    e.stopPropagation()
    const adj = deviceAdjRef.current[deviceKey]
    const mode = interactionMode === 'move' ? 'translate' : 'rotate'
    deviceDragRef.current = {
      active: true, device: deviceKey, mode, moved: false,
      startX: e.clientX, startY: e.clientY,
      origRotX: adj.rot.x, origRotY: adj.rot.y,
      origPosX: adj.pos.x, origPosY: adj.pos.y,
    }
    const onMove = (ev) => {
      const dr = deviceDragRef.current
      if (!dr.active) return
      const dx = ev.clientX - dr.startX
      const dy = ev.clientY - dr.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.moved = true
      const a = deviceAdjRef.current[dr.device]
      if (dr.mode === 'rotate') {
        a.rot.y = dr.origRotY + dx * 0.005
        a.rot.x = dr.origRotX + dy * 0.005
      } else {
        a.pos.x = dr.origPosX + dx * 0.004
        a.pos.y = dr.origPosY - dy * 0.004
      }
    }
    const onUp = () => {
      const dr = deviceDragRef.current
      dr.active = false
      if (!dr.moved && onDeviceClick) onDeviceClick()
      const pa = deviceAdjRef.current.phone
      const la = deviceAdjRef.current.laptop
      const hasAdj = Math.abs(pa.pos.x) > 0.001 || Math.abs(pa.pos.y) > 0.001 ||
                     Math.abs(pa.rot.x) > 0.001 || Math.abs(pa.rot.y) > 0.001 ||
                     Math.abs(la.pos.x) > 0.001 || Math.abs(la.pos.y) > 0.001 ||
                     Math.abs(la.rot.x) > 0.001 || Math.abs(la.rot.y) > 0.001
      if (onManualAdjust) onManualAdjust(hasAdj)
      const cid = activeClipIdRef.current
      if (cid) {
        clipDeviceAdjMap.current[cid] = {
          phone: { pos: { ...pa.pos }, rot: { ...pa.rot } },
          laptop: { pos: { ...la.pos }, rot: { ...la.rot } },
        }
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [onDeviceClick, onManualAdjust, interactionMode])

  const makeDeviceDoubleClick = useCallback((deviceKey) => (e) => {
    e.stopPropagation()
    deviceAdjRef.current[deviceKey] = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
    const cid = activeClipIdRef.current
    if (cid) {
      clipDeviceAdjMap.current[cid] = {
        phone: { pos: { ...deviceAdjRef.current.phone.pos }, rot: { ...deviceAdjRef.current.phone.rot } },
        laptop: { pos: { ...deviceAdjRef.current.laptop.pos }, rot: { ...deviceAdjRef.current.laptop.rot } },
      }
    }
    const pa = deviceAdjRef.current.phone
    const la = deviceAdjRef.current.laptop
    const hasAdj = Math.abs(pa.pos.x) > 0.001 || Math.abs(pa.pos.y) > 0.001 ||
                   Math.abs(pa.rot.x) > 0.001 || Math.abs(pa.rot.y) > 0.001 ||
                   Math.abs(la.pos.x) > 0.001 || Math.abs(la.pos.y) > 0.001 ||
                   Math.abs(la.rot.x) > 0.001 || Math.abs(la.rot.y) > 0.001
    if (onManualAdjust) onManualAdjust(hasAdj)
  }, [onManualAdjust])
  const ctRef = useRef(0)
  ctRef.current = clipAnimationTime || 0

  const s0 = activeScreen || screens[0] || null
  const s1 = screens[1] || screens[0] || null
  const setRef = (k) => (el) => { if (el) devRefs.current[k] = el }

  const getSlotScreen = (index) => {
    if (slotScreens) return slotScreens[index] || null
    return s0
  }

  const resolvedType = deviceType === 'both' ? 'iphone' : deviceType

  const phonePropsForSlot = (index) => {
    const scr = getSlotScreen(index)
    return {
      type: resolvedType,
      screenUrl: scr?.url || null,
      screenFile: scr?.file || null,
      isVideo: scr?.isVideo || false,
      isGif: scr?.isGif || false,
      videoSeekTime, timelinePlaying,
      scale: 0.3,
      showShadow: showDeviceShadow,
    }
  }

  const phoneProps = phonePropsForSlot(0)

  const lidAngleRef = useRef(Math.PI / 2)

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return

    // Synchronous per-clip adjustment swap
    const curClipId = activeClipIdRef.current
    if (curClipId !== prevClipIdRef.current) {
      if (prevClipIdRef.current) {
        clipAdjMap.current[prevClipIdRef.current] = {
          pos: { ...userPosRef.current },
          rot: { ...userRotRef.current },
        }
        if (isPhoneLaptop) {
          clipDeviceAdjMap.current[prevClipIdRef.current] = {
            phone: { pos: { ...deviceAdjRef.current.phone.pos }, rot: { ...deviceAdjRef.current.phone.rot } },
            laptop: { pos: { ...deviceAdjRef.current.laptop.pos }, rot: { ...deviceAdjRef.current.laptop.rot } },
          }
        }
      }
      const incoming = clipAdjMap.current[curClipId]
      if (incoming) {
        userPosRef.current = { ...incoming.pos }
        userRotRef.current = { ...incoming.rot }
      } else {
        userPosRef.current = { x: 0, y: 0 }
        userRotRef.current = { x: 0, y: 0 }
      }
      if (isPhoneLaptop) {
        const devIncoming = clipDeviceAdjMap.current[curClipId]
        if (devIncoming) {
          deviceAdjRef.current.phone = { pos: { ...devIncoming.phone.pos }, rot: { ...devIncoming.phone.rot } }
          deviceAdjRef.current.laptop = { pos: { ...devIncoming.laptop.pos }, rot: { ...devIncoming.laptop.rot } }
        } else {
          deviceAdjRef.current.phone = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
          deviceAdjRef.current.laptop = { pos: { x: 0, y: 0 }, rot: { x: 0, y: 0 } }
        }
      }
      transFromRef.current = {
        px: g.position.x, py: g.position.y, pz: g.position.z,
        rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z,
        sx: g.scale.x, sy: g.scale.y, sz: g.scale.z,
      }
      transTRef.current = 0
      prevClipIdRef.current = curClipId
    }

    const t = ctRef.current
    const d = devRefs.current

    g.position.set(0, 0, 0)
    g.rotation.set(0, 0, 0)
    g.scale.set(1, 1, 1)

    switch (animation) {

      // ── 1. Side Scroll (camera-driven, phones stay flat) ──
      case 'sideScroll10': {
        break
      }

      // ── 2. Angled 3 Zoom Out ───────────────────────
      case 'angled3ZoomOut': {
        const zoomT = easeOutCubic(Math.min(1, t / 2.5))
        const s = 1.6 - 0.6 * zoomT
        g.scale.set(s, s, s)
        g.rotation.y = smoothSin(t, 0.15, 0.08)
        g.position.y = smoothSin(t, 0.25, 0.05)
        if (d.p0) {
          d.p0.rotation.y = -0.35
          d.p0.position.y = smoothSin(t + 0.3, 0.3, 0.04)
        }
        if (d.p1) {
          d.p1.rotation.y = 0
          d.p1.position.y = smoothSin(t, 0.35, 0.03)
        }
        if (d.p2) {
          d.p2.rotation.y = 0.35
          d.p2.position.y = smoothSin(t + 0.6, 0.3, 0.04)
        }
        break
      }

      // ── 3. Circle Rotate (dynamic count) ─────────────────────────
      case 'circle4Rotate': {
        const count = multiDeviceCount || 4
        const stepDur = 1.4
        const transDur = 0.5
        const totalSteps = count
        const rawStep = t / stepDur
        const stepIdx = Math.floor(rawStep)
        const frac = rawStep - stepIdx
        const snapFrac = frac < (transDur / stepDur)
          ? easeOutCubic(frac / (transDur / stepDur))
          : 1
        const smoothStep = Math.min(stepIdx + snapFrac, totalSteps)
        const targetAngle = (smoothStep / totalSteps) * Math.PI * 2

        g.rotation.y = targetAngle
        g.rotation.x = 0.08

        const radius = Math.max(0.4, 0.13 * count)
        for (let i = 0; i < count; i++) {
          const ref = d[`p${i}`]
          if (ref) {
            const angle = (i / count) * Math.PI * 2
            ref.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
            ref.rotation.y = angle
          }
        }
        break
      }

      // ── 4. Angled Zoom (dynamic count) ──────────────
      case 'angledZoom4': {
        const count = multiDeviceCount || 4
        const introP = easeOutCubic(Math.min(1, t / 2.0))
        g.rotation.x = 0.35 * introP + smoothSin(t, 0.12, 0.02)
        g.rotation.y = -0.15 * introP + smoothSin(t, 0.1, 0.06)
        g.position.y = -0.2 * introP + smoothSin(t, 0.2, 0.04)
        const totalSpan = 3.2
        for (let i = 0; i < count; i++) {
          const ref = d[`p${i}`]
          if (!ref) continue
          const frac = count === 1 ? 0.5 : i / (count - 1)
          const x = -totalSpan / 2 + frac * totalSpan
          const z = -0.4 + 0.4 * Math.sin(frac * Math.PI)
          const y = 0.1 + 0.1 * Math.sin(frac * Math.PI)
          const ry = 0.15 - frac * 0.3
          const rz = 0.04 - frac * 0.08
          ref.position.set(x, y + smoothSin(t + i * 0.5, 0.3, 0.04), z)
          ref.rotation.set(0, ry, rz)
        }
        break
      }

      // ── 5. Carousel (dynamic count) ──────────────────
      case 'carousel6': {
        const count = multiDeviceCount || 6
        g.rotation.y = t * 0.2
        g.position.y = smoothSin(t, 0.25, 0.05)
        const r = Math.max(1.2, 0.3 * count)
        for (let i = 0; i < count; i++) {
          const ref = d[`p${i}`]
          if (!ref) continue
          const angle = (i / count) * Math.PI * 2
          const yOff = (i % 2 === 0 ? 0.2 : -0.2) + smoothSin(t + i * 0.8, 0.35, 0.06)
          ref.position.set(Math.sin(angle) * r, yOff, Math.cos(angle) * r)
          ref.rotation.y = angle
        }
        break
      }

      // ── 6. Floating Phone + Laptop ─────────────────
      case 'floatingPhoneLaptop': {
        g.rotation.x = 0.15 + smoothSin(t, 0.06, 0.01)
        g.rotation.y = smoothSin(t, 0.12, 0.08)
        g.position.y = 0.1 + smoothSin(t, 0.18, 0.03)
        if (d.laptop) {
          d.laptop.position.set(
            -0.1 + smoothSin(t + 0.5, 0.1, 0.04),
            -0.55 + smoothSin(t, 0.2, 0.05),
            -0.2
          )
          d.laptop.rotation.set(
            0.1 + smoothSin(t + 1, 0.08, 0.02),
            -0.15 + smoothSin(t, 0.1, 0.04),
            smoothSin(t + 0.3, 0.1, 0.015)
          )
        }
        if (d.phone) {
          d.phone.position.set(
            1.05 + smoothSin(t, 0.12, 0.05),
            -0.1 + smoothSin(t + 1, 0.18, 0.06),
            0.9
          )
          d.phone.rotation.set(
            -0.08 + smoothSin(t, 0.12, 0.025),
            -0.15 + smoothSin(t, 0.1, 0.03),
            0.04 + smoothSin(t + 0.5, 0.1, 0.015)
          )
        }
        break
      }

      // ── 7. Phone in Front of Laptop ────────────────
      case 'phoneInFrontLaptop': {
        const sweepDur = 5.0
        const sweepP = easeInOutCubic(Math.min(1, t / sweepDur))
        // Rotation: start from phone side (-100deg), sweep to front view (0)
        const startAngle = -Math.PI * 0.55
        const endAngle = 0
        g.rotation.y = startAngle + (endAngle - startAngle) * sweepP + smoothSin(t, 0.05, 0.012)
        // Slight tilt eases from steeper to gentle
        g.rotation.x = 0.22 - 0.07 * sweepP + smoothSin(t, 0.05, 0.008)
        g.position.y = 0.1 + smoothSin(t, 0.1, 0.018)
        // Zoom: start zoomed in on phone (1.5x), zoom out to normal (1.0x)
        const startScale = 1.5
        const endScale = 1.0
        const sc = startScale + (endScale - startScale) * sweepP
        g.scale.set(sc, sc, sc)
        // Devices in their final resting positions (matching Floating end state)
        if (d.laptop) {
          d.laptop.position.set(-0.1, -0.55, -0.2)
          d.laptop.rotation.set(
            0.1 + smoothSin(t, 0.05, 0.01),
            -0.15 + smoothSin(t, 0.04, 0.01),
            smoothSin(t + 0.3, 0.06, 0.01)
          )
        }
        if (d.phone) {
          d.phone.position.set(1.05, -0.1 + smoothSin(t + 0.5, 0.1, 0.02), 0.9)
          d.phone.rotation.set(
            -0.08 + smoothSin(t, 0.06, 0.01),
            -0.15 + smoothSin(t, 0.05, 0.012),
            0.04 + smoothSin(t + 1, 0.06, 0.008)
          )
        }
        break
      }

      // ── 7b. Phone on Keyboard — phone rests on laptop, camera pulls back ──
      case 'phoneOnKeyboard': {
        const panDur = 5.0
        const panP = easeInOutCubic(Math.min(1, t / panDur))
        // Camera starts zoomed in and tilted down on the phone/keyboard area,
        // then pulls back and tilts up to reveal the full laptop screen
        const startRotX = 0.7
        const endRotX = 0.18
        g.rotation.x = startRotX + (endRotX - startRotX) * panP + smoothSin(t, 0.04, 0.006)
        g.rotation.y = smoothSin(t, 0.05, 0.01)
        // Vertical pan: start low (looking at keyboard), rise to show screen
        const startY = -0.6
        const endY = 0.15
        g.position.y = startY + (endY - startY) * panP + smoothSin(t, 0.08, 0.015)
        // Zoom: start very close (2.0x), pull back to normal (1.0x)
        const sc = 2.0 + (1.0 - 2.0) * panP
        g.scale.set(sc, sc, sc)
        // Laptop: centered, flat
        if (d.laptop) {
          d.laptop.position.set(0, -0.55, 0)
          d.laptop.rotation.set(
            0.08 + smoothSin(t, 0.03, 0.006),
            smoothSin(t, 0.03, 0.008),
            0
          )
        }
        // Phone: resting on the keyboard area, tilted slightly face-up
        if (d.phone) {
          d.phone.position.set(
            0.35 + smoothSin(t, 0.04, 0.005),
            -0.18,
            0.55
          )
          d.phone.rotation.set(
            -1.2,
            0.15 + smoothSin(t, 0.03, 0.006),
            0.1
          )
        }
        break
      }

      // ── 8. Offset Circle Rotate (dynamic count) ──────
      case 'offsetCircleRotate': {
        const count = multiDeviceCount || 6
        g.rotation.y = t * 0.18
        g.position.y = smoothSin(t, 0.2, 0.04)
        g.rotation.x = smoothSin(t, 0.1, 0.03)
        const r = Math.max(1.0, 0.25 * count)
        for (let i = 0; i < count; i++) {
          const ref = d[`p${i}`]
          if (!ref) continue
          const angle = (i / count) * Math.PI * 2
          const yOff = ((i % 3 === 0) ? 0.25 : (i % 3 === 1) ? -0.15 : 0.1)
          ref.position.set(Math.sin(angle) * r, yOff + smoothSin(t + i * 0.6, 0.3, 0.04), Math.cos(angle) * r)
          ref.rotation.y = angle
          ref.rotation.z = smoothSin(t + i, 0.2, 0.02)
        }
        break
      }

      // ── 9. Flat Grid (dynamic count) — phones lying face-up ──
      case 'flatScatter7': {
        const count = multiDeviceCount || 7

        // Phase 1: perspective intro (0 → 2.5s) — angled view easing toward top-down
        // Phase 2: settle to top-down (2.5 → 4.5s)
        // Phase 3: slow orbit rotation (4.5s+)
        const introEnd = 2.5
        const settleEnd = 3.0

        const startRotX = 0.4
        const topDownRotX = 1.25

        if (t < introEnd) {
          const p = easeOutCubic(t / introEnd)
          g.rotation.x = startRotX + (topDownRotX - startRotX) * p
          g.rotation.y = 0.2 * (1 - p)
          g.position.y = 0.5 - 0.15 * p
        } else if (t < settleEnd) {
          const p = easeInOutCubic((t - introEnd) / (settleEnd - introEnd))
          g.rotation.x = topDownRotX + smoothSin(t, 0.06, 0.015)
          g.rotation.y = smoothSin(t, 0.04, 0.02) * p
          g.position.y = 0.35 + smoothSin(t, 0.08, 0.02)
        } else {
          const orbitT = t - settleEnd
          g.rotation.x = topDownRotX + smoothSin(t, 0.06, 0.015)
          g.rotation.y = orbitT * 0.12 + smoothSin(t, 0.04, 0.02)
          g.position.y = 0.35 + smoothSin(t, 0.08, 0.02)
        }

        const edgeGap = 0.18
        const spacing = 0.36 + edgeGap + 0.78

        const cols = Math.min(count, Math.ceil(Math.sqrt(count * 1.5)))
        const rows = Math.ceil(count / cols)

        const gridW = (cols - 1) * spacing
        const gridZ = (rows - 1) * spacing
        const maxSpan = Math.max(gridW, gridZ)
        const fitScale = maxSpan > 5.2 ? 5.2 / maxSpan : 1

        const gridOffX = -(cols - 1) * spacing / 2
        const gridOffZ = -(rows - 1) * spacing / 2

        let idx = 0
        for (let row = 0; row < rows; row++) {
          const itemsInRow = Math.min(cols, count - idx)
          const colStart = Math.floor((cols - itemsInRow) / 2)
          for (let c = 0; c < itemsInRow; c++) {
            const col = colStart + c
            const ref = d[`p${idx}`]
            if (ref) {
              const x = (gridOffX + col * spacing) * fitScale
              const z = (gridOffZ + row * spacing) * fitScale
              const isLandscape = (row + col) % 2 === 1
              ref.position.set(x, 0, z)
              ref.rotation.set(-Math.PI / 2, 0, isLandscape ? Math.PI / 2 : 0)
              ref.scale.set(fitScale, fitScale, fitScale)
            }
            idx++
            if (idx >= count) break
          }
        }
        break
      }

      default: {
        if (isPhoneLaptop) {
          // Keep phone+laptop in their default positions, apply animation to group only
          g.rotation.x = 0.18 + smoothSin(t, 0.08, 0.01)
          g.rotation.y = smoothSin(t, 0.1, 0.06)
          g.position.y = 0.15 + smoothSin(t, 0.15, 0.02)
          if (d.laptop) {
            d.laptop.position.set(-0.2, -0.55, 0)
            d.laptop.rotation.set(0.1 + smoothSin(t, 0.06, 0.01), smoothSin(t, 0.05, 0.015), 0)
          }
          if (d.phone) {
            d.phone.position.set(1.1 + smoothSin(t, 0.1, 0.015), -0.1 + smoothSin(t + 0.5, 0.15, 0.03), 1.0)
            d.phone.rotation.set(-0.08 + smoothSin(t, 0.08, 0.01), -0.15 + smoothSin(t, 0.06, 0.02), 0.04 + smoothSin(t + 1, 0.1, 0.01))
          }
        } else {
          const count = multiDeviceCount || 4
          const introP = easeOutCubic(Math.min(1, t / 2.0))
          g.rotation.x = 0.15 * introP + smoothSin(t, 0.08, 0.02)
          g.rotation.y = smoothSin(t, 0.12, 0.06)
          g.position.y = smoothSin(t, 0.2, 0.04)
          const totalSpan = Math.min(4.5, 0.9 * count)
          for (let i = 0; i < count; i++) {
            const ref = d[`p${i}`]
            if (!ref) continue
            const frac = count === 1 ? 0.5 : i / (count - 1)
            const x = -totalSpan / 2 + frac * totalSpan
            const z = -0.3 + 0.3 * Math.sin(frac * Math.PI)
            const y = 0.05 + 0.1 * Math.sin(frac * Math.PI)
            const ry = 0.12 - frac * 0.24
            ref.position.set(x, y + smoothSin(t + i * 0.5, 0.25, 0.04), z)
            ref.rotation.set(0, ry, 0)
          }
        }
        break
      }
    }

    g.rotation.x += userRotRef.current.x
    g.rotation.y += userRotRef.current.y
    g.position.x += userPosRef.current.x
    g.position.y += userPosRef.current.y

    // Apply per-device user adjustments for phone+laptop templates
    if (isPhoneLaptop) {
      const pa = deviceAdjRef.current.phone
      const la = deviceAdjRef.current.laptop
      if (d.phone) {
        d.phone.position.x += pa.pos.x
        d.phone.position.y += pa.pos.y
        d.phone.rotation.x += pa.rot.x
        d.phone.rotation.y += pa.rot.y
      }
      if (d.laptop) {
        d.laptop.position.x += la.pos.x
        d.laptop.position.y += la.pos.y
        d.laptop.rotation.x += la.rot.x
        d.laptop.rotation.y += la.rot.y
      }
    }

    // Smooth transition blending between clips
    if (transFromRef.current && transTRef.current < TRANS_DUR) {
      const p = easeOutCubic(transTRef.current / TRANS_DUR)
      const f = transFromRef.current
      g.position.x = f.px + (g.position.x - f.px) * p
      g.position.y = f.py + (g.position.y - f.py) * p
      g.position.z = f.pz + (g.position.z - f.pz) * p
      g.rotation.x = f.rx + (g.rotation.x - f.rx) * p
      g.rotation.y = f.ry + (g.rotation.y - f.ry) * p
      g.rotation.z = f.rz + (g.rotation.z - f.rz) * p
      g.scale.x = f.sx + (g.scale.x - f.sx) * p
      g.scale.y = f.sy + (g.scale.y - f.sy) * p
      g.scale.z = f.sz + (g.scale.z - f.sz) * p
      transTRef.current += delta
    } else if (transFromRef.current) {
      transFromRef.current = null
    }
  })

  const renderPhones = (count, scale = 0.3) => {
    if (animation === 'sideScroll10') {
      const spacing = 0.8
      return Array.from({ length: count }, (_, i) => (
        <group key={i} ref={setRef(`p${i}`)} position={[(i - (count - 1) / 2) * spacing, 0, 0]}>
          <DeviceFrame {...phonePropsForSlot(i)} scale={scale} />
        </group>
      ))
    }
    if (animation === 'angled3ZoomOut') {
      const positions = [[-1.3, 0, -0.3], [0, 0, 0.15], [1.3, 0, -0.3]]
      return positions.map((pos, i) => (
        <group key={i} ref={setRef(`p${i}`)} position={pos}>
          <DeviceFrame {...phonePropsForSlot(i)} scale={scale} />
        </group>
      ))
    }
    if (animation === 'flatScatter7') {
      const devW = 2.4 * scale
      const devH = 5.2 * scale
      return Array.from({ length: count }, (_, i) => (
        <group key={i} ref={setRef(`p${i}`)}>
          <DeviceFrame {...phonePropsForSlot(i)} scale={scale} />
          <mesh position={[0, 0, -0.06 * scale]} renderOrder={-1}>
            <planeGeometry args={[devW * 1.12, devH * 1.04]} />
            <meshBasicMaterial map={FLAT_SHADOW_TEX} transparent opacity={0.4} depthWrite={false} />
          </mesh>
        </group>
      ))
    }
    return Array.from({ length: count }, (_, i) => (
      <group key={i} ref={setRef(`p${i}`)}>
        <DeviceFrame {...phonePropsForSlot(i)} scale={scale} />
      </group>
    ))
  }

  switch (animation) {
    case 'sideScroll10':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 10, 0.28)}</group>
    case 'angled3ZoomOut':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(3, 0.33)}</group>
    case 'circle4Rotate':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 4, 0.28)}</group>
    case 'angledZoom4':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 4, 0.32)}</group>
    case 'carousel6':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 6, 0.26)}</group>
    case 'offsetCircleRotate':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 6, 0.27)}</group>
    case 'flatScatter7':
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 7, 0.30)}</group>
    case 'floatingPhoneLaptop':
    case 'phoneInFrontLaptop':
    case 'phoneOnKeyboard': {
      const phoneSrc = getSlotScreen(0)
      const laptopSrc = getSlotScreen(1)
      const isKeyboard = animation === 'phoneOnKeyboard'
      return (
        <group ref={groupRef}>
          <group ref={setRef('laptop')} onPointerDown={makeDevicePointerDown('laptop')} onDoubleClick={makeDeviceDoubleClick('laptop')}>
            <DeviceFrame
              type="macbook"
              screenUrl={laptopSrc?.url || null}
              screenFile={laptopSrc?.file || null}
              isVideo={laptopSrc?.isVideo || false}
              isGif={laptopSrc?.isGif || false}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              scale={isKeyboard ? 0.42 : 0.40}
              lidAngleRef={lidAngleRef}
              showShadow={showDeviceShadow}
            />
          </group>
          <group ref={setRef('phone')} onPointerDown={makeDevicePointerDown('phone')} onDoubleClick={makeDeviceDoubleClick('phone')}>
            <DeviceFrame
              type={resolvedType}
              screenUrl={phoneSrc?.url || null}
              screenFile={phoneSrc?.file || null}
              isVideo={phoneSrc?.isVideo || false}
              isGif={phoneSrc?.isGif || false}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              scale={isKeyboard ? 0.18 : 0.22}
              showShadow={showDeviceShadow}
            />
          </group>
        </group>
      )
    }
    default: {
      if (isPhoneLaptop) {
        const phoneSrc = getSlotScreen(0)
        const laptopSrc = getSlotScreen(1)
        return (
          <group ref={groupRef}>
            <group ref={setRef('laptop')} onPointerDown={makeDevicePointerDown('laptop')} onDoubleClick={makeDeviceDoubleClick('laptop')}>
              <DeviceFrame
                type="macbook"
                screenUrl={laptopSrc?.url || null}
                screenFile={laptopSrc?.file || null}
                isVideo={laptopSrc?.isVideo || false}
                isGif={laptopSrc?.isGif || false}
                videoSeekTime={videoSeekTime}
                timelinePlaying={timelinePlaying}
                scale={0.40}
                lidAngleRef={lidAngleRef}
                showShadow={showDeviceShadow}
              />
            </group>
            <group ref={setRef('phone')} onPointerDown={makeDevicePointerDown('phone')} onDoubleClick={makeDeviceDoubleClick('phone')}>
              <DeviceFrame
                type={resolvedType}
                screenUrl={phoneSrc?.url || null}
                screenFile={phoneSrc?.file || null}
                isVideo={phoneSrc?.isVideo || false}
                isGif={phoneSrc?.isGif || false}
                videoSeekTime={videoSeekTime}
                timelinePlaying={timelinePlaying}
                scale={0.22}
                showShadow={showDeviceShadow}
              />
            </group>
          </group>
        )
      }
      return <group ref={groupRef} onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick}>{renderPhones(multiDeviceCount || 4, 0.30)}</group>
    }
  }
}

// ── Ground reflection plane ───────────────────────────────────
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color="#0b141a" transparent opacity={0.4} roughness={0.85} />
    </mesh>
  )
}

// ── Canvas-texture text overlay (viewport-aware) ─────────────
const TEXT_Z_FRONT = 1.0
const TEXT_Z_BEHIND = -0.5
function CanvasTextOverlay({ overlay, currentTime, duration, textSplit, textOnLeft, isVerticalLayout, textOnTop, onTextClick, onTextDrag, disableAnimation }) {
  const meshRef = useRef()
  const ctRef = useRef(currentTime)
  ctRef.current = currentTime
  const durRef = useRef(duration || 999)
  durRef.current = duration || 999
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origPosX: 0, origPosY: 0 })

  const TEX_W = 1024
  const TEX_H = 512
  const zDepth = overlay.behindDevice ? TEXT_Z_BEHIND : TEXT_Z_FRONT
  const visibleWidth = useVisibleWidth(zDepth)
  const { camera, size } = useThree()
  const visibleHeight = useMemo(() => {
    const dist = camera.position.z - zDepth
    const vFov = (camera.fov * Math.PI) / 180
    return 2 * Math.tan(vFov / 2) * dist
  }, [camera.fov, camera.position.z, zDepth])

  const split = textSplit || 0.5
  const margin = 0.08
  const hasAnim = overlay.animation && overlay.animation !== 'none'
  const textAreaWidth = isVerticalLayout
    ? visibleWidth * (1 - margin * 2)
    : hasAnim ? visibleWidth * split * (1 - margin * 2) : visibleWidth * (1 - margin * 2)
  const textAreaHeight = isVerticalLayout
    ? (hasAnim ? visibleHeight * split * (1 - margin * 2) : visibleHeight * (1 - margin * 2))
    : visibleHeight * (1 - margin * 2)

  const isDraggable = !hasAnim || disableAnimation

  const meshW = textAreaWidth
  const meshH = textAreaWidth * (TEX_H / TEX_W)
  const clampedH = Math.min(meshH, textAreaHeight)
  const finalW = clampedH < meshH ? clampedH * (TEX_W / TEX_H) : meshW

  // Compensate font pixel size so text looks the same visual size at any aspect ratio.
  // visibleHeight is constant (camera uses vertical FOV), so use it as stable reference.
  const fontCompensation = Math.max(1, (visibleHeight * 0.75) / Math.max(0.01, finalW))

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [])

  useEffect(() => {
    let cancelled = false
    const pxSize = Math.max(24, Math.min(TEX_W * 0.65, overlay.fontSize * 1.8 * fontCompensation))
    const weight = overlay.fontWeight || 600
    const fontSpec = `${weight} ${pxSize}px "${overlay.fontFamily}"`
    const align = overlay.textAlign || 'center'

    const draw = () => {
      if (cancelled) return
      const canvas = texture.image
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, TEX_W, TEX_H)

      ctx.font = `${fontSpec}, Inter, sans-serif`
      ctx.fillStyle = overlay.color

      const text = overlay.text || ''
      const words = text.split(' ')
      const maxWidth = TEX_W * 0.88
      const lines = []
      let line = ''
      for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      if (line) lines.push(line)

      const lineH = pxSize * 1.25
      const totalH = lines.length * lineH
      const startY = (TEX_H - totalH) / 2 + lineH * 0.5
      ctx.textAlign = align
      ctx.textBaseline = 'middle'
      const padX = TEX_W * 0.06
      const drawX = align === 'left' ? padX : align === 'right' ? TEX_W - padX : TEX_W / 2
      lines.forEach((l, i) => {
        ctx.fillText(l, drawX, startY + i * lineH)
      })

      texture.needsUpdate = true
    }

    document.fonts.load(fontSpec).then(draw).catch(draw)

    return () => { cancelled = true }
  }, [overlay.text, overlay.fontFamily, overlay.fontSize, overlay.fontWeight, overlay.textAlign, overlay.color, texture, fontCompensation])

  let textCenterX, textCenterY
  if (isVerticalLayout) {
    textCenterX = 0
    textCenterY = textOnTop
      ? (visibleHeight / 2) - (visibleHeight * split / 2)
      : -(visibleHeight / 2) + (visibleHeight * split / 2)
  } else if (overlay.animation !== 'none') {
    textCenterX = textOnLeft
      ? -(visibleWidth / 2) + (visibleWidth * split / 2)
      : (visibleWidth / 2) - (visibleWidth * split / 2)
    textCenterY = overlay.posY || 0
  } else {
    textCenterX = overlay.posX || 0
    textCenterY = overlay.posY || 0
  }

  useFrame(() => {
    if (!meshRef.current || dragRef.current.active) return
    const t = ctRef.current
    const dur = durRef.current
    const animDuration = 1.2
    const progress = easeOutCubic(Math.min(1, Math.max(0, t) / animDuration))

    let x, y
    const anim = disableAnimation ? 'none' : overlay.animation
    if (anim === 'slideFromRight') {
      x = visibleWidth * 0.8 + (textCenterX - visibleWidth * 0.8) * progress
      y = textCenterY
    } else if (anim === 'slideFromLeft') {
      x = -visibleWidth * 0.8 + (textCenterX + visibleWidth * 0.8) * progress
      y = textCenterY
    } else if (anim === 'slideFromBottom') {
      const offY = -visibleHeight * 0.7
      y = offY + (textCenterY - offY) * progress
      x = textCenterX
    } else if (anim === 'slideFromTop') {
      const offY = visibleHeight * 0.7
      y = offY + (textCenterY - offY) * progress
      x = textCenterX
    } else {
      x = textCenterX
      y = textCenterY
    }

    // Smooth fade in/out
    let opacity = 1
    const fadeIn = TEXT_FADE_DUR
    const fadeOut = TEXT_FADE_DUR
    if (t < 0) {
      opacity = 0
    } else if (t < fadeIn) {
      opacity = easeOutCubic(t / fadeIn)
    }
    const timeLeft = dur - t
    if (timeLeft < 0) {
      opacity = 0
    } else if (timeLeft < fadeOut) {
      opacity = Math.min(opacity, easeOutCubic(timeLeft / fadeOut))
    }

    meshRef.current.position.set(x, y, zDepth)
    meshRef.current.material.opacity = opacity
  })

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    if (onTextClick) onTextClick(overlay.id)
    if (!isDraggable || !onTextDrag) return

    const dr = dragRef.current
    dr.active = true
    dr.startX = e.clientX
    dr.startY = e.clientY
    dr.origPosX = overlay.posX || 0
    dr.origPosY = overlay.posY || 0
    e.target?.setPointerCapture?.(e.pointerId)

    const onMove = (ev) => {
      if (!dr.active) return
      const dx = (ev.clientX - dr.startX) / size.width * visibleWidth
      const dy = -(ev.clientY - dr.startY) / size.height * visibleHeight
      if (meshRef.current) {
        meshRef.current.position.set(dr.origPosX + dx, dr.origPosY + dy, zDepth)
      }
    }

    const onUp = (ev) => {
      if (!dr.active) return
      dr.active = false
      const dx = (ev.clientX - dr.startX) / size.width * visibleWidth
      const dy = -(ev.clientY - dr.startY) / size.height * visibleHeight
      const newX = dr.origPosX + dx
      const newY = dr.origPosY + dy
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        onTextDrag(overlay.id, { posX: newX, posY: newY })
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [isDraggable, onTextDrag, overlay.id, overlay.posX, overlay.posY, visibleWidth, visibleHeight, size.width, size.height, zDepth])

  const behind = !!overlay.behindDevice
  const rOrder = behind ? -1 : 10

  return (
    <mesh
      ref={meshRef}
      position={[textCenterX, textCenterY, zDepth]}
      renderOrder={rOrder}
      onPointerDown={handlePointerDown}
      onPointerOver={isDraggable ? (e) => { e.stopPropagation(); document.body.style.cursor = 'grab' } : undefined}
      onPointerOut={isDraggable ? () => { document.body.style.cursor = '' } : undefined}
    >
      <planeGeometry args={[finalW, clampedH]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={!behind}
        depthTest={!behind ? false : true}
      />
    </mesh>
  )
}

const TEXT_FADE_DUR = 0.35

function TextOverlays({ textOverlays, currentTime, textSplit, textOnLeft, isVerticalLayout, textOnTop, onTextClick, onTextDrag }) {
  if (!textOverlays || textOverlays.length === 0) return null

  return (
    <group>
      {textOverlays
        .filter((overlay) => {
          if (overlay.startTime == null || overlay.endTime == null) return true
          return currentTime >= overlay.startTime - TEXT_FADE_DUR && currentTime <= overlay.endTime + TEXT_FADE_DUR
        })
        .map((overlay) => {
          const localTime = overlay.startTime != null ? currentTime - overlay.startTime : currentTime
          const duration = overlay.endTime != null && overlay.startTime != null ? overlay.endTime - overlay.startTime : 999
          return (
            <CanvasTextOverlay key={overlay.id} overlay={overlay} currentTime={localTime} duration={duration} textSplit={textSplit} textOnLeft={textOnLeft} isVerticalLayout={isVerticalLayout} textOnTop={textOnTop} onTextClick={onTextClick} onTextDrag={onTextDrag} disableAnimation={false} />
          )
        })}
    </group>
  )
}

// ── Outro logo overlay (appears at end of video) ─────────────
function OutroLogo({ logoId, currentTime, totalDuration }) {
  const groupRef = useRef()
  const matRef = useRef()
  const ctRef = useRef(currentTime)
  ctRef.current = currentTime
  const durRef = useRef(totalDuration)
  durRef.current = totalDuration
  const texLoadedRef = useRef(false)

  const logoUrl = logoId === 'whatsapp' ? '/logos/whatsapp.svg' : '/logos/whatsapp-business.svg'

  const texture = useMemo(() => {
    texLoadedRef.current = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const SIZE = 512
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      tex.needsUpdate = true
      texLoadedRef.current = true
    }
    img.src = logoUrl
    return tex
  }, [logoUrl])

  const LOGO_Z = -0.5
  const LOGO_DUR = 2.5
  const FADE_IN = 0.8

  useFrame(({ camera }) => {
    const grp = groupRef.current
    const mat = matRef.current
    if (!grp || !mat) return

    if (!texLoadedRef.current) { grp.scale.set(0, 0, 0); return }

    const t = ctRef.current
    const dur = durRef.current
    const logoStart = dur - LOGO_DUR

    if (dur < LOGO_DUR + 0.5 || t < logoStart) {
      grp.scale.set(0, 0, 0)
      mat.opacity = 0
      return
    }

    const elapsed = t - logoStart
    const fadeProgress = Math.min(1, elapsed / FADE_IN)
    const opacity = easeOutCubic(fadeProgress)

    const dist = Math.max(0.1, camera.position.z - LOGO_Z)
    const vFov = (camera.fov * Math.PI) / 180
    const visH = 2 * Math.tan(vFov / 2) * dist
    const baseSize = visH * 0.11
    const s = (0.7 + 0.3 * easeOutCubic(fadeProgress)) * baseSize

    grp.scale.set(s, s, 1)
    grp.position.set(0, 0, LOGO_Z)
    mat.opacity = opacity
  })

  return (
    <group ref={groupRef} scale={[0, 0, 0]}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={matRef} map={texture} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── Draggable split divider ───────────────────────────────────
function SplitDivider({ textSplit, onSplitChange, visible, textOnLeft, isVerticalLayout, textOnTop, onFlip }) {
  const dividerRef = useRef(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!visible) return

    const onMove = (e) => {
      if (!dragging.current) return
      const parent = dividerRef.current?.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()

      if (isVerticalLayout) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        const pct = (clientY - rect.top) / rect.height
        const clamped = Math.min(0.75, Math.max(0.25, pct))
        onSplitChange(+(textOnTop ? clamped : 1 - clamped).toFixed(2))
      } else {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const pct = (clientX - rect.left) / rect.width
        const clamped = Math.min(0.75, Math.max(0.25, pct))
        onSplitChange(+(textOnLeft ? clamped : 1 - clamped).toFixed(2))
      }
    }

    const onUp = () => { dragging.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [visible, onSplitChange, textOnLeft, isVerticalLayout, textOnTop])

  if (!visible) return null

  const split = textSplit || 0.5
  const isH = isVerticalLayout

  if (isH) {
    const topPct = textOnTop
      ? (split * 100).toFixed(1)
      : ((1 - split) * 100).toFixed(1)

    return (
      <div
        ref={dividerRef}
        className="split-divider split-divider-h"
        style={{ top: `${topPct}%` }}
        onMouseDown={(e) => { e.preventDefault(); dragging.current = true; document.body.style.cursor = 'row-resize' }}
        onTouchStart={() => { dragging.current = true }}
      >
        <div className="split-divider-handle split-divider-handle-h">
          <div className="split-divider-dots split-divider-dots-h">
            <span /><span /><span />
          </div>
        </div>
        {onFlip && (
          <button
            className="split-swap-btn split-swap-btn-h"
            title="Swap text & device positions"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onFlip() }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  const leftPct = textOnLeft
    ? (split * 100).toFixed(1)
    : ((1 - split) * 100).toFixed(1)

  return (
    <div
      ref={dividerRef}
      className="split-divider"
      style={{ left: `${leftPct}%` }}
      onMouseDown={(e) => { e.preventDefault(); dragging.current = true; document.body.style.cursor = 'col-resize' }}
      onTouchStart={() => { dragging.current = true }}
    >
      <div className="split-divider-handle">
        <div className="split-divider-dots">
          <span /><span /><span />
        </div>
      </div>
      {onFlip && (
        <button
          className="split-swap-btn"
          title="Swap text & device sides"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onFlip() }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function PreviewScene({
  screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, bgColor, bgGradient, showBase, showDeviceShadow, isPlaying, canvasRef,
  textOverlays, currentTime, clipAnimationTime, activeClipId, activeTextAnim, aspectRatio, textSplit, onTextSplitChange, layoutFlipped, onFlipLayout, slotScreens,
  outroLogo, totalDuration, multiDeviceCount, onTextClick, onTextDrag, onDeviceClick, onDrop,
}) {
  const tint = useTintedLights(bgColor)
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 })
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)
  const [hasManualAdjust, setHasManualAdjust] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [interactionMode, setInteractionMode] = useState('rotate')
  const handleResetAdjust = useCallback(() => {
    setResetKey(k => k + 1)
    setHasManualAdjust(false)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const canvasStyle = useMemo(() => {
    if (!aspectRatio) return { width: '100%', height: '100%' }
    const parts = aspectRatio.split(':')
    if (parts.length !== 2) return { width: '100%', height: '100%' }
    const arW = parseFloat(parts[0])
    const arH = parseFloat(parts[1])
    if (!arW || !arH) return { width: '100%', height: '100%' }

    const targetAR = arW / arH
    const containerAR = containerSize.w / containerSize.h

    let w, h
    if (containerAR > targetAR) {
      h = containerSize.h
      w = h * targetAR
    } else {
      w = containerSize.w
      h = w / targetAR
    }

    return { width: Math.floor(w), height: Math.floor(h) }
  }, [aspectRatio, containerSize])

  const hasActiveText = activeTextAnim && activeTextAnim !== 'none'
  const showDivider = hasActiveText
  const isVerticalLayout = activeTextAnim === 'slideFromTop' || activeTextAnim === 'slideFromBottom'
  const defaultTextOnLeft = activeTextAnim === 'slideFromLeft'
  const defaultTextOnTop = activeTextAnim === 'slideFromTop'
  const textOnLeft = isVerticalLayout ? false : (layoutFlipped ? !defaultTextOnLeft : defaultTextOnLeft)
  const textOnTop = isVerticalLayout ? (layoutFlipped ? !defaultTextOnTop : defaultTextOnTop) : false

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false) }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)
    if (!onDrop) return
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (files.length > 0) onDrop(files)
  }, [onDrop])

  return (
    <div
      className={`preview-scene${isDragOver ? ' preview-drag-over' : ''}`}
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="preview-drop-overlay">
          <div className="preview-drop-ring">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Drop media here</span>
          </div>
        </div>
      )}
      <div className={`preview-canvas-wrap${interactionMode === 'move' ? ' mode-move' : ''}`} style={canvasStyle}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 2]}
        shadows
        onCreated={({ gl }) => {
          if (canvasRef) canvasRef.current = gl.domElement
        }}
      >
        <SceneBackground bgColor={bgColor} bgGradient={bgGradient} />
        <CameraAnimator animation={animation} isPlaying={isPlaying} multiDeviceCount={multiDeviceCount} clipDuration={clipDuration} clipAnimationTime={clipAnimationTime} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 6, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 3, -2]} intensity={0.5} color={tint.fill} />
        <directionalLight position={[-5, 2, -5]} intensity={0.6} color={tint.rim1} />
        <directionalLight position={[5, 2, -5]} intensity={0.4} color={tint.rim2} />
        <pointLight position={[0, -3, 2]} intensity={0.25} color={tint.accent} distance={8} />
        <spotLight position={[0, 8, 3]} angle={0.35} penumbra={0.7} intensity={0.5} castShadow />

        <Suspense fallback={null}>
          {(MULTI_DEVICE_ANIMS.has(animation) || slotScreens) ? (
            <MultiDeviceScene
              screens={screens}
              activeScreen={activeScreen}
              animation={animation}
              clipAnimationTime={clipAnimationTime}
              activeClipId={activeClipId}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              outroAnimation={outroAnimation}
              clipDuration={clipDuration}
              slotScreens={slotScreens}
              multiDeviceCount={multiDeviceCount}
              showDeviceShadow={showDeviceShadow}
              onDeviceClick={onDeviceClick}
              resetKey={resetKey}
              onManualAdjust={setHasManualAdjust}
              interactionMode={interactionMode}
              deviceType={deviceType}
            />
          ) : (
            <AnimatedDevices
              screens={screens}
              activeScreen={activeScreen}
              zoomLevel={zoomLevel}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              deviceType={deviceType}
              animation={animation}
              outroAnimation={outroAnimation}
              clipDuration={clipDuration}
              isPlaying={isPlaying}
              currentTime={currentTime}
              clipAnimationTime={clipAnimationTime}
              activeClipId={activeClipId}
              activeTextAnim={activeTextAnim}
              textSplit={textSplit}
              textOnLeft={textOnLeft}
              isVerticalLayout={isVerticalLayout}
              textOnTop={textOnTop}
              showDeviceShadow={showDeviceShadow}
              onDeviceClick={onDeviceClick}
              resetKey={resetKey}
              onManualAdjust={setHasManualAdjust}
              interactionMode={interactionMode}
            />
          )}
          {showBase && (
              <ContactShadows
                position={[0, -2.5, 0]}
                opacity={0.3}
                scale={12}
                blur={2.5}
                far={4.5}
                resolution={512}
              />
          )}
        </Suspense>
        <TextOverlays textOverlays={textOverlays} currentTime={currentTime} textSplit={textSplit} textOnLeft={textOnLeft} isVerticalLayout={isVerticalLayout} textOnTop={textOnTop} onTextClick={onTextClick} onTextDrag={onTextDrag} />
        {outroLogo && totalDuration > 3 && (
          <OutroLogo logoId={outroLogo} currentTime={currentTime} totalDuration={totalDuration} />
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
      <SplitDivider textSplit={textSplit} onSplitChange={onTextSplitChange} visible={showDivider} textOnLeft={textOnLeft} isVerticalLayout={isVerticalLayout} textOnTop={textOnTop} onFlip={onFlipLayout} />
      <div className="preview-interaction-toggle">
        <button
          className={`preview-mode-btn${interactionMode === 'rotate' ? ' active' : ''}`}
          onClick={() => setInteractionMode('rotate')}
          title="Rotate device (drag to rotate)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 13.72A10 10 0 1 1 19.07 4.93L21.5 8" />
          </svg>
        </button>
        <button
          className={`preview-mode-btn${interactionMode === 'move' ? ' active' : ''}`}
          onClick={() => setInteractionMode('move')}
          title="Move device (drag to reposition)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l-3 3 3 3" />
            <path d="M9 5l3-3 3 3" />
            <path d="M15 19l-3 3-3-3" />
            <path d="M19 9l3 3-3 3" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </button>
      </div>
      {hasManualAdjust && (
        <button className="preview-reset-btn" onClick={handleResetAdjust} title="Reset manual adjustments">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset
        </button>
      )}
      </div>

      {screens.length === 0 && (
        <div className="preview-empty">
          <p>Drag &amp; drop or upload media</p>
        </div>
      )}
    </div>
  )
}
