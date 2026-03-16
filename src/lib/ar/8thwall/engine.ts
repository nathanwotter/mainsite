const ENGINE_SCRIPT_URL = '/xr/xr.js'
const BRIDGE_SCRIPT_URL = '/xr/recxr-8thwall-bootstrap.js'

type SelfHosted8thWallWindow = Window & {
  __recxrScriptPromises?: Record<string, Promise<void>>
  XR8?: {
    loadChunk?: (chunkName: string) => Promise<void> | void
    XrController?: {
      configure?: (config: Record<string, unknown>) => void
    }
  }
  Recxr8thWallIntegration?: {
    startSession: (config: Record<string, unknown>) => Promise<void> | void
    stopSession?: () => Promise<void> | void
  }
}

function getRuntimeWindow() {
  return window as SelfHosted8thWallWindow
}

function ensureClassicScript(src: string) {
  const runtimeWindow = getRuntimeWindow()
  if (!runtimeWindow.__recxrScriptPromises) {
    runtimeWindow.__recxrScriptPromises = {}
  }

  const existingPromise = runtimeWindow.__recxrScriptPromises[src]
  if (existingPromise) {
    return existingPromise
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-recxr-src="${src}"]`)
    if (existing) {
      const loadState = existing.dataset.recxrLoaded
      if (loadState === 'true') {
        resolve()
        return
      }
      if (loadState === 'error') {
        reject(new Error(`Failed to load self-hosted AR script: ${src}`))
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load self-hosted AR script: ${src}`)), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.recxrSrc = src
    script.dataset.recxrLoaded = 'false'
    if (src === ENGINE_SCRIPT_URL) {
      // Load the self-hosted engine as a classic global script and ask it to preload SLAM.
      script.setAttribute('data-preload-chunks', 'slam')
    }
    script.onload = () => {
      script.dataset.recxrLoaded = 'true'
      resolve()
    }
    script.onerror = () => {
      script.dataset.recxrLoaded = 'error'
      reject(new Error(`Failed to load self-hosted AR script: ${src}`))
    }
    document.head.appendChild(script)
  })

  runtimeWindow.__recxrScriptPromises[src] = promise
  return promise
}

async function loadXr8Engine() {
  await ensureClassicScript(ENGINE_SCRIPT_URL)
  const runtimeWindow = await waitForXr8Global()
  if (!runtimeWindow.XR8) {
    throw new Error(`Self-hosted 8th Wall engine did not expose XR8 from ${ENGINE_SCRIPT_URL}.`)
  }
  return runtimeWindow
}

async function loadRecxr8thWallBridge() {
  await ensureClassicScript(BRIDGE_SCRIPT_URL)
  return getRuntimeWindow()
}

async function waitForXr8Global(timeoutMs = 4000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const runtimeWindow = getRuntimeWindow()
    if (runtimeWindow.XR8) {
      return runtimeWindow
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }
  return getRuntimeWindow()
}

export async function loadSelfHosted8thWall() {
  const runtimeWindow = await loadXr8Engine()
  await loadRecxr8thWallBridge()
  return runtimeWindow
}

export function getSelfHosted8thWallPaths() {
  return {
    engineScriptUrl: ENGINE_SCRIPT_URL,
    slamChunkUrl: '/xr/xr-slam.js',
    faceChunkUrl: '/xr/xr-face.js',
    bridgeScriptUrl: BRIDGE_SCRIPT_URL,
  }
}

export async function startSelfHosted8thWallSession(config: Record<string, unknown>) {
  const runtimeWindow = await loadSelfHosted8thWall()

  if (!runtimeWindow.Recxr8thWallIntegration?.startSession) {
    throw new Error(
      `Self-hosted 8th Wall bridge did not expose Recxr8thWallIntegration.startSession from ${BRIDGE_SCRIPT_URL}.`
    )
  }

  if (runtimeWindow.XR8?.loadChunk) {
    await runtimeWindow.XR8.loadChunk('slam')
  }

  await runtimeWindow.Recxr8thWallIntegration.startSession(config)
}

export async function stopSelfHosted8thWallSession() {
  const runtimeWindow = window as SelfHosted8thWallWindow
  if (runtimeWindow.Recxr8thWallIntegration?.stopSession) {
    await runtimeWindow.Recxr8thWallIntegration.stopSession()
  }
}
