(function attachRecxr8thWallIntegration(global) {
  const state = {
    config: null,
    canvas: null,
    container: null,
    guideVideo: null,
    guideTexture: null,
    guideMesh: null,
    guideWorldPlaced: false,
    currentSurfaceHit: null,
    currentSurfaceAvailable: false,
    surfaceHitType: 'none',
    centerHitInFlight: false,
    centerHitLastRunAt: 0,
    lastHitResultCount: 0,
    lastRejectReason: 'none',
    trackingStatus: 'unknown',
    visibleCanvasFrameCount: 0,
    activePipelineModules: [],
    glTextureRendererActive: false,
    threeRendererConfigured: false,
    rendererAlphaDebug: 'unknown',
    chosenVideoVariant: 'unknown',
    chromaKeyEnabled: false,
    greenScreenPath: 'none',
    debugEnabled: false,
    lastFacingYaw: null,
    lastFacingYawLogAt: 0,
    sceneResources: null,
    pipelineModulesAdded: false,
    sessionStarting: false,
    sessionRunning: false,
    tapHandler: null,
    resizeHandler: null,
    lastTapAt: 0,
    placementModuleName: 'recxr-world-placement',
    surfaceModuleName: 'recxr-slam-surface-candidates',
    errorModuleName: 'recxr-runtime-errors',
  }

  function getXR8() {
    return global.XR8
  }

  function setStatus(message) {
    if (typeof state.config?.onStatus === 'function') {
      state.config.onStatus(message)
    }
  }

  function debugStatus(message) {
    setStatus(message)
    if (state.debugEnabled) {
      console.log('[RecXR][8thWall]', message)
    }
  }

  function emitError(message, originalError) {
    const resolvedMessage = message || (originalError instanceof Error ? originalError.message : 'Unknown XR error')
    if (typeof state.config?.onError === 'function') {
      state.config.onError(resolvedMessage)
    } else {
      console.error('[RecXR][8thWall]', resolvedMessage, originalError)
    }
  }

  function emitDebug(details) {
    if (typeof state.config?.onDebug === 'function') {
      state.config.onDebug({
        trackingStatus: state.trackingStatus,
        hitResultCount: state.lastHitResultCount,
        rejectReason: state.lastRejectReason,
        surfaceAvailable: state.currentSurfaceAvailable,
        hitType: state.surfaceHitType,
        placed: state.guideWorldPlaced,
        visibleCanvasFrameCount: state.visibleCanvasFrameCount,
        activePipelineModules: state.activePipelineModules,
        glTextureRendererActive: state.glTextureRendererActive,
        rendererAlphaDebug: state.rendererAlphaDebug,
        ...details,
      })
    }
  }

  function getVisibilitySummary(element) {
    if (!element) {
      return {
        visibility: 'missing',
        zIndex: 'n/a',
      }
    }

    const computed = global.getComputedStyle ? global.getComputedStyle(element) : null
    return {
      visibility: computed
        ? `${computed.display}/${computed.visibility}/opacity:${computed.opacity}`
        : 'unknown',
      zIndex: computed?.zIndex || 'auto',
    }
  }

  function describeNode(element) {
    if (!element) return 'missing'
    const id = element.id ? `#${element.id}` : ''
    const dataMarker = element.getAttribute?.('data-recxr-xr-canvas') ? '[recxr-stage-canvas]' : ''
    return `${element.tagName.toLowerCase()}${id}${dataMarker}`
  }

  function getForeignRenderLayerCandidates() {
    const elements = [...document.querySelectorAll('canvas, video')]
    return elements.filter((element) => {
      if (element === state.canvas) return false
      if (state.container?.contains(element)) return false
      if (element.closest('#recxr-image-target-overlay')) return false

      const rect = element.getBoundingClientRect()
      const computed = global.getComputedStyle ? global.getComputedStyle(element) : null
      const largeEnough = rect.width > 120 && rect.height > 120
      const looksPositioned = computed ? ['fixed', 'absolute', 'relative'].includes(computed.position) : false
      const visuallyPresent = computed ? computed.display !== 'none' && computed.visibility !== 'hidden' : true

      return largeEnough && looksPositioned && visuallyPresent
    })
  }

  function styleRenderLayer(element, zIndex) {
    if (!element) return
    element.style.position = 'absolute'
    element.style.inset = '0'
    element.style.width = '100%'
    element.style.height = '100%'
    element.style.maxWidth = 'none'
    element.style.maxHeight = 'none'
    element.style.objectFit = 'cover'
    element.style.background = 'transparent'
    element.style.zIndex = String(zIndex)
    element.style.pointerEvents = 'none'
    element.style.display = element.tagName.toLowerCase() === 'video' ? 'block' : element.style.display || 'block'
  }

  function reconcileRenderLayersIntoStage() {
    if (!state.container) return

    const foreignLayers = getForeignRenderLayerCandidates()
    let foreignVideoCount = 0
    let foreignCanvasCount = 0

    foreignLayers.forEach((element) => {
      const tagName = element.tagName.toLowerCase()
      if (tagName === 'video') {
        foreignVideoCount += 1
        styleRenderLayer(element, 0)
      } else {
        foreignCanvasCount += 1
        styleRenderLayer(element, 1)
      }

      if (element.parentElement !== state.container) {
        state.container.appendChild(element)
      }
    })

    if (state.canvas) {
      styleRenderLayer(state.canvas, foreignVideoCount > 0 ? 1 : 0)
    }

    emitDebug({
      event: 'render-layers',
      renderOwner: describeNode(state.canvas?.parentElement || state.canvas),
      foreignRenderLayers: foreignLayers.map((element) => describeNode(element)),
    })
  }

  function getHitResultType(hit) {
    return hit?.type || hit?.hitType || hit?.kind || 'UNSPECIFIED'
  }

  function setSurfaceCandidate(hit) {
    state.currentSurfaceHit = hit || null
    state.currentSurfaceAvailable = Boolean(hit)
    state.surfaceHitType = hit ? getHitResultType(hit) : 'none'

    if (typeof state.config?.onSurfaceCandidate === 'function') {
      state.config.onSurfaceCandidate({
        available: Boolean(hit),
        type: hit ? state.surfaceHitType : 'none',
        hit: hit || null,
      })
    }

    emitDebug({
      event: 'surface-candidate',
      surfaceAvailable: Boolean(hit),
      hitType: hit ? state.surfaceHitType : 'none',
    })
  }

  function sizeCanvasToContainer() {
    if (!state.canvas || !state.container) return

    const bounds = state.container.getBoundingClientRect()
    const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0, 1)
    const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0, 1)
    const cssWidth = Math.max(Math.round(bounds.width || viewportWidth), 1)
    const cssHeight = Math.max(Math.round(bounds.height || viewportHeight), 1)
    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1)
    const drawingWidth = Math.max(Math.round(cssWidth * pixelRatio), 1)
    const drawingHeight = Math.max(Math.round(cssHeight * pixelRatio), 1)

    state.container.style.position = state.container.style.position || 'absolute'
    state.container.style.inset = state.container.style.inset || '0'
    state.container.style.width = '100%'
    state.container.style.height = '100%'
    state.container.style.overflow = 'hidden'

    state.canvas.style.position = 'absolute'
    state.canvas.style.inset = '0'
    state.canvas.style.display = 'block'
    state.canvas.style.width = '100%'
    state.canvas.style.height = '100%'
    state.canvas.style.objectFit = 'cover'

    if (state.canvas.width !== drawingWidth) {
      state.canvas.width = drawingWidth
    }
    if (state.canvas.height !== drawingHeight) {
      state.canvas.height = drawingHeight
    }

    emitDebug({
      event: 'layout',
      viewportWidth,
      viewportHeight,
      stageWidth: cssWidth,
      stageHeight: cssHeight,
      canvasWidth: drawingWidth,
      canvasHeight: drawingHeight,
      ...(() => {
        const overlaySummary = getVisibilitySummary(state.container?.closest('#recxr-image-target-overlay'))
        const stageSummary = getVisibilitySummary(state.container)
        const canvasSummary = getVisibilitySummary(state.canvas)
        return {
          overlayVisibility: overlaySummary.visibility,
          overlayZIndex: overlaySummary.zIndex,
          stageVisibility: stageSummary.visibility,
          stageZIndex: stageSummary.zIndex,
          canvasVisibility: canvasSummary.visibility,
          canvasZIndex: canvasSummary.zIndex,
          renderOwner: describeNode(state.canvas?.parentElement || state.canvas),
          foreignRenderLayers: getForeignRenderLayerCandidates().map((element) => describeNode(element)),
        }
      })(),
    })
  }

  function ensureCanvas(container) {
    let canvas = container.querySelector('canvas[data-recxr-xr-canvas="true"]')
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.setAttribute('data-recxr-xr-canvas', 'true')
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.zIndex = '1'
      canvas.style.pointerEvents = 'auto'
      container.appendChild(canvas)
    }
    return canvas
  }

  function bindCanvasResize() {
    if (state.resizeHandler) return
    state.resizeHandler = () => {
      sizeCanvasToContainer()
      reconcileRenderLayersIntoStage()
    }
    window.addEventListener('resize', state.resizeHandler)
    window.addEventListener('orientationchange', state.resizeHandler)
    sizeCanvasToContainer()
    reconcileRenderLayersIntoStage()
  }

  function unbindCanvasResize() {
    if (!state.resizeHandler) return
    window.removeEventListener('resize', state.resizeHandler)
    window.removeEventListener('orientationchange', state.resizeHandler)
    state.resizeHandler = null
  }

  function ensureGuideVideo(guide) {
    if (state.guideVideo) return state.guideVideo

    const video = document.createElement('video')
    video.src = guide.guideVideoUrl || guide.arGuideHlsUrl || guide.standardHlsUrl || ''
    video.crossOrigin = 'anonymous'
    video.autoplay = true
    video.loop = true
    video.muted = true
    video.defaultMuted = true
    video.volume = 1
    video.playsInline = true
    video.setAttribute('webkit-playsinline', 'true')
    video.preload = 'auto'
    state.guideVideo = video
    return video
  }

  const guideVideoVertexShader = `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const packedAlphaGuideFragmentShader = `
    uniform sampler2D videoMap;
    varying vec2 vUv;

    void main() {
      vec2 colorUv = vec2(vUv.x, 0.5 + (vUv.y * 0.5));
      vec4 tex = texture2D(videoMap, colorUv);
      gl_FragColor = vec4(tex.rgb, 1.0);
    }
  `

  const chromaKeyGuideFragmentShader = `
    uniform sampler2D videoMap;
    uniform float variantOffset;
    uniform vec3 keyColor;
    uniform float similarity;
    uniform float smoothness;
    varying vec2 vUv;

    void main() {
      vec2 sampleUv = vec2(vUv.x, variantOffset + (vUv.y * 0.5));
      vec4 colorSample = texture2D(videoMap, sampleUv);
      float chromaDistance = distance(colorSample.rgb, keyColor);
      float alpha = smoothstep(similarity, similarity + smoothness, chromaDistance);
      if (alpha < 0.5) {
        discard;
      }

      float maxOther = max(colorSample.r, colorSample.b);
      float greenExcess = max(0.0, colorSample.g - maxOther);
      vec3 despilled = vec3(colorSample.r, colorSample.g - (greenExcess * 0.65), colorSample.b);

      gl_FragColor = vec4(despilled, 1.0);
    }
  `

  function isLikelyIphone() {
    const ua = global.navigator?.userAgent || ''
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in global.document)
  }

  function chooseGuideVariant(guide) {
    const viewportWidth = global.innerWidth || 1
    const viewportHeight = global.innerHeight || 1
    const aspect = viewportWidth / Math.max(viewportHeight, 1)
    const portrait = viewportHeight >= viewportWidth
    const iphone = isLikelyIphone()
    const chosenVariant = iphone && portrait ? 'bottom' : 'top'

    debugStatus(
      `Chosen video source=${guide.guideVideoUrl || guide.arGuideHlsUrl || guide.standardHlsUrl || 'unset'} variant=${chosenVariant} device=iPhone:${iphone ? 'yes' : 'no'} portrait:${portrait ? 'yes' : 'no'} aspect=${aspect.toFixed(3)}`
    )

    return chosenVariant
  }

  function createGuideMaterial(guide, THREE, texture) {
    const guideMode = guide?.videoMode || 'standard'

    if (guideMode === 'packedAlpha' && guide?.arGuideHlsUrl) {
      state.chromaKeyEnabled = false
      state.greenScreenPath = 'packed-alpha-shader'
      debugStatus('Green-screen removal path in use: packed-alpha shader.')
      const material = new THREE.ShaderMaterial({
        uniforms: {
          videoMap: { value: texture },
        },
        vertexShader: guideVideoVertexShader,
        fragmentShader: packedAlphaGuideFragmentShader,
        transparent: false,
        opacity: 1,
        alphaTest: 0.5,
        premultipliedAlpha: false,
        blending: THREE.NoBlending,
        side: THREE.FrontSide,
        depthTest: true,
        depthWrite: true,
        toneMapped: false,
      })
      debugStatus(
        `Material transparency settings: path=${state.greenScreenPath} transparent=${String(material.transparent)} opacity=${String(material.opacity)} alphaTest=${String(material.alphaTest)} premultipliedAlpha=${String(material.premultipliedAlpha)} blending=${String(material.blending)} depthTest=${String(material.depthTest)} depthWrite=${String(material.depthWrite)}`
      )
      return material
    }

    const chosenVariant = chooseGuideVariant(guide || {})
    state.chosenVideoVariant = chosenVariant
    state.chromaKeyEnabled = true
    state.greenScreenPath = 'chroma-key-shader'
    debugStatus(`Green-screen removal path in use: chroma-key shader. chosenVariant=${chosenVariant}`)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        videoMap: { value: texture },
        variantOffset: { value: chosenVariant === 'bottom' ? 0.0 : 0.5 },
        keyColor: { value: new THREE.Color(0.05, 0.9, 0.15) },
        similarity: { value: 0.42 },
        smoothness: { value: 0.16 },
      },
      vertexShader: guideVideoVertexShader,
      fragmentShader: chromaKeyGuideFragmentShader,
      transparent: false,
      opacity: 1,
      alphaTest: 0.5,
      premultipliedAlpha: false,
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    })
    debugStatus(
      `Material transparency settings: path=${state.greenScreenPath} transparent=${String(material.transparent)} opacity=${String(material.opacity)} alphaTest=${String(material.alphaTest)} premultipliedAlpha=${String(material.premultipliedAlpha)} blending=${String(material.blending)} depthTest=${String(material.depthTest)} depthWrite=${String(material.depthWrite)}`
    )
    return material
  }

  async function kickGuideVideoPlayback(context, options = {}) {
    const video = state.guideVideo
    if (!video) {
      debugStatus(`Poster/static texture fallback detected because no guide video element exists during ${context}.`)
      return
    }

    const allowAudio = Boolean(options.allowAudio)
    if (allowAudio) {
      video.muted = false
      video.defaultMuted = false
      video.volume = 1
    }

    debugStatus(
      `Video state before ${context}: paused=${String(video.paused)} muted=${String(video.muted)} volume=${video.volume.toFixed(2)} playsInline=${String(video.playsInline)} readyState=${video.readyState} currentTime=${video.currentTime.toFixed(3)}`
    )

    try {
      await video.play()
      debugStatus(`video.play() resolved during ${context}. audio=${allowAudio ? 'requested' : 'unchanged'}`)
    } catch (error) {
      debugStatus(`video.play() rejected during ${context}. audio=${allowAudio ? 'requested' : 'unchanged'}`)
      if (allowAudio) {
        video.muted = true
        video.defaultMuted = true
        try {
          await video.play()
          debugStatus(`audio play fallback succeeded during ${context} after remuting video.`)
        } catch (_fallbackError) {
          // Preserve the original rejection below.
        }
      }
      emitError('Guide video failed to start during world placement.', error)
    }

    debugStatus(
      `Video state after ${context}: paused=${String(video.paused)} muted=${String(video.muted)} volume=${video.volume.toFixed(2)} playsInline=${String(video.playsInline)} readyState=${video.readyState} currentTime=${video.currentTime.toFixed(3)}`
    )
  }

  function updateGuideFacingYaw() {
    const placement = state.config?.placement || {}
    if (!placement.faceCameraYawOnly || !state.guideWorldPlaced || !state.guideMesh) return

    const camera = state.sceneResources?.camera
    if (!camera?.position) return

    const dx = (camera.position.x || 0) - state.guideMesh.position.x
    const dz = (camera.position.z || 0) - state.guideMesh.position.z
    if (!dx && !dz) return

    const nextYaw = Math.atan2(dx, dz)
    state.guideMesh.rotation.x = placement.rotation?.x ?? 0
    state.guideMesh.rotation.z = placement.rotation?.z ?? 0
    state.guideMesh.rotation.y = nextYaw

    const now = Date.now()
    if (
      state.debugEnabled &&
      (state.lastFacingYaw == null || Math.abs(nextYaw - state.lastFacingYaw) > 0.12 || now - state.lastFacingYawLogAt > 1200)
    ) {
      debugStatus(
        `Facing yaw updated: camera=(${(camera.position.x || 0).toFixed(3)}, ${(camera.position.y || 0).toFixed(3)}, ${(camera.position.z || 0).toFixed(3)}) mesh=(${state.guideMesh.position.x.toFixed(3)}, ${state.guideMesh.position.y.toFixed(3)}, ${state.guideMesh.position.z.toFixed(3)}) yaw=${nextYaw.toFixed(3)}`
      )
      state.lastFacingYawLogAt = now
    }
    state.lastFacingYaw = nextYaw
  }

  async function ensureSceneResources() {
    const XR8 = getXR8()
    if (!XR8?.Threejs?.xrScene) return null

    const xrScene = XR8.Threejs.xrScene()
    if (!xrScene?.scene) return null

    const renderer = xrScene.renderer
    if (renderer && !state.threeRendererConfigured) {
      try {
        if ('autoClear' in renderer) {
          renderer.autoClear = false
        }
        if (typeof renderer.setClearColor === 'function') {
          renderer.setClearColor(0x000000, 0)
        }
        state.rendererAlphaDebug = `autoClear=${String(renderer.autoClear)} clearAlpha=0`
        state.threeRendererConfigured = true
      } catch (error) {
        state.rendererAlphaDebug = error instanceof Error ? error.message : 'renderer alpha config failed'
      }
    }

    state.sceneResources = xrScene
    return xrScene
  }

  async function ensureGuideSceneNode() {
    if (state.guideMesh) return state.guideMesh

    const xrScene = await ensureSceneResources()
    const THREE = global.THREE
    if (!xrScene || !THREE) {
      emitError('Scene hook missing: XR8.Threejs scene or global THREE was unavailable during placement.')
      return null
    }

    const video = ensureGuideVideo(state.config.guide || {})
    debugStatus(`Guide video exists: ${video ? 'yes' : 'no'}. src=${video?.src || 'none'}`)
    await new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady)
        debugStatus(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`)
        resolve()
      }
      video.addEventListener('loadedmetadata', onReady)
      video.load()
      setTimeout(resolve, 1200)
    })

    const width = state.config?.placement?.imageTargetWidth || state.config?.guide?.imageTargetWidth || 0.82
    const aspect = video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 0.5625
    const height = width / Math.max(aspect, 0.01)
    const geometry = new THREE.PlaneGeometry(width, height)
    const texture = new THREE.VideoTexture(video)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    if ('colorSpace' in texture && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace
    }

    const material = createGuideMaterial(state.config?.guide || {}, THREE, texture)

    const mesh = new THREE.Mesh(geometry, material)
    const placement = state.config?.placement || {}
    const position = placement.position || { x: 0, y: height / 2, z: 0 }
    const rotation = placement.rotation || { x: 0, y: 0, z: 0 }
    mesh.position.set(position.x ?? 0, position.y ?? (height / 2), position.z ?? 0)
    mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0)
    mesh.visible = false

    debugStatus(
      `Guide mesh created. transform position=(${mesh.position.x.toFixed(3)}, ${mesh.position.y.toFixed(3)}, ${mesh.position.z.toFixed(3)}) rotation=(${mesh.rotation.x.toFixed(3)}, ${mesh.rotation.y.toFixed(3)}, ${mesh.rotation.z.toFixed(3)}) width=${width.toFixed(3)}m height=${height.toFixed(3)}m aspect=${aspect.toFixed(3)} video=${video.videoWidth || 0}x${video.videoHeight || 0}`
    )

    state.guideMesh = mesh
    state.guideTexture = texture
    return mesh
  }

  async function placeGuideInWorld(hit) {
    debugStatus(`Placement function entered. Candidate hit type: ${getHitResultType(hit)}.`)
    const mesh = await ensureGuideSceneNode()
    const xrScene = await ensureSceneResources()
    if (!mesh || !xrScene?.scene) {
      emitError('Placement failed because the Nathan scene node could not be prepared.')
      return
    }

    if (mesh.parent && typeof mesh.parent.remove === 'function') {
      mesh.parent.remove(mesh)
    }

    xrScene.scene.add(mesh)
    mesh.visible = true

    const placement = state.config?.placement || {}
    const basePosition = hit?.position || { x: 0, y: 0, z: 0 }
    const placementOffset = placement.position || { x: 0, y: 0, z: 0 }
    mesh.position.set(
      (basePosition.x ?? 0) + (placementOffset.x ?? 0),
      (basePosition.y ?? 0) + (placementOffset.y ?? 0),
      (basePosition.z ?? 0) + (placementOffset.z ?? 0)
    )
    const yawOnly = placement.rotation?.y || 0
    mesh.rotation.set(placement.rotation?.x ?? 0, yawOnly, placement.rotation?.z ?? 0)

    if (placement.faceCameraYawOnly && xrScene.camera) {
      const cameraPosition = xrScene.camera.position
      const dx = (cameraPosition?.x || 0) - mesh.position.x
      const dz = (cameraPosition?.z || 0) - mesh.position.z
      if (dx || dz) {
        mesh.rotation.y = Math.atan2(dx, dz)
        state.lastFacingYaw = mesh.rotation.y
      }
    }

    await kickGuideVideoPlayback('placement')

    state.guideWorldPlaced = true
    setSurfaceCandidate(hit)
    const geometryParams = mesh.geometry?.parameters || {}
    debugStatus(
      `Final mesh transform position=(${mesh.position.x.toFixed(3)}, ${mesh.position.y.toFixed(3)}, ${mesh.position.z.toFixed(3)}) rotation=(${mesh.rotation.x.toFixed(3)}, ${mesh.rotation.y.toFixed(3)}, ${mesh.rotation.z.toFixed(3)}) size=${Number(geometryParams.width || 0).toFixed(3)}x${Number(geometryParams.height || 0).toFixed(3)} scale=(${mesh.scale.x.toFixed(3)}, ${mesh.scale.y.toFixed(3)}, ${mesh.scale.z.toFixed(3)})`
    )
    debugStatus(`Nathan placed in world space using ${hit?.type || 'unknown'} hit.`)

    if (typeof state.config?.onWorldPlaced === 'function') {
      state.config.onWorldPlaced({
        position: hit?.position || null,
        type: hit?.type || null,
      })
    }
  }

  function normalizeTouchPoint(event) {
    const referenceRect =
      state.canvas?.getBoundingClientRect?.() ||
      state.container?.getBoundingClientRect?.() || {
        left: 0,
        top: 0,
        width: window.innerWidth || 1,
        height: window.innerHeight || 1,
      }
    const clientPoint = event.changedTouches?.[0] || event.touches?.[0] || event
    const clientX = typeof clientPoint?.clientX === 'number' ? clientPoint.clientX : 0
    const clientY = typeof clientPoint?.clientY === 'number' ? clientPoint.clientY : 0

    return {
      clientX,
      clientY,
      x: Math.min(1, Math.max(0, (clientX - referenceRect.left) / Math.max(referenceRect.width || 1, 1))),
      y: Math.min(1, Math.max(0, (clientY - referenceRect.top) / Math.max(referenceRect.height || 1, 1))),
      referenceWidth: referenceRect.width || 1,
      referenceHeight: referenceRect.height || 1,
    }
  }

  function getHitResultDistance(hit) {
    if (typeof hit?.distance === 'number') return hit.distance
    const position = hit?.position
    if (position && typeof position.x === 'number' && typeof position.y === 'number' && typeof position.z === 'number') {
      return Math.sqrt((position.x ** 2) + (position.y ** 2) + (position.z ** 2))
    }
    return Number.POSITIVE_INFINITY
  }

  function chooseBestHitResult(results) {
    if (!Array.isArray(results) || results.length === 0) return null

    const priority = {
      DETECTED_SURFACE: 0,
      ESTIMATED_SURFACE: 1,
      FEATURE_POINT: 2,
      UNSPECIFIED: 3,
    }

    return [...results].sort((left, right) => {
      const leftType = getHitResultType(left)
      const rightType = getHitResultType(right)
      const leftPriority = leftType in priority ? priority[leftType] : priority.UNSPECIFIED
      const rightPriority = rightType in priority ? priority[rightType] : priority.UNSPECIFIED
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return getHitResultDistance(left) - getHitResultDistance(right)
    })[0]
  }

  function getIncludedHitTypes() {
    return ['DETECTED_SURFACE', 'ESTIMATED_SURFACE', 'FEATURE_POINT', 'UNSPECIFIED']
  }

  function getCenterScreenPoint() {
    return { x: 0.5, y: 0.5 }
  }

  function updateTrackingStatus(nextStatus) {
    const resolvedStatus = nextStatus || 'unknown'
    if (resolvedStatus === state.trackingStatus) return
    state.trackingStatus = resolvedStatus
    debugStatus(`SLAM tracking state changed: ${resolvedStatus}.`)
    emitDebug({
      event: 'tracking',
      trackingStatus: resolvedStatus,
    })
    reconcileRenderLayersIntoStage()
  }

  async function refreshCenterSurfaceCandidate() {
    const XR8 = getXR8()
    if (!XR8?.XrController?.hitTest || state.centerHitInFlight) return

    const now = Date.now()
    if (now - state.centerHitLastRunAt < 140) return
    state.centerHitInFlight = true
    state.centerHitLastRunAt = now

    try {
      const point = getCenterScreenPoint()
      const includedTypes = getIncludedHitTypes()
      const results = await XR8.XrController.hitTest(point.x, point.y, includedTypes)
      const hitResults = Array.isArray(results) ? results : (results ? [results] : [])
      state.lastHitResultCount = hitResults.length
      const bestHit = chooseBestHitResult(hitResults)
      const previousAvailability = state.currentSurfaceAvailable
      const previousType = state.surfaceHitType
      state.lastRejectReason = bestHit
        ? 'none'
        : hitResults.length === 0
          ? 'hitTest returned zero candidates'
          : 'all candidates were rejected by selector'

      setSurfaceCandidate(bestHit)
      emitDebug({
        event: 'hit-test',
        point,
        hitResultCount: hitResults.length,
        hitTypes: hitResults.map((hit) => getHitResultType(hit)),
        rejectReason: state.lastRejectReason,
      })

      if (!bestHit && previousAvailability) {
        debugStatus('No placeable horizontal-surface candidate is currently available at the center reticle.')
      } else if (bestHit && (!previousAvailability || previousType !== state.surfaceHitType)) {
        debugStatus(`Center reticle has a placeable surface candidate using ${state.surfaceHitType}.`)
      } else if (!bestHit && hitResults.length === 0) {
        debugStatus('Center reticle hit test returned zero candidates.')
      }
    } catch (error) {
      state.lastRejectReason = error instanceof Error ? error.message : 'hitTest threw'
      emitDebug({
        event: 'hit-test-error',
        rejectReason: state.lastRejectReason,
      })
      emitError('Failed to refresh SLAM center-surface candidate.', error)
    } finally {
      state.centerHitInFlight = false
    }
  }

  async function handleTapToPlace(event) {
    const targetDescription = describeNode(event?.target)
    const overlayWrapperReceived = event?.target instanceof Element && event.target.matches('[data-recxr-surface-overlay]')
    const uiTarget = event?.target instanceof Element && event.target.closest('[data-recxr-surface-ui]')
    debugStatus(
      `Scene tap received on ${targetDescription}. overlayWrapperReceived=${overlayWrapperReceived ? 'yes' : 'no'} uiTarget=${uiTarget ? 'yes' : 'no'}.`
    )
    if (!state.config?.placement?.detachToWorldOnGroundTap) {
      debugStatus('Scene tap ignored because detachToWorldOnGroundTap is disabled.')
      return
    }

    const XR8 = getXR8()
    if (!XR8?.XrController?.hitTest) {
      emitError('Tap-to-place requires XR8.XrController.hitTest in the self-hosted engine.')
      return
    }

    const point = normalizeTouchPoint(event)
    try {
      ensureGuideVideo(state.config.guide || {})
      await kickGuideVideoPlayback('tap gesture', { allowAudio: true })
      const includedTypes = getIncludedHitTypes()
      debugStatus(
        `Tap coordinates client=(${point.clientX.toFixed(1)}, ${point.clientY.toFixed(1)}) normalized=(${point.x.toFixed(3)}, ${point.y.toFixed(3)}) reference=${Math.round(point.referenceWidth)}x${Math.round(point.referenceHeight)}`
      )
      debugStatus(`Tap candidate exists before hit test: ${state.currentSurfaceHit ? 'yes' : 'no'}.`)

      const results = await XR8.XrController.hitTest(point.x, point.y, includedTypes)
      const hitResults = Array.isArray(results) ? results : (results ? [results] : [])
      state.lastHitResultCount = hitResults.length
      let hit = chooseBestHitResult(hitResults)
      let hitSource = 'tap-coordinates'
      state.lastRejectReason = hit
        ? 'none'
        : hitResults.length === 0
          ? 'tap hitTest returned zero candidates'
          : 'tap hitTest candidates rejected by selector'
      emitDebug({
        event: 'tap-hit-test',
        point,
        hitResultCount: hitResults.length,
        hitTypes: hitResults.map((candidate) => getHitResultType(candidate)),
        rejectReason: state.lastRejectReason,
      })

      if (!hit && state.currentSurfaceHit) {
        hit = state.currentSurfaceHit
        hitSource = 'current-reticle-candidate'
      }

      if (!hit) {
        debugStatus(`Placement early return: no candidate available at tap point ${point.x.toFixed(3)}, ${point.y.toFixed(3)}.`)
        debugStatus(`Tap received but no SLAM hit result was returned. Tried hit types: ${includedTypes.join(', ')}.`)
        return
      }

      debugStatus(
        `Tap-to-place selected ${getHitResultType(hit)} hit for world placement using ${hitSource}. hitPosition=(${Number(hit?.position?.x || 0).toFixed(3)}, ${Number(hit?.position?.y || 0).toFixed(3)}, ${Number(hit?.position?.z || 0).toFixed(3)})`
      )
      await placeGuideInWorld(hit)
      debugStatus('Nathan placed. He should stay upright on the ground.')
    } catch (error) {
      debugStatus('Placement failed after scene tap.')
      emitError('SLAM hit test failed during tap-to-place.', error)
    }
  }

  function getSlamSurfacePipelineModule() {
    return {
      name: state.surfaceModuleName,
      onStart: () => {
        updateTrackingStatus('initializing')
      },
      onProcessGpu: () => {
        state.visibleCanvasFrameCount += 1
        if (state.visibleCanvasFrameCount === 1 || state.visibleCanvasFrameCount % 60 === 0) {
          emitDebug({
            event: 'visible-canvas-draw',
            visibleCanvasFrameCount: state.visibleCanvasFrameCount,
          })
        }
      },
      onUpdate: ({ processCpuResult }) => {
        const reality = processCpuResult?.reality
      const nextTrackingStatus =
          reality?.trackingStatus || reality?.worldTrackingStatus || reality?.slamStatus || state.trackingStatus
      if (nextTrackingStatus) {
        updateTrackingStatus(String(nextTrackingStatus))
      }
      updateGuideFacingYaw()
      refreshCenterSurfaceCandidate()
    },
  }
  }

  function getRuntimeErrorPipelineModule() {
    return {
      name: state.errorModuleName,
      onException: (error) => {
        emitError('8th Wall runtime pipeline error.', error)
      },
    }
  }

  function getPlacementPipelineModule() {
    return {
      name: state.placementModuleName,
      onStart: () => {
        debugStatus('8th Wall session started successfully. Scan for a horizontal surface, then tap to place Nathan.')
      },
    }
  }

  function addPipelineModules() {
    const XR8 = getXR8()
    if (!XR8?.addCameraPipelineModules || state.pipelineModulesAdded) return

    const modules = []
    if (XR8.GlTextureRenderer?.pipelineModule) {
      modules.push(XR8.GlTextureRenderer.pipelineModule())
      state.glTextureRendererActive = true
    }
    if (XR8.XrController?.pipelineModule) {
      modules.push(XR8.XrController.pipelineModule())
    }
    if (XR8.Threejs?.pipelineModule) {
      modules.push(XR8.Threejs.pipelineModule())
    }
    modules.push(getRuntimeErrorPipelineModule())
    modules.push(getPlacementPipelineModule())
    modules.push(getSlamSurfacePipelineModule())

    XR8.addCameraPipelineModules(modules)
    state.pipelineModulesAdded = true
    state.activePipelineModules = modules.map((module) => module?.name || 'anonymous-module')
    debugStatus(`Pipeline modules added: ${state.activePipelineModules.join(', ')}`)
    emitDebug({
      event: 'pipeline-modules',
      cameraRenderModuleActive: Boolean(XR8.GlTextureRenderer?.pipelineModule),
      activePipelineModules: state.activePipelineModules,
      glTextureRendererActive: state.glTextureRendererActive,
      renderOwner: describeNode(state.canvas?.parentElement || state.canvas),
      foreignRenderLayers: getForeignRenderLayerCandidates().map((element) => describeNode(element)),
    })
  }

  function bindTapPlacement() {
    if (!state.container || state.tapHandler) return
    state.tapHandler = (event) => {
      if (
        event?.target instanceof Element &&
        event.target.closest('button, a, input, select, textarea, [data-recxr-ui-block]')
      ) {
        debugStatus(`Ignored UI tap on ${describeNode(event.target)}.`)
        return
      }
      const now = Date.now()
      if (now - state.lastTapAt < 700) {
        debugStatus('Ignored duplicate placement tap.')
        return
      }
      state.lastTapAt = now
      handleTapToPlace(event)
    }
    state.container.addEventListener('click', state.tapHandler)
    if (global.PointerEvent) {
      state.container.addEventListener('pointerup', state.tapHandler)
    } else {
      state.container.addEventListener('touchend', state.tapHandler, { passive: true })
    }
  }

  function unbindTapPlacement() {
    if (!state.container || !state.tapHandler) return
    state.container.removeEventListener('click', state.tapHandler)
    if (global.PointerEvent) {
      state.container.removeEventListener('pointerup', state.tapHandler)
    } else {
      state.container.removeEventListener('touchend', state.tapHandler)
    }
    state.tapHandler = null
  }

  async function startSession(config) {
    const XR8 = getXR8()
    if (!XR8) {
      throw new Error('XR8 was not available on window.')
    }

    if (state.sessionStarting || state.sessionRunning) {
      debugStatus('Ignored duplicate session start request.')
      return
    }

    state.sessionStarting = true

    await stopSession()

    state.config = config || {}
    state.debugEnabled = Boolean(state.config?.debugEnabled)
    state.container = config.canvasContainer
    if (!state.container) {
      throw new Error('startSession requires config.canvasContainer.')
    }

    state.canvas = ensureCanvas(state.container)
    sizeCanvasToContainer()
    state.guideWorldPlaced = false
    state.lastHitResultCount = 0
    state.lastRejectReason = 'none'
    state.visibleCanvasFrameCount = 0
    state.activePipelineModules = []
    state.glTextureRendererActive = false
    state.threeRendererConfigured = false
    state.rendererAlphaDebug = 'unknown'
    state.lastTapAt = 0
    state.lastFacingYaw = null
    state.lastFacingYawLogAt = 0
    updateTrackingStatus('starting')
    setSurfaceCandidate(null)
    debugStatus('Self-hosted 8th Wall bootstrap startSession entered.')
    debugStatus('Starting SLAM-only horizontal-surface placement mode.')

    if (XR8.XrController?.configure) {
      XR8.XrController.configure({
        enableWorldPoints: true,
      })
      debugStatus('Applied XR8.XrController.configure for SLAM world-point placement.')
    }

    addPipelineModules()
    bindTapPlacement()
    bindCanvasResize()

    const runConfig = {
      canvas: state.canvas,
      allowedDevices: 'any',
    }

    try {
      if (XR8.run) {
        debugStatus('Requesting camera permission and calling XR8.run...')
        await XR8.run(runConfig)
        state.sessionRunning = true
        debugStatus('Camera permission granted and XR8.run resolved.')
        window.setTimeout(() => {
          sizeCanvasToContainer()
          reconcileRenderLayersIntoStage()
        }, 50)
        window.setTimeout(() => {
          sizeCanvasToContainer()
          reconcileRenderLayersIntoStage()
        }, 300)
      } else {
        debugStatus('XR8.run is not available yet. Complete the self-hosted engine installation in /public/xr/.')
      }
    } catch (error) {
      debugStatus('Camera permission denied or XR8.run failed.')
      throw error
    } finally {
      state.sessionStarting = false
    }
  }

  async function stopSession() {
    const XR8 = getXR8()
    state.sessionStarting = false
    unbindTapPlacement()
    unbindCanvasResize()

    if (XR8?.stop) {
      try {
        await XR8.stop()
      } catch (_error) {
        // Ignore stop errors during teardown.
      }
    }
    if (XR8?.clearCameraPipelineModules) {
      try {
        XR8.clearCameraPipelineModules()
      } catch (_error) {
        // Ignore pipeline cleanup failures during teardown.
      }
    }

    if (state.guideMesh) {
      if (state.guideMesh.parent && typeof state.guideMesh.parent.remove === 'function') {
        state.guideMesh.parent.remove(state.guideMesh)
      }
      state.guideMesh.geometry?.dispose?.()
      state.guideMesh.material?.dispose?.()
      state.guideMesh = null
    }

    if (state.guideTexture) {
      state.guideTexture.dispose?.()
      state.guideTexture = null
    }

    if (state.guideVideo) {
      state.guideVideo.pause()
      state.guideVideo.removeAttribute('src')
      state.guideVideo.load()
      state.guideVideo = null
    }

    state.sceneResources = null
    state.guideWorldPlaced = false
    state.lastHitResultCount = 0
    state.lastRejectReason = 'none'
    state.trackingStatus = 'unknown'
    state.visibleCanvasFrameCount = 0
    state.activePipelineModules = []
    state.glTextureRendererActive = false
    state.threeRendererConfigured = false
    state.rendererAlphaDebug = 'unknown'
    state.pipelineModulesAdded = false
    state.sessionRunning = false
    state.lastTapAt = 0
    state.debugEnabled = false
    state.lastFacingYaw = null
    state.lastFacingYawLogAt = 0
    setSurfaceCandidate(null)
    state.config = null
    debugStatus('8th Wall session stopped and lifecycle state reset.')
  }

  async function resetPlacement() {
    if (state.guideMesh) {
      state.guideMesh.visible = false
      if (state.guideMesh.parent && typeof state.guideMesh.parent.remove === 'function') {
        state.guideMesh.parent.remove(state.guideMesh)
      }
    }

    state.guideWorldPlaced = false
    setSurfaceCandidate(null)
    if (typeof state.config?.onPlacementReset === 'function') {
      state.config.onPlacementReset()
    }
    debugStatus('Nathan placement reset. Scan for a horizontal surface and tap to place again.')
  }

  global.Recxr8thWallIntegration = {
    startSession,
    stopSession,
    resetPlacement,
  }
})(window)
