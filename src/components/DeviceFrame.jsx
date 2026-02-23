import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { parseGIF, decompressFrames } from 'gifuct-js'

const MACBOOK_GLB = `${import.meta.env.BASE_URL}models/macbook_pro_m3_16_inch_2024.glb`
useGLTF.preload(MACBOOK_GLB)

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
    bezelColor: '#111114',
    frameColor: '#2a2a2e',
    sideColor: '#3a3a3e',
    dynamicIsland: true,
  },
  android: {
    width: 2.3,
    height: 2.3 * ANDROID_ASPECT,
    depth: 0.18,
    cornerRadius: 0.30,
    screenInset: 0.05,
    bezelColor: '#111114',
    frameColor: '#2a2a2e',
    sideColor: '#3a3a3e',
    punchHole: true,
  },
  ipad: {
    width: 3.6,
    height: 3.6 * IPAD_ASPECT,
    depth: 0.14,
    cornerRadius: 0.36,
    screenInset: 0.06,
    bezelColor: '#111114',
    frameColor: '#2a2a2e',
    sideColor: '#3a3a3e',
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
  }, [screenFile, screenUrl, isVideo, isGif, screenAspect])

  return { textureRef, loadedRef, videoRef, gifRef }
}

/**
 * Renders the GLB MacBook Pro model with screen texture replacement
 * and lid pivot animation. The model's screen mesh (material 'sfCQkHOWyrsLmor')
 * has its material swapped at clone time; the lid group ('VCQqxpxkUlzqcJI_62')
 * is reparented under a pivot at the hinge for open/close rotation.
 */
