import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { parseGIF, decompressFrames } from 'gifuct-js'

const KEYBOARD_TEX = (() => {
  const w = 1024, h = 380
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, w, h)

  const gap = 4, rad = 5, pad = 14

  function key(x, y, kw, kh, label, labelSize) {
    const g = ctx.createLinearGradient(x, y, x, y + kh)
    g.addColorStop(0, '#3d3d3d')
    g.addColorStop(1, '#2a2a2a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x + rad, y)
    ctx.lineTo(x + kw - rad, y)
    ctx.quadraticCurveTo(x + kw, y, x + kw, y + rad)
    ctx.lineTo(x + kw, y + kh - rad)
    ctx.quadraticCurveTo(x + kw, y + kh, x + kw - rad, y + kh)
    ctx.lineTo(x + rad, y + kh)
    ctx.quadraticCurveTo(x, y + kh, x, y + kh - rad)
    ctx.lineTo(x, y + rad)
    ctx.quadraticCurveTo(x, y, x + rad, y)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.8
    ctx.stroke()

    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = `${labelSize || 11}px -apple-system, "Helvetica Neue", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x + kw / 2, y + kh / 2 + 1)
    }
  }

  const usable = w - 2 * pad
  const mainH = 46
  let y = pad

  const fnLabels = ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', '⏏']
  const fnH = 26
  const fnCount = 14
  const fnW = (usable - (fnCount - 1) * gap) / fnCount
  for (let i = 0; i < fnCount; i++) key(pad + i * (fnW + gap), y, fnW, fnH, fnLabels[i], 9)

  y += fnH + gap + 3
  const numLabels = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '⌫']
  const delW = fnW * 1.55
  const numW = (usable - delW - 13 * gap) / 13
  for (let i = 0; i < 13; i++) key(pad + i * (numW + gap), y, numW, mainH, numLabels[i], 14)
  key(w - pad - delW, y, delW, mainH, numLabels[13], 14)

  y += mainH + gap
  const tabW = fnW * 1.55
  const qLabels = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\']
  key(pad, y, tabW, mainH, '⇥', 12)
  const qW = (usable - tabW - gap - 12 * gap) / 13
  for (let i = 0; i < 13; i++) key(pad + tabW + gap + i * (qW + gap), y, qW, mainH, qLabels[i], 14)

  y += mainH + gap
  const capsW = fnW * 1.85
  const retW = fnW * 1.85
  const aLabels = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"]
  key(pad, y, capsW, mainH, '⇪', 12)
  const aW = (usable - capsW - retW - 12 * gap) / 11
  for (let i = 0; i < 11; i++) key(pad + capsW + gap + i * (aW + gap), y, aW, mainH, aLabels[i], 14)
  key(w - pad - retW, y, retW, mainH, '↵', 16)

  y += mainH + gap
  const shL = fnW * 2.35
  const shR = fnW * 2.35
  const zLabels = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
  key(pad, y, shL, mainH, '⇧', 16)
  const zW = (usable - shL - shR - 11 * gap) / 10
  for (let i = 0; i < 10; i++) key(pad + shL + gap + i * (zW + gap), y, zW, mainH, zLabels[i], 14)
  key(w - pad - shR, y, shR, mainH, '⇧', 16)

  y += mainH + gap
  const modW = fnW * 1.1
  const arrowW = fnW * 0.95
  const arrowH = (mainH - gap) / 2
  const spaceW = usable - 4 * modW - 2 * modW - 3 * arrowW - 9 * gap
  const modLabels = ['fn', '⌃', '⌥', '⌘']
  let x = pad
  for (let i = 0; i < 4; i++) { key(x, y, modW, mainH, modLabels[i], 12); x += modW + gap }
  key(x, y, spaceW, mainH, '', 0); x += spaceW + gap
  key(x, y, modW, mainH, '⌘', 12); x += modW + gap
  key(x, y, modW, mainH, '⌥', 12); x += modW + gap

  key(x, y, arrowW, arrowH, '▲', 8)
  key(x, y + arrowH + gap, arrowW, arrowH, '▼', 8)
  x += arrowW + gap
  key(x, y + arrowH + gap, arrowW, arrowH, '◀', 8)
  x += arrowW + gap
  key(x, y, arrowW, arrowH, '', 0)
  key(x, y + arrowH + gap, arrowW, arrowH, '▶', 8)

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
})()

const SHADOW_TEX = (() => {
  const s = 128
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.5)')
  g.addColorStop(0.35, 'rgba(0,0,0,0.28)')
  g.addColorStop(0.65, 'rgba(0,0,0,0.08)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
})()

const IPHONE_ASPECT = 19.5 / 9
const ANDROID_ASPECT = 19.5 / 9
const IPAD_ASPECT = 4.3 / 3
const MACBOOK_ASPECT = 10 / 16

const DEVICE_CONFIGS = {
  iphone: {
    width: 2.4,
    height: 2.4 * IPHONE_ASPECT,
    depth: 0.2,
    cornerRadius: 0.42,
    screenInset: 0.045,
    bezelColor: '#0a0a0a',
    frameColor: '#8a8078',
    sideColor: '#9a9088',
    dynamicIsland: true,
  },
  android: {
    width: 2.3,
    height: 2.3 * ANDROID_ASPECT,
    depth: 0.18,
    cornerRadius: 0.30,
    screenInset: 0.05,
    bezelColor: '#0a0a0a',
    frameColor: '#2a2a2a',
    sideColor: '#444444',
    punchHole: true,
  },
  ipad: {
    width: 3.6,
    height: 3.6 * IPAD_ASPECT,
    depth: 0.14,
    cornerRadius: 0.36,
    screenInset: 0.06,
    bezelColor: '#0a0a0a',
    frameColor: '#8a8078',
    sideColor: '#9a9088',
  },
  macbook: {
    width: 5.6,
    height: 5.6 * MACBOOK_ASPECT,
    depth: 0.06,
    cornerRadius: 0.18,
    screenInset: 0.12,
    bezelColor: '#0a0a0a',
    frameColor: '#a0a0a0',
    sideColor: '#b0b0b0',
  },
  media: {
    width: 2.8,
    height: 2.8 * IPHONE_ASPECT,
    depth: 0.06,
    cornerRadius: 0.22,
    screenInset: 0,
    bezelColor: '#1a1a1a',
    frameColor: '#c0c0c0',
    sideColor: '#d0d0d0',
  },
}

function createRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

/**
 * Loads texture from a File object using createImageBitmap (bypasses all URL/CORS issues).
 * For videos, uses blob URL with HTMLVideoElement.
 * Returns refs that are updated imperatively — no React state involved.
 *
 * Uses a double-buffer strategy: the old texture stays visible until the new
 * one is fully loaded, eliminating any black-frame flash between clips.
 */
function useScreenTextureRef(screenFile, screenUrl, isVideo, screenAspect, isGif) {
  const textureRef = useRef(null)
  const loadedRef = useRef(false)
  const videoRef = useRef(null)
  const gifRef = useRef(null)
  const prevTextureRef = useRef(null)
  const prevVideoRef = useRef(null)

  // Final cleanup on unmount only
  useEffect(() => {
    return () => {
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = '' }
      if (prevVideoRef.current) { prevVideoRef.current.pause(); prevVideoRef.current.src = '' }
      if (textureRef.current) textureRef.current.dispose()
      if (prevTextureRef.current) prevTextureRef.current.dispose()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Double-buffer: keep old texture alive so the screen isn't blank while loading
    prevTextureRef.current = textureRef.current
    prevVideoRef.current = videoRef.current
    videoRef.current = null
    gifRef.current = null

    // Pause old video but keep its last frame visible via the texture
    if (prevVideoRef.current) {
      prevVideoRef.current.pause()
    }

    if (!screenFile && !screenUrl) {
      disposeOld()
      textureRef.current = null
      loadedRef.current = false
      return
    }

    function disposeOld() {
      if (prevVideoRef.current) {
        prevVideoRef.current.pause()
        prevVideoRef.current.src = ''
        prevVideoRef.current = null
      }
      if (prevTextureRef.current && prevTextureRef.current !== textureRef.current) {
        prevTextureRef.current.dispose()
        prevTextureRef.current = null
      }
    }

    function commitTexture(tex, video) {
      if (cancelled) {
        tex.dispose()
        if (video) { video.pause(); video.src = '' }
        return
      }
      disposeOld()
      textureRef.current = tex
      if (video) videoRef.current = video
      loadedRef.current = true
    }

    if (isGif && (screenFile || screenUrl)) {
      const bufferPromise = screenFile
        ? screenFile.arrayBuffer()
        : fetch(screenUrl).then(r => r.arrayBuffer())

      bufferPromise.then(buffer => {
        if (cancelled) return
        const gif = parseGIF(new Uint8Array(buffer).buffer)
        const frames = decompressFrames(gif, true)
        if (!frames.length) return

        const gifW = gif.lsd.width
        const gifH = gif.lsd.height

        const targetW = 540
        const targetH = Math.round(targetW / screenAspect)
        const texCanvas = document.createElement('canvas')
        texCanvas.width = targetW
        texCanvas.height = targetH
        const texCtx = texCanvas.getContext('2d')

        const compCanvas = document.createElement('canvas')
        compCanvas.width = gifW
        compCanvas.height = gifH
        const compCtx = compCanvas.getContext('2d')

        const patchCanvas = document.createElement('canvas')
        const patchCtx = patchCanvas.getContext('2d')

        const frameDataList = frames.map(f => {
          const imageData = new ImageData(
            new Uint8ClampedArray(f.patch),
            f.dims.width,
            f.dims.height
          )
          return {
            imageData,
            dims: f.dims,
            delay: f.delay <= 0 ? 100 : f.delay,
            disposalType: f.disposalType,
          }
        })

        const imgAspect = gifW / gifH
        const canvasAspect = targetW / targetH
        let sx, sy, sw, sh
        if (imgAspect > canvasAspect) {
          sh = gifH; sw = gifH * canvasAspect
          sx = (gifW - sw) / 2; sy = 0
        } else {
          sw = gifW; sh = gifW / canvasAspect
          sx = 0; sy = (gifH - sh) / 2
        }

        const first = frameDataList[0]
        patchCanvas.width = first.dims.width
        patchCanvas.height = first.dims.height
        patchCtx.putImageData(first.imageData, 0, 0)
        compCtx.drawImage(patchCanvas, first.dims.left, first.dims.top)
        texCtx.drawImage(compCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH)

        gifRef.current = {
          frames: frameDataList,
          compCanvas, compCtx,
          patchCanvas, patchCtx,
          texCtx,
          sx, sy, sw, sh, targetW, targetH,
          currentFrame: 0,
          lastFrameTime: performance.now(),
          totalFrames: frameDataList.length,
        }

        const tex = new THREE.CanvasTexture(texCanvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.needsUpdate = true
        commitTexture(tex, null)
      }).catch(err => {
        console.error('[DeviceFrame] GIF parsing failed:', err)
      })
    } else if (isVideo && screenUrl) {
      const video = document.createElement('video')
      video.src = screenUrl
      video.loop = false
      video.muted = true
      video.playsInline = true
      video.autoplay = false
      video.preload = 'auto'

      video.addEventListener('loadeddata', () => {
        const tex = new THREE.VideoTexture(video)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        commitTexture(tex, video)
      })
      video.load()
    } else if (screenFile) {
      createImageBitmap(screenFile)
        .then((bitmap) => {
          const targetW = 1080
          const targetH = Math.round(targetW / screenAspect)
          const canvas = document.createElement('canvas')
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d')

          const imgAspect = bitmap.width / bitmap.height
          const canvasAspect = targetW / targetH
          let sx, sy, sw, sh
          if (imgAspect > canvasAspect) {
            sh = bitmap.height
            sw = bitmap.height * canvasAspect
            sx = (bitmap.width - sw) / 2
            sy = 0
          } else {
            sw = bitmap.width
            sh = bitmap.width / canvasAspect
            sx = 0
            sy = (bitmap.height - sh) / 2
          }
          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH)
          bitmap.close()

          const tex = new THREE.CanvasTexture(canvas)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.minFilter = THREE.LinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.generateMipmaps = false
          tex.needsUpdate = true
          commitTexture(tex, null)
        })
        .catch((err) => {
          console.error('[DeviceFrame] createImageBitmap failed:', err)
        })
    }

    return () => {
      cancelled = true
    }
  }, [screenFile, screenUrl, isVideo, isGif])

  return { textureRef, loadedRef, videoRef, gifRef }
}

export default function DeviceFrame({
  type = 'iphone',
  screenUrl,
  screenFile,
  isVideo = false,
  isGif = false,
  videoSeekTime = 0,
  timelinePlaying = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  lidAngleRef,
  showShadow = false,
}) {
  const config = DEVICE_CONFIGS[type]
  const screenW = config.width - config.screenInset * 2
  const screenH = config.height - config.screenInset * 2

  const screenMeshRef = useRef()
  const lastSeekRef = useRef(-1)
  const lidPivotRef = useRef()
  const screenAspect = screenW / screenH
  const { textureRef, loadedRef, videoRef, gifRef } = useScreenTextureRef(screenFile, screenUrl, isVideo, screenAspect, isGif)

  // Rounded body geometry
  const bodyGeo = useMemo(() => {
    const shape = createRoundedRectShape(config.width, config.height, config.cornerRadius)
    return new THREE.ExtrudeGeometry(shape, {
      depth: config.depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    })
  }, [config])

  // Rounded screen geometry with normalized UVs so texture fills the screen
  const screenGeo = useMemo(() => {
    const innerRadius = Math.max(0.08, config.cornerRadius - config.screenInset - 0.01)
    const shape = createRoundedRectShape(screenW, screenH, innerRadius)
    const geo = new THREE.ShapeGeometry(shape)

    // Normalize UVs to 0-1 range so the texture stretches to fill the screen
    const uvAttr = geo.attributes.uv
    const positions = geo.attributes.position
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(
        i,
        (positions.getX(i) - minX) / rangeX,
        (positions.getY(i) - minY) / rangeY
      )
    }
    uvAttr.needsUpdate = true
    return geo
  }, [screenW, screenH, config])

  // Imperatively apply texture every frame — bypasses React reconciler entirely
  useFrame(() => {
    if (!screenMeshRef.current) return
    const mat = screenMeshRef.current.material

    if (loadedRef.current && textureRef.current) {
      if (mat.map !== textureRef.current) {
        mat.map = textureRef.current
        mat.color.set('#ffffff')
        mat.needsUpdate = true
      }
      if (isVideo && textureRef.current.isVideoTexture) {
        textureRef.current.needsUpdate = true
      }
      if (isGif && gifRef.current) {
        const g = gifRef.current
        if (timelinePlaying) {
          g.paused = false
          const now = performance.now()
          const elapsed = now - g.lastFrameTime
          if (elapsed >= g.frames[g.currentFrame].delay) {
            const prev = g.frames[g.currentFrame]
            if (prev.disposalType === 2) {
              g.compCtx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height)
            } else if (prev.disposalType === 3 && g.savedState) {
              g.compCtx.putImageData(g.savedState, 0, 0)
            }
            g.currentFrame = (g.currentFrame + 1) % g.totalFrames
            if (g.currentFrame === 0) {
              g.compCtx.clearRect(0, 0, g.compCanvas.width, g.compCanvas.height)
            }
            const frame = g.frames[g.currentFrame]
            if (frame.disposalType === 3) {
              g.savedState = g.compCtx.getImageData(0, 0, g.compCanvas.width, g.compCanvas.height)
            }
            g.patchCanvas.width = frame.dims.width
            g.patchCanvas.height = frame.dims.height
            g.patchCtx.putImageData(frame.imageData, 0, 0)
            g.compCtx.drawImage(g.patchCanvas, frame.dims.left, frame.dims.top)
            g.texCtx.clearRect(0, 0, g.targetW, g.targetH)
            g.texCtx.drawImage(g.compCanvas, g.sx, g.sy, g.sw, g.sh, 0, 0, g.targetW, g.targetH)
            g.lastFrameTime = now
            textureRef.current.needsUpdate = true
          }
        } else if (!g.paused) {
          g.paused = true
          g.currentFrame = 0
          g.compCtx.clearRect(0, 0, g.compCanvas.width, g.compCanvas.height)
          const first = g.frames[0]
          g.patchCanvas.width = first.dims.width
          g.patchCanvas.height = first.dims.height
          g.patchCtx.putImageData(first.imageData, 0, 0)
          g.compCtx.drawImage(g.patchCanvas, first.dims.left, first.dims.top)
          g.texCtx.clearRect(0, 0, g.targetW, g.targetH)
          g.texCtx.drawImage(g.compCanvas, g.sx, g.sy, g.sw, g.sh, 0, 0, g.targetW, g.targetH)
          textureRef.current.needsUpdate = true
        }
      }
    }

    // Sync video playback with timeline playhead
    const video = videoRef.current
    if (video && isVideo && loadedRef.current) {
      if (timelinePlaying) {
        if (video.paused) {
          video.currentTime = videoSeekTime || 0
          video.play().catch(() => {})
          lastSeekRef.current = -1
        }
      } else {
        if (!video.paused) video.pause()
        const seekTo = videoSeekTime || 0
        if (Math.abs(lastSeekRef.current - seekTo) > 0.03) {
          video.currentTime = seekTo
          lastSeekRef.current = seekTo
        }
      }
    }

    // Animate MacBook lid angle from AnimatedDevices
    if (lidPivotRef.current && lidAngleRef) {
      const angle = lidAngleRef.current != null ? lidAngleRef.current : Math.PI / 2
      lidPivotRef.current.rotation.x = angle - Math.PI / 2
    }
  })

  // Body front face is at z = depth/2 in group space
  // Tiny offset prevents z-fighting with the body
  const frontZ = config.depth / 2 + 0.023

  // MacBook needs a base/keyboard section — same size as lid so they align when closed
  const macbookBaseGeo = useMemo(() => {
    if (type !== 'macbook') return null
    const shape = createRoundedRectShape(config.width, config.height, config.cornerRadius)
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    })
  }, [type, config])

  const macbookHingeGeo = useMemo(() => {
    if (type !== 'macbook') return null
    return new THREE.CylinderGeometry(0.03, 0.03, config.width + 0.1, 16)
  }, [type, config])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ── MacBook Pro: base + hinge + upright lid ── */}
      {type === 'macbook' ? (
        <group>
          {/* Keyboard base - flat, same size as lid, extending forward from the hinge */}
          <group position={[0, -config.height / 2, config.height / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={macbookBaseGeo} position={[0, 0, -0.02]}>
              <meshPhysicalMaterial color={config.frameColor} metalness={0.88} roughness={0.12} clearcoat={0.6} clearcoatRoughness={0.3} />
            </mesh>
            {/* Trackpad */}
            <mesh position={[0, -config.height * 0.22, 0.025]}>
              <shapeGeometry args={[createRoundedRectShape(1.6, 1.05, 0.08)]} />
              <meshStandardMaterial color="#8a8a8a" metalness={0.55} roughness={0.35} />
            </mesh>
            {/* Keyboard area */}
            <mesh position={[0, config.height * 0.14, 0.025]}>
              <planeGeometry args={[config.width - 0.3, config.height * 0.52]} />
              <meshBasicMaterial map={KEYBOARD_TEX} toneMapped={false} />
            </mesh>
            {/* Speaker grills — left */}
            <mesh position={[-config.width * 0.37, config.height * 0.14, 0.024]}>
              <planeGeometry args={[0.35, config.height * 0.42]} />
              <meshBasicMaterial color="#252525" transparent opacity={0.6} />
            </mesh>
            {/* Speaker grills — right */}
            <mesh position={[config.width * 0.37, config.height * 0.14, 0.024]}>
              <planeGeometry args={[0.35, config.height * 0.42]} />
              <meshBasicMaterial color="#252525" transparent opacity={0.6} />
            </mesh>
          </group>

          {/* Hinge cylinder at the junction */}
          <mesh geometry={macbookHingeGeo} position={[0, -config.height / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <meshPhysicalMaterial color={config.sideColor} metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Screen lid - pivots at hinge for open/close animations */}
          <group ref={lidPivotRef} position={[0, -config.height / 2, 0]}>
            <group position={[0, config.height / 2, 0]}>
              <mesh geometry={bodyGeo} position={[0, 0, -config.depth / 2]}>
                <meshPhysicalMaterial color={config.frameColor} metalness={0.88} roughness={0.12} clearcoat={0.6} clearcoatRoughness={0.3} />
              </mesh>
              <mesh position={[0, 0, frontZ - 0.002]}>
                <shapeGeometry args={[createRoundedRectShape(screenW + 0.02, screenH + 0.02, Math.max(0.08, config.cornerRadius - config.screenInset + 0.005))]} />
                <meshStandardMaterial color={config.bezelColor} roughness={0.9} metalness={0.1} />
              </mesh>
              <mesh ref={screenMeshRef} geometry={screenGeo} position={[0, 0, frontZ]}>
                <meshBasicMaterial color="#111122" toneMapped={false} />
              </mesh>
              {/* Webcam notch */}
              <mesh position={[0, screenH / 2 + 0.02, frontZ + 0.001]}>
                <circleGeometry args={[0.03, 24]} />
                <meshBasicMaterial color="#1a1a1a" />
              </mesh>
            </group>
          </group>
        </group>
      ) : type === 'media' ? (
        <>
          {/* ── Media-only: slim slab with shiny edges, no bezel ── */}
          <mesh geometry={bodyGeo} position={[0, 0, -config.depth / 2]}>
            <meshPhysicalMaterial
              color={config.frameColor}
              metalness={0.92}
              roughness={0.08}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
              reflectivity={1}
            />
          </mesh>

          <mesh position={[0, 0, -config.depth - 0.001]}>
            <shapeGeometry args={[createRoundedRectShape(config.width - 0.01, config.height - 0.01, config.cornerRadius - 0.005)]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.6} />
          </mesh>

          <mesh ref={screenMeshRef} geometry={screenGeo} position={[0, 0, frontZ]}>
            <meshBasicMaterial color="#111122" toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          {/* ── Standard devices: phone / tablet body ── */}
          <mesh geometry={bodyGeo} position={[0, 0, -config.depth / 2]}>
            <meshPhysicalMaterial
              color={config.frameColor}
              metalness={0.85}
              roughness={0.15}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>

          {/* Screen bezel */}
          <mesh position={[0, 0, frontZ - 0.002]}>
            <shapeGeometry args={[createRoundedRectShape(screenW + 0.02, screenH + 0.02, Math.max(0.08, config.cornerRadius - config.screenInset + 0.005))]} />
            <meshStandardMaterial color={config.bezelColor} roughness={0.9} metalness={0.1} />
          </mesh>

          {/* Screen */}
          <mesh ref={screenMeshRef} geometry={screenGeo} position={[0, 0, frontZ]}>
            <meshBasicMaterial color="#111122" toneMapped={false} />
          </mesh>

          {/* Dynamic Island (iPhone) */}
          {type === 'iphone' && config.dynamicIsland && (
            <mesh position={[0, screenH / 2 - 0.18, frontZ + 0.001]}>
              <shapeGeometry args={[createRoundedRectShape(0.5, 0.14, 0.07)]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          )}

          {/* Punch hole camera (Android) */}
          {type === 'android' && config.punchHole && (
            <mesh position={[0, screenH / 2 - 0.15, frontZ + 0.001]}>
              <circleGeometry args={[0.05, 32]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          )}

          {/* Front camera (iPad) */}
          {type === 'ipad' && (
            <mesh position={[0, screenH / 2 + 0.02, frontZ + 0.001]}>
              <circleGeometry args={[0.04, 24]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
          )}

          {/* Side buttons (iPhone) */}
          {type === 'iphone' && (
            <>
              <mesh position={[config.width / 2 + 0.03, 0.8, 0]}>
                <boxGeometry args={[0.04, 0.45, 0.06]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
              <mesh position={[-config.width / 2 - 0.03, 1.0, 0]}>
                <boxGeometry args={[0.04, 0.3, 0.06]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
              <mesh position={[-config.width / 2 - 0.03, 0.45, 0]}>
                <boxGeometry args={[0.04, 0.3, 0.06]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
            </>
          )}

          {/* Side buttons (iPad) */}
          {type === 'ipad' && (
            <>
              {/* Power button - top */}
              <mesh position={[config.width / 2 + 0.02, config.height / 2 - 0.3, 0]}>
                <boxGeometry args={[0.03, 0.35, 0.05]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
              {/* Volume up */}
              <mesh position={[0.5, config.height / 2 + 0.02, 0]}>
                <boxGeometry args={[0.25, 0.03, 0.05]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
              {/* Volume down */}
              <mesh position={[0.9, config.height / 2 + 0.02, 0]}>
                <boxGeometry args={[0.25, 0.03, 0.05]} />
                <meshPhysicalMaterial color={config.sideColor} metalness={0.92} roughness={0.1} />
              </mesh>
            </>
          )}
        </>
      )}

      {showShadow && (
        <mesh
          position={[0, -config.height / 2 - 0.35, -config.depth / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[config.width * 1.8, config.width * 0.7]} />
          <meshBasicMaterial
            map={SHADOW_TEX}
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
