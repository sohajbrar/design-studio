import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function easeOut(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3) }
function easeBack(t) { t = Math.min(1, Math.max(0, t)); const c = 2.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
function sSin(t, f, a) { return Math.sin(t * f) * a }

function makeRoundedRect(w, h, r) {
  const shape = new THREE.Shape()
  const hw = w / 2, hh = h / 2
  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return shape
}

const PHONE_BODY_GEO = new THREE.ExtrudeGeometry(
  makeRoundedRect(0.55, 1.1, 0.09),
  { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }
)
PHONE_BODY_GEO.translate(0, 0, -0.02)

const PHONE_SCREEN_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.50, 1.04, 0.06))

const LAPTOP_BODY_GEO = new THREE.ExtrudeGeometry(
  makeRoundedRect(1.5, 1.0, 0.06),
  { depth: 0.03, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }
)
LAPTOP_BODY_GEO.translate(0, 0, -0.015)

const LAPTOP_SCREEN_GEO = new THREE.ShapeGeometry(makeRoundedRect(1.40, 0.90, 0.04))

function MiniPhone({ position, rotation, scale: s = 1, opacity = 1 }) {
  return (
    <group position={position} rotation={rotation} scale={[s, s, s]}>
      <mesh geometry={PHONE_BODY_GEO}>
        <meshPhysicalMaterial color="#78716a" roughness={0.2} metalness={0.6} clearcoat={1.0} clearcoatRoughness={0.15} emissive="#78716a" emissiveIntensity={0.08} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.021]} geometry={PHONE_SCREEN_GEO}>
        <meshBasicMaterial color="#1a1a1e" transparent opacity={opacity * 0.9} />
      </mesh>
    </group>
  )
}

function MiniLaptop({ position, rotation, scale: s = 1 }) {
  return (
    <group position={position} rotation={rotation} scale={[s, s, s]}>
      <mesh geometry={LAPTOP_BODY_GEO}>
        <meshPhysicalMaterial color="#a0a0a0" roughness={0.2} metalness={0.5} clearcoat={0.8} clearcoatRoughness={0.15} emissive="#a0a0a0" emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 0, 0.016]} geometry={LAPTOP_SCREEN_GEO}>
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
    </group>
  )
}

function SceneBg({ bgColor }) {
  const { scene } = useThree()
  scene.background = new THREE.Color(bgColor)
  return null
}

// ── Frame controller: drives invalidation for demand frameloop ─
function FrameController({ paused }) {
  const { invalidate } = useThree()
  const mounted = useRef(false)

  useEffect(() => {
    invalidate()
    mounted.current = true
  }, [invalidate])

  useEffect(() => {
    if (!paused) invalidate()
  }, [paused, invalidate])

  useFrame(() => {
    if (!paused) invalidate()
  })

  return null
}

