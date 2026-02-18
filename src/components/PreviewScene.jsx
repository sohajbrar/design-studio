import { useRef, useEffect, useMemo, Suspense, useState } from 'react'
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

  useEffect(() => {
    if (bgGradient) {
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
      scene.background = new THREE.CanvasTexture(canvas)
    } else {
      scene.background = new THREE.Color(bgColor)
    }
  }, [bgColor, bgGradient, scene])

  return null
}

// ── Camera animator (for presets that move the camera) ─────────
function CameraAnimator({ animation, isPlaying }) {
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
    const t = timeRef.current

    switch (animation) {
      case 'scroll': {
        const camZ = 2.5 + smoothSin(t, 0.2, 0.25)
        const camY = smoothSin(t, 0.15, 0.2)
        const camX = smoothSin(t, 0.12, 0.1)
        camera.position.set(camX, camY, camZ)
        camera.lookAt(0, smoothSin(t, 0.15, 0.08), 0)
        break
      }
      case 'single': {
        const introT = Math.min(1, t / 2.5)
        const eased = easeOutCubic(introT)
        const targetZ = 2.5 - eased * 0.4
        const orbitAngle = t * 0.25
        const radius = targetZ
        camera.position.set(
          Math.sin(orbitAngle) * radius * 0.1,
          smoothSin(t, 0.2, 0.1),
          radius + smoothSin(t, 0.15, 0.1)
        )
        camera.lookAt(0, smoothSin(t, 0.12, 0.05), 0)
        break
      }
      default: {
        // Default camera position
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
function AnimatedDevices({ screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, isPlaying, currentTime, clipAnimationTime, activeTextAnim, textSplit, textOnLeft }) {
  const groupRef = useRef()
  const iphoneRef = useRef()
  const androidRef = useRef()
  const ipadRef = useRef()
  const macbookRef = useRef()
  const currentZoomRef = useRef(1)
  const lidAngleRef = useRef(Math.PI / 2)
  const textOffsetRef = useRef({ x: 0 })
  const prevTextAnim = useRef('none')
  const ctRef = useRef(clipAnimationTime || 0)
  ctRef.current = clipAnimationTime || 0
  const visibleWidth = useVisibleWidth(0)

  const firstScreen = activeScreen || screens[0] || null
  const secondScreen = screens[1] || screens[0] || null

  const showIphone = deviceType === 'iphone' || deviceType === 'both'
  const showAndroid = deviceType === 'android' || deviceType === 'both'
  const showIpad = deviceType === 'ipad'
  const showMacbook = deviceType === 'macbook'
  const isBoth = deviceType === 'both'

  useFrame(() => {
    if (!groupRef.current) return
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
        const introT = Math.min(1, t / 1.8)
        const eased = easeOutCubic(introT)
        group.position.x = (-4) * (1 - eased)
        group.position.y = smoothSin(t, 0.3, 0.06)
        group.rotation.y = smoothSin(t, 0.2, 0.08)
        break
      }

      // ── SLIDE FROM RIGHT ────────────────────────────
      case 'slideRight': {
        const introT = Math.min(1, t / 1.8)
        const eased = easeOutCubic(introT)
        group.position.x = 4 * (1 - eased)
        group.position.y = smoothSin(t, 0.3, 0.06)
        group.rotation.y = smoothSin(t, 0.2, 0.08)
        break
      }

      // ── SLIDE DOWN (enters from top) ────────────────
      case 'slideDown': {
        const introT = Math.min(1, t / 1.8)
        const eased = easeOutCubic(introT)
        group.position.y = 4 * (1 - eased) + smoothSin(t, 0.3, 0.06)
        group.rotation.x = smoothSin(t, 0.2, 0.04)
        break
      }

      // ── SLIDE UP (enters from bottom) ───────────────
      case 'slideUp': {
        const introT = Math.min(1, t / 1.8)
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

      // ── ZOOM BOTTOM LEFT: Skew & zoom into bottom-left corner ─
      case 'zoomBottomLeft': {
        const introT = Math.min(1, t / 2.2)
        const eased = easeOutCubic(introT)
        const isMacbook = showMacbook
        const targetScale = isMacbook ? 2.1 : 1.8
        const s = 1 + (targetScale - 1) * eased
        group.scale.set(s, s, s)
        group.rotation.x = -0.25 * eased + smoothSin(t, 0.15, 0.02)
        group.rotation.y = 0.35 * eased + smoothSin(t, 0.12, 0.03)
        group.rotation.z = -0.12 * eased
        const extraY = isMacbook ? -0.6 : 0
        group.position.x = 0.6 * eased + smoothSin(t, 0.18, 0.04)
        group.position.y = 0.5 * eased + extraY * eased + smoothSin(t, 0.22, 0.03)
        group.position.z = 0.3 * eased
        break
      }

      // ── ZOOM TOP RIGHT: Skew & zoom into top-right corner ─
      case 'zoomTopRight': {
        const introT = Math.min(1, t / 2.2)
        const eased = easeOutCubic(introT)
        const targetScale = 1.8
        const s = 1 + (targetScale - 1) * eased
        group.scale.set(s, s, s)
        group.rotation.x = 0.25 * eased + smoothSin(t, 0.15, 0.02)
        group.rotation.y = -0.35 * eased + smoothSin(t, 0.12, 0.03)
        group.rotation.z = 0.12 * eased
        group.position.x = -0.6 * eased + smoothSin(t, 0.18, 0.04)
        group.position.y = -0.5 * eased + smoothSin(t, 0.22, 0.03)
        group.position.z = 0.3 * eased
        break
      }

      // ── LAPTOP OPEN: lid opens from closed (folded down) to upright ─
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

    // ── Outro animation override ─────────────────────────────
    const outroDur = 2.8
    if (outroAnimation && outroAnimation !== 'none' && clipDuration > outroDur + 0.5) {
      const outroStart = clipDuration - outroDur
      if (t > outroStart) {
        const p = easeInCubic((t - outroStart) / outroDur)

        group.position.set(0, 0, 0)
        group.rotation.set(0, 0, 0)
        group.scale.set(1, 1, 1)
        if (iph) { iph.rotation.set(0, 0, 0); iph.position.set(iphBaseX, 0, 0); iph.scale.set(1, 1, 1) }
        if (and) { and.rotation.set(0, 0, 0); and.position.set(andBaseX, 0, 0); and.scale.set(1, 1, 1) }

        switch (outroAnimation) {
          case 'slideLeft':
            group.position.x = -4 * p
            break
          case 'slideRight':
            group.position.x = 4 * p
            break
          case 'slideDown':
            group.position.y = -4 * p
            break
          case 'slideUp':
            group.position.y = 4 * p
            break
          case 'slideLeftRotate':
            group.position.x = -4 * p
            group.rotation.y = (-Math.PI * 0.5) * p
            break
          case 'slideRightRotate':
            group.position.x = 4 * p
            group.rotation.y = (Math.PI * 0.5) * p
            break
          case 'zoomOut': {
            const s = 1 - p * 0.85
            group.scale.set(s, s, s)
            break
          }
          case 'flip':
            group.rotation.y = Math.PI * 2 * p
            group.position.y = 3.5 * p
            group.rotation.x = 0.4 * p
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

    // Shift device horizontally to make room for text (always left/right split)
    let targetOffX = 0
    if (activeTextAnim && activeTextAnim !== 'none') {
      const split = textSplit || 0.5
      const deviceFraction = 1 - split
      if (textOnLeft) {
        targetOffX = (visibleWidth / 2) - (visibleWidth * deviceFraction) / 2
      } else {
        targetOffX = -(visibleWidth / 2) + (visibleWidth * deviceFraction) / 2
      }
    }

    const animChanged = prevTextAnim.current !== activeTextAnim
    prevTextAnim.current = activeTextAnim
    const snap = animChanged && activeTextAnim !== 'none'
    const lerpSpeed = snap ? 1 : 0.08
    textOffsetRef.current.x += (targetOffX - textOffsetRef.current.x) * lerpSpeed
    group.position.x += textOffsetRef.current.x
  })

  return (
    <group ref={groupRef}>
      {showIphone && (
        <group ref={iphoneRef} position={[isBoth ? -0.8 : 0, 0, 0]}>
          <DeviceFrame
            type="iphone"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
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
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
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
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.35}
          />
        </group>
      )}
      {showMacbook && (
        <group ref={macbookRef} position={[0, 0.1, 0]}>
          <DeviceFrame
            type="macbook"
            screenUrl={firstScreen?.url || null}
            screenFile={firstScreen?.file || null}
            isVideo={firstScreen?.isVideo || false}
            videoSeekTime={videoSeekTime}
            timelinePlaying={timelinePlaying}
            scale={0.38}
            lidAngleRef={lidAngleRef}
          />
        </group>
      )}
    </group>
  )
}

// ── Multi-device animations ──────────────────────────────────
const MULTI_DEVICE_ANIMS = new Set([
  'sideScroll10', 'angled3ZoomOut', 'circle4Rotate', 'angledZoom4',
  'carousel6', 'floatingPhoneLaptop', 'phoneInFrontLaptop', 'offsetCircleRotate',
  'flatScatter7',
])

function MultiDeviceScene({ screens, activeScreen, animation, clipAnimationTime, videoSeekTime, timelinePlaying, outroAnimation, clipDuration, slotScreens }) {
  const groupRef = useRef()
  const devRefs = useRef({})
  const ctRef = useRef(0)
  ctRef.current = clipAnimationTime || 0

  const s0 = activeScreen || screens[0] || null
  const s1 = screens[1] || screens[0] || null
  const setRef = (k) => (el) => { if (el) devRefs.current[k] = el }

  const getSlotScreen = (index) => {
    if (slotScreens && slotScreens[index]) return slotScreens[index]
    return s0
  }

  const phonePropsForSlot = (index) => {
    const scr = getSlotScreen(index)
    return {
      type: 'iphone',
      screenUrl: scr?.url || null,
      screenFile: scr?.file || null,
      isVideo: scr?.isVideo || false,
      videoSeekTime, timelinePlaying,
      scale: 0.3,
    }
  }

  const phoneProps = phonePropsForSlot(0)

  const lidAngleRef = useRef(Math.PI / 2)

  useFrame(() => {
    const t = ctRef.current
    const g = groupRef.current
    if (!g) return
    const d = devRefs.current

    g.position.set(0, 0, 0)
    g.rotation.set(0, 0, 0)
    g.scale.set(1, 1, 1)

    switch (animation) {

      // ── 1. Side Scroll 10 ──────────────────────────
      case 'sideScroll10': {
        const scrollSpeed = 0.35
        g.position.x = 3.2 - t * scrollSpeed
        g.rotation.y = 0.06
        g.rotation.x = 0.02
        for (let i = 0; i < 10; i++) {
          const ref = d[`p${i}`]
          if (ref) {
            ref.position.y = Math.sin(t * 0.4 + i * 0.7) * 0.06
            ref.rotation.z = Math.sin(t * 0.3 + i * 0.5) * 0.015
          }
        }
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

      // ── 3. Circle 4 Rotate ─────────────────────────
      case 'circle4Rotate': {
        g.rotation.y = t * 0.25
        g.position.y = smoothSin(t, 0.3, 0.06)
        g.rotation.x = smoothSin(t, 0.15, 0.03)
        for (let i = 0; i < 4; i++) {
          const ref = d[`p${i}`]
          if (ref) {
            const angle = (i / 4) * Math.PI * 2
            const r = 1.3
            ref.position.set(Math.sin(angle) * r, smoothSin(t + i, 0.4, 0.05), Math.cos(angle) * r)
            ref.rotation.y = angle
          }
        }
        break
      }

      // ── 4. Angled Zoom 4 ──────────────────────────
      case 'angledZoom4': {
        const introP = easeOutCubic(Math.min(1, t / 2.0))
        g.rotation.x = 0.35 * introP + smoothSin(t, 0.12, 0.02)
        g.rotation.y = -0.15 * introP + smoothSin(t, 0.1, 0.06)
        g.position.y = -0.2 * introP + smoothSin(t, 0.2, 0.04)
        const layouts = [
          { x: -1.6, y: 0.1, z: -0.8, ry: 0.15, rz: 0.04 },
          { x: -0.55, y: 0.15, z: -0.2, ry: 0.08, rz: 0.02 },
          { x: 0.55, y: 0.2, z: 0.2, ry: -0.08, rz: -0.02 },
          { x: 1.6, y: 0.1, z: -0.4, ry: -0.15, rz: -0.04 },
        ]
        layouts.forEach((l, i) => {
          const ref = d[`p${i}`]
          if (ref) {
            ref.position.set(l.x, l.y + smoothSin(t + i * 0.5, 0.3, 0.04), l.z)
            ref.rotation.set(0, l.ry, l.rz)
          }
        })
        break
      }

      // ── 5. Carousel 6 ─────────────────────────────
      case 'carousel6': {
        g.rotation.y = t * 0.2
        g.position.y = smoothSin(t, 0.25, 0.05)
        for (let i = 0; i < 6; i++) {
          const ref = d[`p${i}`]
          if (ref) {
            const angle = (i / 6) * Math.PI * 2
            const r = 1.8
            const yOff = (i % 2 === 0 ? 0.2 : -0.2) + smoothSin(t + i * 0.8, 0.35, 0.06)
            ref.position.set(Math.sin(angle) * r, yOff, Math.cos(angle) * r)
            ref.rotation.y = angle
          }
        }
        break
      }

      // ── 6. Floating Phone + Laptop ─────────────────
      case 'floatingPhoneLaptop': {
        g.rotation.y = smoothSin(t, 0.15, 0.12)
        g.position.y = smoothSin(t, 0.2, 0.04)
        if (d.phone) {
          d.phone.position.set(-1.4 + smoothSin(t, 0.18, 0.08), smoothSin(t + 1, 0.25, 0.12), 0.3)
          d.phone.rotation.set(smoothSin(t, 0.2, 0.04), 0.2 + smoothSin(t, 0.15, 0.06), smoothSin(t + 0.5, 0.18, 0.03))
        }
        if (d.laptop) {
          d.laptop.position.set(1.1 + smoothSin(t + 0.5, 0.12, 0.06), 0.1 + smoothSin(t, 0.3, 0.08), -0.3)
          d.laptop.rotation.set(-0.15 + smoothSin(t + 1, 0.15, 0.03), -0.25 + smoothSin(t, 0.12, 0.05), smoothSin(t + 0.3, 0.15, 0.02))
        }
        break
      }

      // ── 7. Phone in Front of Laptop ────────────────
      case 'phoneInFrontLaptop': {
        const slideP = easeOutCubic(Math.min(1, t / 2.0))
        g.rotation.y = smoothSin(t, 0.12, 0.06)
        g.position.y = smoothSin(t, 0.2, 0.04)
        if (d.laptop) {
          d.laptop.position.set(0, 0.15, -0.5)
          d.laptop.rotation.set(-0.12 + smoothSin(t, 0.1, 0.02), smoothSin(t, 0.08, 0.03), 0)
        }
        if (d.phone) {
          const startX = 3.5
          const endX = 0.9
          d.phone.position.set(
            startX + (endX - startX) * slideP + smoothSin(t, 0.15, 0.03),
            -0.3 + smoothSin(t + 0.5, 0.2, 0.06),
            0.8
          )
          d.phone.rotation.set(smoothSin(t, 0.12, 0.02), -0.1 + smoothSin(t, 0.1, 0.04), smoothSin(t + 1, 0.15, 0.02))
        }
        break
      }

      // ── 8. Offset Circle Rotate ────────────────────
      case 'offsetCircleRotate': {
        g.rotation.y = t * 0.18
        g.position.y = smoothSin(t, 0.2, 0.04)
        g.rotation.x = smoothSin(t, 0.1, 0.03)
        const offsets = [0, 0.25, -0.15, 0.35, -0.3, 0.1]
        for (let i = 0; i < 6; i++) {
          const ref = d[`p${i}`]
          if (ref) {
            const angle = (i / 6) * Math.PI * 2
            const r = 1.5
            ref.position.set(Math.sin(angle) * r, offsets[i] + smoothSin(t + i * 0.6, 0.3, 0.04), Math.cos(angle) * r)
            ref.rotation.y = angle
            ref.rotation.z = smoothSin(t + i, 0.2, 0.02)
          }
        }
        break
      }

      // ── 9. Flat Scatter — phones lying face-up on a surface ──
      case 'flatScatter7': {
        g.rotation.x = 0.55
        g.rotation.y = smoothSin(t, 0.04, 0.05)
        g.position.y = 0.35 + smoothSin(t, 0.08, 0.03)

        const grid = [
          { x: -1.25, z: -0.75, rz: -0.18 },
          { x:  0.0,  z: -0.75, rz:  0.12 },
          { x:  1.25, z: -0.75, rz: -0.10 },
          { x: -1.85, z:  0.35, rz:  0.22 },
          { x: -0.62, z:  0.35, rz: -0.15 },
          { x:  0.62, z:  0.35, rz:  0.20 },
          { x:  1.85, z:  0.35, rz: -0.12 },
        ]

        for (let i = 0; i < 7; i++) {
          const ref = d[`p${i}`]
          if (!ref) continue
          const s = grid[i]
          ref.position.set(s.x, 0.01 * i, s.z)
          ref.rotation.set(-Math.PI / 2, 0, s.rz + smoothSin(t + i * 0.7, 0.03, 0.015))
          ref.scale.set(1, 1, 1)
        }
        break
      }
    }
  })

  const renderPhones = (count, scale = 0.3) => {
    if (animation === 'sideScroll10') {
      return Array.from({ length: count }, (_, i) => (
        <group key={i} ref={setRef(`p${i}`)} position={[(i - 4.5) * 0.8, Math.sin(i * 0.7) * 0.12, i % 2 === 0 ? 0 : -0.15]}>
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
    return Array.from({ length: count }, (_, i) => (
      <group key={i} ref={setRef(`p${i}`)}>
        <DeviceFrame {...phonePropsForSlot(i)} scale={scale} />
      </group>
    ))
  }

  switch (animation) {
    case 'sideScroll10':
      return <group ref={groupRef}>{renderPhones(10, 0.28)}</group>
    case 'angled3ZoomOut':
      return <group ref={groupRef}>{renderPhones(3, 0.33)}</group>
    case 'circle4Rotate':
      return <group ref={groupRef}>{renderPhones(4, 0.28)}</group>
    case 'angledZoom4':
      return <group ref={groupRef}>{renderPhones(4, 0.32)}</group>
    case 'carousel6':
      return <group ref={groupRef}>{renderPhones(6, 0.26)}</group>
    case 'offsetCircleRotate':
      return <group ref={groupRef}>{renderPhones(6, 0.27)}</group>
    case 'flatScatter7':
      return <group ref={groupRef}>{renderPhones(7, 0.30)}</group>
    case 'floatingPhoneLaptop':
    case 'phoneInFrontLaptop': {
      const phoneSrc = getSlotScreen(0)
      const laptopSrc = getSlotScreen(1)
      return (
        <group ref={groupRef}>
          <group ref={setRef('phone')}>
            <DeviceFrame
              type="iphone"
              screenUrl={phoneSrc?.url || null}
              screenFile={phoneSrc?.file || null}
              isVideo={phoneSrc?.isVideo || false}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              scale={0.32}
            />
          </group>
          <group ref={setRef('laptop')}>
            <DeviceFrame
              type="macbook"
              screenUrl={laptopSrc?.url || null}
              screenFile={laptopSrc?.file || null}
              isVideo={laptopSrc?.isVideo || false}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              scale={0.35}
              lidAngleRef={lidAngleRef}
            />
          </group>
        </group>
      )
    }
    default:
      return null
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
const TEXT_Z = 1.0
function CanvasTextOverlay({ overlay, currentTime, textSplit, textOnLeft }) {
  const meshRef = useRef()
  const ctRef = useRef(currentTime)
  ctRef.current = currentTime

  const TEX_W = 1024
  const TEX_H = 512
  const visibleWidth = useVisibleWidth(TEXT_Z)
  const { camera } = useThree()
  const visibleHeight = useMemo(() => {
    const dist = camera.position.z - TEXT_Z
    const vFov = (camera.fov * Math.PI) / 180
    return 2 * Math.tan(vFov / 2) * dist
  }, [camera.fov, camera.position.z])

  const split = textSplit || 0.5
  const margin = 0.08
  const textAreaWidth = visibleWidth * split * (1 - margin * 2)
  const textAreaHeight = visibleHeight * (1 - margin * 2)

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
    const canvas = texture.image
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, TEX_W, TEX_H)

    const pxSize = Math.max(24, Math.min(200, overlay.fontSize * 1.8))
    ctx.font = `600 ${pxSize}px "${overlay.fontFamily}", Inter, sans-serif`
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
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((l, i) => {
      ctx.fillText(l, TEX_W / 2, startY + i * lineH)
    })

    texture.needsUpdate = true
  }, [overlay.text, overlay.fontFamily, overlay.fontSize, overlay.color, texture])

  const meshW = textAreaWidth
  const meshH = textAreaWidth * (TEX_H / TEX_W)
  const clampedH = Math.min(meshH, textAreaHeight)
  const finalW = clampedH < meshH ? clampedH * (TEX_W / TEX_H) : meshW

  // Text always settles in its horizontal half (left or right)
  const textCenterX = textOnLeft
    ? -(visibleWidth / 2) + (visibleWidth * split / 2)
    : (visibleWidth / 2) - (visibleWidth * split / 2)

  useFrame(() => {
    if (!meshRef.current) return
    const t = ctRef.current
    const animDuration = 1.2
    const progress = easeOutCubic(Math.min(1, t / animDuration))

    let x, y
    const anim = overlay.animation
    if (anim === 'slideFromRight') {
      x = visibleWidth * 0.8 + (textCenterX - visibleWidth * 0.8) * progress
      y = overlay.posY || 0
    } else if (anim === 'slideFromLeft') {
      x = -visibleWidth * 0.8 + (textCenterX + visibleWidth * 0.8) * progress
      y = overlay.posY || 0
    } else if (anim === 'slideFromBottom') {
      const offY = -visibleHeight * 0.7
      y = offY + ((overlay.posY || 0) - offY) * progress
      x = textCenterX
    } else if (anim === 'slideFromTop') {
      const offY = visibleHeight * 0.7
      y = offY + ((overlay.posY || 0) - offY) * progress
      x = textCenterX
    } else {
      x = textCenterX
      y = overlay.posY || 0
    }

    meshRef.current.position.set(x, y, TEXT_Z)
  })

  return (
    <mesh ref={meshRef} position={[0, overlay.posY || 0, TEXT_Z]} renderOrder={10}>
      <planeGeometry args={[finalW, clampedH]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </mesh>
  )
}

function TextOverlays({ textOverlays, currentTime, textSplit, textOnLeft }) {
  if (!textOverlays || textOverlays.length === 0) return null

  return (
    <group>
      {textOverlays
        .filter((overlay) => {
          if (overlay.startTime == null || overlay.endTime == null) return true
          return currentTime >= overlay.startTime && currentTime <= overlay.endTime
        })
        .map((overlay) => {
          const localTime = overlay.startTime != null ? currentTime - overlay.startTime : currentTime
          return (
            <CanvasTextOverlay key={overlay.id} overlay={overlay} currentTime={localTime} textSplit={textSplit} textOnLeft={textOnLeft} />
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

  const logoUrl = logoId === 'whatsapp' ? '/logos/whatsapp.png' : '/logos/whatsapp-business.png'

  const texture = useMemo(() => {
    texLoadedRef.current = false
    const tex = new THREE.TextureLoader().load(logoUrl, () => { texLoadedRef.current = true })
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
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
    const opacity = easeOutCubic(fadeProgress) * 0.35

    const dist = Math.max(0.1, camera.position.z - LOGO_Z)
    const vFov = (camera.fov * Math.PI) / 180
    const visH = 2 * Math.tan(vFov / 2) * dist
    const baseSize = visH * 0.22
    const s = (0.7 + 0.3 * easeOutCubic(fadeProgress)) * baseSize

    grp.scale.set(s, s, 1)
    grp.position.set(0, -0.3, LOGO_Z)
    mat.opacity = opacity
  })

  return (
    <group ref={groupRef} scale={[0, 0, 0]}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={matRef} map={texture} transparent opacity={0} />
      </mesh>
    </group>
  )
}

// ── Draggable split divider ───────────────────────────────────
function SplitDivider({ textSplit, onSplitChange, visible, textOnLeft, onFlip }) {
  const dividerRef = useRef(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!visible) return

    const onMove = (e) => {
      if (!dragging.current) return
      const parent = dividerRef.current?.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const pct = (clientX - rect.left) / rect.width
      const clamped = Math.min(0.75, Math.max(0.25, pct))

      if (textOnLeft) {
        onSplitChange(+clamped.toFixed(2))
      } else {
        onSplitChange(+(1 - clamped).toFixed(2))
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
  }, [visible, onSplitChange, textOnLeft])

  if (!visible) return null

  const split = textSplit || 0.5
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
  screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, bgColor, bgGradient, showBase, isPlaying, canvasRef,
  textOverlays, currentTime, clipAnimationTime, activeTextAnim, aspectRatio, textSplit, onTextSplitChange, layoutFlipped, onFlipLayout, slotScreens,
  outroLogo, totalDuration,
}) {
  const tint = useTintedLights(bgColor)
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 })

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
  const defaultTextOnLeft = activeTextAnim === 'slideFromLeft' || activeTextAnim === 'slideFromBottom'
  const textOnLeft = layoutFlipped ? !defaultTextOnLeft : defaultTextOnLeft

  return (
    <div className="preview-scene" ref={containerRef}>
      <div className="preview-canvas-wrap" style={canvasStyle}>
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
        <CameraAnimator animation={animation} isPlaying={isPlaying} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 6, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 3, -2]} intensity={0.5} color={tint.fill} />
        <directionalLight position={[-5, 2, -5]} intensity={0.6} color={tint.rim1} />
        <directionalLight position={[5, 2, -5]} intensity={0.4} color={tint.rim2} />
        <pointLight position={[0, -3, 2]} intensity={0.25} color={tint.accent} distance={8} />
        <spotLight position={[0, 8, 3]} angle={0.35} penumbra={0.7} intensity={0.5} castShadow />

        <Suspense fallback={null}>
          {MULTI_DEVICE_ANIMS.has(animation) ? (
            <MultiDeviceScene
              screens={screens}
              activeScreen={activeScreen}
              animation={animation}
              clipAnimationTime={clipAnimationTime}
              videoSeekTime={videoSeekTime}
              timelinePlaying={timelinePlaying}
              outroAnimation={outroAnimation}
              clipDuration={clipDuration}
              slotScreens={slotScreens}
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
              activeTextAnim={activeTextAnim}
              textSplit={textSplit}
              textOnLeft={textOnLeft}
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
        <TextOverlays textOverlays={textOverlays} currentTime={currentTime} textSplit={textSplit} textOnLeft={textOnLeft} />
        {outroLogo && totalDuration > 3 && (
          <OutroLogo logoId={outroLogo} currentTime={currentTime} totalDuration={totalDuration} />
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
      <SplitDivider textSplit={textSplit} onSplitChange={onTextSplitChange} visible={showDivider} textOnLeft={textOnLeft} onFlip={onFlipLayout} />
      </div>

      {screens.length === 0 && (
        <div className="preview-empty">
          <p>Upload screens to see the 3D preview</p>
        </div>
      )}
    </div>
  )
}
