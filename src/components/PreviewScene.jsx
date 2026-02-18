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

// ── Main animated devices ─────────────────────────────────────
function AnimatedDevices({ screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, isPlaying, currentTime, clipAnimationTime, activeTextAnim }) {
  const groupRef = useRef()
  const iphoneRef = useRef()
  const androidRef = useRef()
  const ipadRef = useRef()
  const macbookRef = useRef()
  const currentZoomRef = useRef(1)
  const lidAngleRef = useRef(Math.PI / 2)
  const textOffsetRef = useRef({ x: 0, y: 0 })
  const ctRef = useRef(clipAnimationTime || 0)
  ctRef.current = clipAnimationTime || 0

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
    const outroDur = 1.8
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
            group.rotation.y = Math.PI * 1.2 * p
            group.position.y = 1.2 * p
            group.rotation.x = 0.3 * p
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

    // Offset device based on active text animation direction
    // Text gets 30% of screen, device shifts into the remaining 70%
    let targetOffX = 0
    let targetOffY = 0
    const shift = 0.7
    switch (activeTextAnim) {
      case 'slideFromTop': targetOffY = shift; break
      case 'slideFromBottom': targetOffY = -shift; break
      case 'slideFromLeft': targetOffX = -shift; break
      case 'slideFromRight': targetOffX = shift; break
    }
    textOffsetRef.current.x += (targetOffX - textOffsetRef.current.x) * 0.06
    textOffsetRef.current.y += (targetOffY - textOffsetRef.current.y) * 0.06
    group.position.x += textOffsetRef.current.x
    group.position.y += textOffsetRef.current.y
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

// ── Ambient particles ─────────────────────────────────────────
function Particles({ color = '#21C063' }) {
  const pointsRef = useRef()
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const count = 100
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return geo
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.012
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.008) * 0.06
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial size={0.018} color={color} transparent opacity={0.2} sizeAttenuation />
    </points>
  )
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

// ── Canvas-texture text overlay ───────────────────────────────
function CanvasTextOverlay({ overlay, currentTime }) {
  const meshRef = useRef()
  const ctRef = useRef(currentTime)
  ctRef.current = currentTime

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [])

  useEffect(() => {
    const canvas = texture.image
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const pxSize = Math.max(24, Math.min(200, overlay.fontSize * 1.8))
    ctx.font = `600 ${pxSize}px "${overlay.fontFamily}", Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = overlay.color
    ctx.fillText(overlay.text || '', canvas.width / 2, canvas.height / 2)

    texture.needsUpdate = true
  }, [overlay.text, overlay.fontFamily, overlay.fontSize, overlay.color, texture])

  useFrame(() => {
    if (!meshRef.current) return
    const t = ctRef.current
    const animDuration = 1.2
    const progress = easeOutCubic(Math.min(1, t / animDuration))
    const baseY = overlay.posY
    let offX = 0
    let offY = 0

    switch (overlay.animation) {
      case 'slideFromRight': offX = -(progress * 2); break
      case 'slideFromLeft': offX = progress * 2; break
      case 'slideFromBottom': offY = progress * 1; break
      case 'slideFromTop': offY = -(progress * 1); break
    }

    meshRef.current.position.set(offX, baseY + offY, -1.2)
  })

  const aspect = 1024 / 256
  const height = overlay.fontSize * 0.012
  const width = height * aspect

  return (
    <mesh ref={meshRef} position={[0, overlay.posY, -1.2]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}

function TextOverlays({ textOverlays, currentTime }) {
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
            <CanvasTextOverlay key={overlay.id} overlay={overlay} currentTime={localTime} />
          )
        })}
    </group>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function PreviewScene({
  screens, activeScreen, zoomLevel, videoSeekTime, timelinePlaying, deviceType, animation, outroAnimation, clipDuration, bgColor, bgGradient, showBase, isPlaying, canvasRef,
  textOverlays, currentTime, clipAnimationTime, activeTextAnim,
}) {
  const tint = useTintedLights(bgColor)

  return (
    <div className="preview-scene">
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
          />
          <Particles color={tint.accent} />
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
        <TextOverlays textOverlays={textOverlays} currentTime={currentTime} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>

      {screens.length === 0 && (
        <div className="preview-empty">
          <p>Upload screens to see the 3D preview</p>
        </div>
      )}
    </div>
  )
}