// ── Single / dual device animations ──────────────────────────
function SingleDeviceAnim({ animation, deviceType, paused }) {
  const gRef = useRef()
  const tRef = useRef(2.5)
  const isBoth = deviceType === 'both'
  const isLaptop = deviceType === 'macbook'
  const isIpad = deviceType === 'ipad'

  useFrame((_, dt) => {
    if (!paused) tRef.current += dt
    const t = tRef.current
    const g = gRef.current
    if (!g) return

    g.position.set(0, 0, 0)
    g.rotation.set(0, 0, 0)
    g.scale.set(1, 1, 1)

    switch (animation) {
      case 'showcase':
        g.rotation.y = sSin(t, 0.25, 0.35)
        g.rotation.x = sSin(t, 0.18, 0.05)
        g.position.y = sSin(t, 0.35, 0.1)
        break
      case 'flip': {
        const p = easeBack(t / 2.2)
        g.rotation.y = (1 - p) * Math.PI * 1.2
        g.position.y = (1 - easeOut(t / 2.2)) * 1.2
        if (t > 2.6) {
          g.rotation.y = sSin(t - 2.6, 0.22, 0.3)
          g.position.y = sSin(t - 2.6, 0.3, 0.08)
        }
        break
      }
      case 'orbit':
        g.rotation.y = t * 0.4
        g.position.y = sSin(t, 0.5, 0.06)
        break
      case 'scroll':
        g.rotation.y = sSin(t, 0.18, 0.2)
        g.position.y = sSin(t, 0.2, 0.15)
        break
      case 'single': {
        g.rotation.y = sSin(t, 0.15, 0.4)
        g.position.y = sSin(t, 0.2, 0.1)
        const s = 1 + sSin(t, 0.2, 0.03)
        g.scale.set(s, s, s)
        break
      }
      case 'slideLeft': {
        const p = easeOut(Math.min(1, t / 1.8))
        g.position.x = -4 * (1 - p)
        g.rotation.y = sSin(t, 0.2, 0.08)
        break
      }
      case 'slideUp': {
        const p = easeOut(Math.min(1, t / 1.8))
        g.position.y = -4 * (1 - p) + sSin(t, 0.3, 0.06)
        break
      }
      case 'slideRightRotate': {
        const p = easeOut(Math.min(1, t / 2.0))
        g.position.x = 4 * (1 - p)
        g.rotation.y = (Math.PI * 0.5) * (1 - p) + sSin(t, 0.2, 0.08)
        break
      }
      case 'zoomBottomLeft': {
        const p = easeOut(Math.min(1, t / 2.2))
        const s = 1 + 0.5 * p
        g.scale.set(s, s, s)
        g.rotation.x = -0.25 * p + sSin(t, 0.15, 0.02)
        g.rotation.y = 0.35 * p + sSin(t, 0.12, 0.03)
        g.rotation.z = -0.12 * p
        g.position.y = sSin(t, 0.22, 0.03)
        g.position.z = 0.3 * p
        break
      }
      case 'laptopOpen': {
        g.rotation.y = sSin(t, 0.2, 0.15)
        g.position.y = sSin(t, 0.3, 0.05)
        break
      }
      case 'sideBySide': {
        g.rotation.y = sSin(t, 0.2, 0.2)
        g.position.y = sSin(t, 0.3, 0.06)
        break
      }
      default:
        g.rotation.y = sSin(t, 0.3, 0.3)
        g.position.y = sSin(t, 0.4, 0.08)
    }
  })

  return (
    <group ref={gRef}>
      {isLaptop ? (
        <MiniLaptop position={[0, 0, 0]} rotation={[0, 0, 0]} scale={0.7} />
      ) : isIpad ? (
        <MiniPhone position={[0, 0, 0]} rotation={[0, 0, 0]} scale={1.3} />
      ) : isBoth ? (
        <>
          <MiniPhone position={[-0.55, 0, 0]} rotation={[0, 0.15, 0]} />
          <MiniPhone position={[0.55, 0, 0]} rotation={[0, -0.15, 0]} />
        </>
      ) : (
        <MiniPhone position={[0, 0, 0]} />
      )}
    </group>
  )
}