function MacBookGLB({
  textureRef, loadedRef, videoRef, gifRef, isVideo, isGif,
  videoSeekTime, timelinePlaying, lidAngleRef, screenMeshRef,
}) {
  const { scene } = useGLTF(MACBOOK_GLB)
  const screenNodeRef = useRef()
  const lidPivotRef = useRef()
  const lastSeekRef = useRef(-1)
  const modelOpenAngleRef = useRef(0)

  const processedScene = useMemo(() => {
    const clone = scene.clone(true)

    // Deep-clone materials so instances don't share state
    clone.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone()
      }
    })

    let lidGroup = null
    let screenMesh = null

    clone.traverse((node) => {
      if (node.name === 'VCQqxpxkUlzqcJI_62') lidGroup = node
      if (node.isMesh && node.material?.name === 'sfCQkHOWyrsLmor') screenMesh = node
    })

    // Replace screen material
    if (screenMesh) {
      screenMesh.material = new THREE.MeshBasicMaterial({ color: '#111122', toneMapped: false })
      screenNodeRef.current = screenMesh
    }

    // Measure the model's current lid angle from the hinge so we can map
    // lidAngleRef (PI/2 = open, PI = closed) correctly.
    // Hinge at Y ≈ -12 in model space. Screen center ≈ (-17, -12).
    // Direction from hinge: ΔY ≈ -5, ΔZ ≈ -12 → angle from -Z axis ≈ 0.39 rad
    const HINGE_Y = -12

    if (lidGroup && lidGroup.parent) {
      const parent = lidGroup.parent
      const pivot = new THREE.Group()
      pivot.name = 'lid_pivot'
      pivot.position.set(0, HINGE_Y, 0)

      parent.remove(lidGroup)
      lidGroup.position.y -= HINGE_Y
      pivot.add(lidGroup)
      parent.add(pivot)
      lidPivotRef.current = pivot

      // The model's resting lid angle from vertical (measured from mesh bounds)
      // Screen bottom near hinge: Y≈-13.2, Z≈-1.3 → offset from hinge (0, HINGE_Y, 0):
      //   ΔY = -1.2, ΔZ = -1.3  Screen top: ΔY = -8.8, ΔZ = -22.2
      // Average direction ≈ ΔY = -5, ΔZ = -11.7 → angle from -Z axis ≈ atan2(5, 11.7) ≈ 0.41 rad
      modelOpenAngleRef.current = 0.41
    }

    return clone
  }, [scene])

  useFrame(() => {
    const mesh = screenNodeRef.current
    if (mesh) {
      const mat = mesh.material
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
              if (prev.disposalType === 2) g.compCtx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height)
              else if (prev.disposalType === 3 && g.savedState) g.compCtx.putImageData(g.savedState, 0, 0)
              g.currentFrame = (g.currentFrame + 1) % g.totalFrames
              if (g.currentFrame === 0) g.compCtx.clearRect(0, 0, g.compCanvas.width, g.compCanvas.height)
              const frame = g.frames[g.currentFrame]
              if (frame.disposalType === 3) g.savedState = g.compCtx.getImageData(0, 0, g.compCanvas.width, g.compCanvas.height)
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
      if (screenMeshRef) screenMeshRef.current = mesh
    }

    // Video sync
    const video = videoRef.current
    if (video && isVideo && loadedRef.current) {
      if (timelinePlaying) {
        if (video.paused) { video.currentTime = videoSeekTime || 0; video.play().catch(() => {}); lastSeekRef.current = -1 }
      } else {
        if (!video.paused) video.pause()
        const seekTo = videoSeekTime || 0
        if (Math.abs(lastSeekRef.current - seekTo) > 0.03) { video.currentTime = seekTo; lastSeekRef.current = seekTo }
      }
    }

    // Lid rotation: lidAngleRef PI/2 = open (model default), PI = closed.
    // Model lid is ~0.41 rad past vertical, so factor = 1 + 0.41/(PI/2) ≈ 1.25
    // to reach flat without overshooting through the base.
    if (lidPivotRef.current && lidAngleRef) {
      const angle = lidAngleRef.current != null ? lidAngleRef.current : Math.PI / 2
      lidPivotRef.current.rotation.x = (angle - Math.PI / 2) * 1.25
    }
  })

  // Scale: model width ≈ 35.4 units, target ≈ 5.6 → 0.158
  // Shift model so the visual center (base+screen midpoint) aligns with origin
  const MODEL_SCALE = 5.6 / 35.4
  return (
    <primitive
      object={processedScene}
      scale={MODEL_SCALE}
      position={[0, 2.0 * MODEL_SCALE, 10.8 * MODEL_SCALE]}
    />
  )
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

  // Imperatively apply texture every frame — bypasses React reconciler entirely.
  // MacBookGLB owns its own useFrame for texture/GIF/video, so skip for macbook.
  useFrame(() => {
    if (type === 'macbook') return
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

  })

  // Body front face is at z = depth/2 in group space
  // Tiny offset prevents z-fighting with the body
  const frontZ = config.depth / 2 + 0.023

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ── MacBook Pro: GLB 3D model ── */}
      {type === 'macbook' ? (
        <MacBookGLB
          textureRef={textureRef}
          loadedRef={loadedRef}
          videoRef={videoRef}
          gifRef={gifRef}
          isVideo={isVideo}
          isGif={isGif}
          videoSeekTime={videoSeekTime}
          timelinePlaying={timelinePlaying}
          lidAngleRef={lidAngleRef}
          screenMeshRef={screenMeshRef}
        />
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
              metalness={0.6}
              roughness={0.2}
              clearcoat={1.0}
              clearcoatRoughness={0.15}
              emissive={config.frameColor}
              emissiveIntensity={0.08}
            />
          </mesh>

          {/* Screen bezel */}
          <mesh position={[0, 0, frontZ - 0.002]}>
            <shapeGeometry args={[createRoundedRectShape(screenW + 0.02, screenH + 0.02, Math.max(0.08, config.cornerRadius - config.screenInset + 0.005))]} />
            <meshStandardMaterial color={config.bezelColor} roughness={0.9} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.03} />
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