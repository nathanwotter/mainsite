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
    sceneResources: null,
    pipelineModulesAdded: false,
    tapHandler: null,
    resizeHandler: null,
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
    console.log('[RecXR][8thWall]', message)
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
        ...details,
      })
    }
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
    }
    window.addEventListener('resize', state.resizeHandler)
    window.addEventListener('orientationchange', state.resizeHandler)
    sizeCanvasToContainer()
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
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.setAttribute('webkit-playsinline', 'true')
    video.preload = 'auto'
    state.guideVideo = video
    return video
  }

  async function ensureSceneResources() {
    const XR8 = getXR8()
    if (!XR8?.Threejs?.xrScene) return null

    const xrScene = XR8.Threejs.xrScene()
    if (!xrScene?.scene) return null

    state.sceneResources = xrScene
    return xrScene
  }

  async function ensureGuideSceneNode() {
    if (state.guideMesh) return state.guideMesh

    const xrScene = await ensureSceneResources()
    const THREE = global.THREE
    if (!xrScene || !THREE) {
      debugStatus('TODO: self-hosted scene hook is missing. Wire Nathan scene ownership through XR8.Threejs and global THREE.')
      return null
    }

    const video = ensureGuideVideo(state.config.guide || {})
    await new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady)
        resolve()
      }
      video.addEventListener('loadedmetadata', onReady)
      video.load()
      setTimeout(resolve, 1200)
    })

    const width = state.config?.placement?.imageTargetWidth || state.config?.guide?.imageTargetWidth || 0.22
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

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    const placement = state.config?.placement || {}
    const position = placement.position || { x: 0, y: 0, z: height / 2 }
    const rotation = placement.rotation || { x: -Math.PI / 2, y: 0, z: 0 }
    mesh.position.set(position.x || 0, position.y || 0, position.z || (height / 2))
    mesh.rotation.set(rotation.x || 0, rotation.y || 0, 0)
    mesh.visible = false

    state.guideMesh = mesh
    state.guideTexture = texture
    return mesh
  }

  async function placeGuideInWorld(hit) {
    const mesh = await ensureGuideSceneNode()
    const xrScene = await ensureSceneResources()
    if (!mesh || !xrScene?.scene) {
      debugStatus('World placement hit succeeded, but the scene hook is still pending. Add the Nathan scene node hook in recxr-8thwall-bootstrap.js.')
      return
    }

    if (mesh.parent && typeof mesh.parent.remove === 'function') {
      mesh.parent.remove(mesh)
    }

    xrScene.scene.add(mesh)
    mesh.visible = true

    if (hit?.position) {
      mesh.position.set(hit.position.x || 0, hit.position.y || 0, hit.position.z || 0)
    }

    const placement = state.config?.placement || {}
    const yawOnly = placement.rotation?.y || 0
    mesh.rotation.set(placement.rotation?.x || -Math.PI / 2, yawOnly, 0)

    if (placement.faceCameraYawOnly && xrScene.camera) {
      const cameraPosition = xrScene.camera.position
      const dx = (cameraPosition?.x || 0) - mesh.position.x
      const dz = (cameraPosition?.z || 0) - mesh.position.z
      if (dx || dz) {
        mesh.rotation.y = Math.atan2(dx, dz)
      }
    }

    state.guideWorldPlaced = true
    setSurfaceCandidate(hit)
    debugStatus(`Nathan placed in world space using ${hit?.type || 'unknown'} hit.`)

    if (typeof state.config?.onWorldPlaced === 'function') {
      state.config.onWorldPlaced({
        position: hit?.position || null,
        type: hit?.type || null,
      })
    }
  }

  function normalizeTouchPoint(event) {
    const viewportWidth = window.innerWidth || 1
    const viewportHeight = window.innerHeight || 1
    if (event.touches?.[0]) {
      return {
        x: event.touches[0].clientX / viewportWidth,
        y: event.touches[0].clientY / viewportHeight,
      }
    }
    return {
      x: (event.clientX || 0) / viewportWidth,
      y: (event.clientY || 0) / viewportHeight,
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
    return { x: 0.5, y: 0.68 }
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
    if (!state.config?.placement?.detachToWorldOnGroundTap) return

    const XR8 = getXR8()
    if (!XR8?.XrController?.hitTest) {
      emitError('Tap-to-place requires XR8.XrController.hitTest in the self-hosted engine.')
      return
    }

    const point = normalizeTouchPoint(event)
    try {
      const includedTypes = getIncludedHitTypes()
      let hit = state.currentSurfaceHit

      if (!hit) {
        const results = await XR8.XrController.hitTest(point.x, point.y, includedTypes)
        const hitResults = Array.isArray(results) ? results : (results ? [results] : [])
        state.lastHitResultCount = hitResults.length
        hit = chooseBestHitResult(hitResults)
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
      }

      if (!hit) {
        debugStatus(`Tap received but no SLAM hit result was returned. Tried hit types: ${includedTypes.join(', ')}.`)
        return
      }

      debugStatus(`Tap-to-place selected ${getHitResultType(hit)} hit for world placement.`)
      await placeGuideInWorld(hit)
      debugStatus('Nathan placed. He should stay upright on the ground.')
    } catch (error) {
      emitError('SLAM hit test failed during tap-to-place.', error)
    }
  }

  function getSlamSurfacePipelineModule() {
    return {
      name: state.surfaceModuleName,
      onStart: () => {
        updateTrackingStatus('initializing')
      },
      onUpdate: ({ processCpuResult }) => {
        const reality = processCpuResult?.reality
        const nextTrackingStatus =
          reality?.trackingStatus || reality?.worldTrackingStatus || reality?.slamStatus || state.trackingStatus
        if (nextTrackingStatus) {
          updateTrackingStatus(String(nextTrackingStatus))
        }
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
    if (XR8.FullWindowCanvas?.pipelineModule) {
      modules.push(XR8.FullWindowCanvas.pipelineModule())
    }
    if (XR8.GlTextureRenderer?.pipelineModule) {
      modules.push(XR8.GlTextureRenderer.pipelineModule())
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
  }

  function bindTapPlacement() {
    if (!state.canvas || state.tapHandler) return
    state.tapHandler = (event) => {
      handleTapToPlace(event)
    }
    state.canvas.addEventListener('touchend', state.tapHandler, { passive: true })
    state.canvas.addEventListener('click', state.tapHandler)
  }

  function unbindTapPlacement() {
    if (!state.canvas || !state.tapHandler) return
    state.canvas.removeEventListener('touchend', state.tapHandler)
    state.canvas.removeEventListener('click', state.tapHandler)
    state.tapHandler = null
  }

  async function startSession(config) {
    const XR8 = getXR8()
    if (!XR8) {
      throw new Error('XR8 was not available on window.')
    }

    await stopSession()

    state.config = config || {}
    state.container = config.canvasContainer
    if (!state.container) {
      throw new Error('startSession requires config.canvasContainer.')
    }

    state.canvas = ensureCanvas(state.container)
    sizeCanvasToContainer()
    state.guideWorldPlaced = false
    state.lastHitResultCount = 0
    state.lastRejectReason = 'none'
    updateTrackingStatus('starting')
    setSurfaceCandidate(null)
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

    if (XR8.run) {
      await XR8.run(runConfig)
    } else {
      debugStatus('XR8.run is not available yet. Complete the self-hosted engine installation in /public/xr/.')
    }
  }

  async function stopSession() {
    const XR8 = getXR8()
    unbindTapPlacement()
    unbindCanvasResize()

    if (XR8?.stop) {
      try {
        await XR8.stop()
      } catch (_error) {
        // Ignore stop errors during teardown.
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
    setSurfaceCandidate(null)
    state.config = null
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