// ── Multi-device animations ──────────────────────────────────
function MultiDeviceAnim({ animation, paused }) {
  const gRef = useRef()
  const refs = useRef({})
  const tRef = useRef(2.5)
  const setRef = (k) => (el) => { if (el) refs.current[k] = el }

  useFrame((_, dt) => {
    if (!paused) tRef.current += dt
    const t = tRef.current
    const g = gRef.current
    if (!g) return
    const d = refs.current

    g.position.set(0, 0, 0)
    g.rotation.set(0, 0, 0)
    g.scale.set(1, 1, 1)

    switch (animation) {
      case 'sideScroll10': {
        const halfSpan = (10 - 1) * 0.7 / 2
        const progress = Math.min(1, t / 8)
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
        g.position.x = -halfSpan * ease + halfSpan * (1 - ease)
        break
      }
      case 'angled3ZoomOut': {
        const s = 1.6 - 0.6 * easeOut(Math.min(1, t / 2.5))
        g.scale.set(s, s, s)
        g.rotation.y = sSin(t, 0.15, 0.08)
        g.position.y = sSin(t, 0.25, 0.05)
        break
      }
      case 'circle4Rotate': {
        const stepDur = 1.4
        const transDur = 0.5
        const rawStep = t / stepDur
        const stepIdx = Math.floor(rawStep)
        const frac = rawStep - stepIdx
        const snapFrac = frac < (transDur / stepDur) ? easeOut(frac / (transDur / stepDur)) : 1
        const smoothStep = Math.min(stepIdx + snapFrac, 4)
        g.rotation.y = (smoothStep / 4) * Math.PI * 2
        g.rotation.x = 0.08
        for (let i = 0; i < 4; i++) {
          const r = d[`p${i}`]
          if (r) {
            const a = (i / 4) * Math.PI * 2
            r.position.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5)
            r.rotation.y = a
          }
        }
        break
      }
      case 'angledZoom4': {
        const p = easeOut(Math.min(1, t / 2.0))
        g.rotation.x = 0.35 * p + sSin(t, 0.12, 0.02)
        g.rotation.y = -0.15 * p + sSin(t, 0.1, 0.06)
        g.position.y = -0.2 * p + sSin(t, 0.2, 0.04)
        const span = 3.0
        for (let i = 0; i < 4; i++) {
          const r = d[`p${i}`]
          if (!r) continue
          const frac = i / 3
          const x = -span / 2 + frac * span
          const z = -0.4 + 0.4 * Math.sin(frac * Math.PI)
          const y = 0.1 + 0.1 * Math.sin(frac * Math.PI)
          const ry = 0.15 - frac * 0.3
          r.position.set(x, y + sSin(t + i * 0.5, 0.3, 0.04), z)
          r.rotation.set(0, ry, 0.04 - frac * 0.08)
        }
        break
      }
      case 'carousel6': {
        g.rotation.y = t * 0.2
        g.position.y = sSin(t, 0.25, 0.05)
        const cR = 1.8
        for (let i = 0; i < 6; i++) {
          const r = d[`p${i}`]
          if (!r) continue
          const a = (i / 6) * Math.PI * 2
          const yOff = (i % 2 === 0 ? 0.2 : -0.2) + sSin(t + i * 0.8, 0.35, 0.06)
          r.position.set(Math.sin(a) * cR, yOff, Math.cos(a) * cR)
          r.rotation.y = a
        }
        break
      }
      case 'floatingPhoneLaptop': {
        g.rotation.y = sSin(t, 0.15, 0.12)
        g.position.y = sSin(t, 0.2, 0.04)
        if (d.phone) {
          d.phone.position.set(-1.4 + sSin(t, 0.18, 0.08), sSin(t + 1, 0.25, 0.12), 0.3)
          d.phone.rotation.set(sSin(t, 0.2, 0.04), 0.2 + sSin(t, 0.15, 0.06), sSin(t + 0.5, 0.18, 0.03))
        }
        if (d.laptop) {
          d.laptop.position.set(1.1 + sSin(t + 0.5, 0.12, 0.06), 0.1 + sSin(t, 0.3, 0.08), -0.3)
          d.laptop.rotation.set(-0.15 + sSin(t + 1, 0.15, 0.03), -0.25 + sSin(t, 0.12, 0.05), sSin(t + 0.3, 0.15, 0.02))
        }
        break
      }
      case 'phoneInFrontLaptop': {
        const sp = easeOut(Math.min(1, t / 2.0))
        g.rotation.y = sSin(t, 0.12, 0.06)
        g.position.y = sSin(t, 0.2, 0.04)
        if (d.laptop) {
          d.laptop.position.set(0, 0.15, -0.5)
          d.laptop.rotation.set(-0.12 + sSin(t, 0.1, 0.02), sSin(t, 0.08, 0.03), 0)
        }
        if (d.phone) {
          d.phone.position.set(3.5 + (0.9 - 3.5) * sp + sSin(t, 0.15, 0.03), -0.3 + sSin(t + 0.5, 0.2, 0.06), 0.8)
          d.phone.rotation.set(sSin(t, 0.12, 0.02), -0.1 + sSin(t, 0.1, 0.04), sSin(t + 1, 0.15, 0.02))
        }
        break
      }
      case 'offsetCircleRotate': {
        g.rotation.y = t * 0.18
        g.rotation.x = sSin(t, 0.1, 0.03)
        g.position.y = sSin(t, 0.2, 0.04)
        const oR = 1.5
        for (let i = 0; i < 6; i++) {
          const r = d[`p${i}`]
          if (!r) continue
          const a = (i / 6) * Math.PI * 2
          const yOff = (i % 3 === 0) ? 0.25 : (i % 3 === 1) ? -0.15 : 0.1
          r.position.set(Math.sin(a) * oR, yOff + sSin(t + i * 0.6, 0.3, 0.04), Math.cos(a) * oR)
          r.rotation.y = a
          r.rotation.z = sSin(t + i, 0.2, 0.02)
        }
        break
      }
      case 'flatScatter7': {
        const introEnd = 2.0, settleEnd = 3.5
        const startRX = 0.4, topRX = 1.25
        if (t < introEnd) {
          const p = easeOut(t / introEnd)
          g.rotation.x = startRX + (topRX - startRX) * p
          g.rotation.y = 0.2 * (1 - p)
          g.position.y = 0.45 - 0.1 * p
        } else if (t < settleEnd) {
          g.rotation.x = topRX + sSin(t, 0.06, 0.015)
          g.rotation.y = sSin(t, 0.04, 0.02)
          g.position.y = 0.35 + sSin(t, 0.08, 0.02)
        } else {
          const orbitT = t - settleEnd
          g.rotation.x = topRX + sSin(t, 0.06, 0.015)
          g.rotation.y = orbitT * 0.12 + sSin(t, 0.04, 0.02)
          g.position.y = 0.35 + sSin(t, 0.08, 0.02)
        }
        const sp = 0.74
        const cols = 4, rows = 2
        const offX = -(cols - 1) * sp / 2, offZ = -(rows - 1) * sp / 2
        let idx = 0
        for (let row = 0; row < rows; row++) {
          const items = Math.min(cols, 7 - idx)
          const colStart = Math.floor((cols - items) / 2)
          for (let c = 0; c < items; c++) {
            const col = colStart + c
            const r = d[`p${idx}`]
            if (r) {
              r.position.set(offX + col * sp, 0, offZ + row * sp)
              r.rotation.set(-Math.PI / 2, 0, (row + col) % 2 === 1 ? Math.PI / 2 : 0)
            }
            idx++
          }
        }
        break
      }
    }
  })

  const phones = (n, sc = 0.85) => {
    if (animation === 'sideScroll10') {
      return Array.from({ length: n }, (_, i) => (
        <group key={i} ref={setRef(`p${i}`)} position={[(i - (n - 1) / 2) * 0.7, 0, 0]}>
          <MiniPhone scale={sc} />
        </group>
      ))
    }
    if (animation === 'angled3ZoomOut') {
      return [[-1.1, 0, -0.2], [0, 0, 0.1], [1.1, 0, -0.2]].map((p, i) => (
        <group key={i} ref={setRef(`p${i}`)} position={p} rotation={[0, i === 0 ? -0.3 : i === 2 ? 0.3 : 0, 0]}>
          <MiniPhone scale={sc} />
        </group>
      ))
    }
    return Array.from({ length: n }, (_, i) => (
      <group key={i} ref={setRef(`p${i}`)}>
        <MiniPhone scale={sc} />
      </group>
    ))
  }

  switch (animation) {
    case 'sideScroll10':
      return <group ref={gRef}>{phones(10, 0.75)}</group>
    case 'angled3ZoomOut':
      return <group ref={gRef}>{phones(3, 0.9)}</group>
    case 'circle4Rotate':
      return <group ref={gRef}>{phones(4, 0.75)}</group>
    case 'angledZoom4':
      return <group ref={gRef}>{phones(4, 0.85)}</group>
    case 'carousel6':
      return <group ref={gRef}>{phones(6, 0.7)}</group>
    case 'offsetCircleRotate':
      return <group ref={gRef}>{phones(6, 0.72)}</group>
    case 'flatScatter7':
      return <group ref={gRef}>{phones(7, 0.8)}</group>
    case 'floatingPhoneLaptop':
    case 'phoneInFrontLaptop':
      return (
        <group ref={gRef}>
          <group ref={setRef('phone')}><MiniPhone scale={0.85} /></group>
          <group ref={setRef('laptop')}><MiniLaptop scale={0.55} /></group>
        </group>
      )
    default:
      return null
  }
}

const MULTI = new Set([
  'sideScroll10', 'angled3ZoomOut', 'circle4Rotate', 'angledZoom4',
  'carousel6', 'floatingPhoneLaptop', 'phoneInFrontLaptop', 'offsetCircleRotate',
  'flatScatter7',
])

export default function MiniPreviewCanvas({ animation, bgColor, deviceType, paused = false }) {
  const glRef = useRef(null)

  const onCreated = useCallback(({ gl }) => { glRef.current = gl }, [])

  useEffect(() => () => {
    const gl = glRef.current
    if (gl) {
      gl.dispose()
      gl.forceContextLoss?.()
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0, 2.8], fov: 45 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
      dpr={1}
      frameloop="demand"
      style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      onCreated={onCreated}
    >
      <FrameController paused={paused} />
      <SceneBg bgColor={bgColor} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />
      <directionalLight position={[-2, 2, -1]} intensity={0.4} />
      {MULTI.has(animation) ? (
        <MultiDeviceAnim animation={animation} paused={paused} />
      ) : (
        <SingleDeviceAnim animation={animation} deviceType={deviceType} paused={paused} />
      )}
    </Canvas>
  )
}
