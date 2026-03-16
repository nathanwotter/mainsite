const ENGINE_SCRIPT_URL = '/xr/xr.js'
const BRIDGE_SCRIPT_URL = '/xr/recxr-8thwall-bootstrap.js'

type SelfHosted8thWallWindow = Window & {
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

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-recxr-src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.recxrSrc = src
    if (src === ENGINE_SCRIPT_URL) {
      // Self-hosted 8th Wall can preload SLAM directly from the local engine script tag.
      script.setAttribute('data-preload-chunks', 'slam')
    }
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load self-hosted AR script: ${src}`))
    document.head.appendChild(script)
  })
}

export async function loadSelfHosted8thWall() {
  await loadScript(ENGINE_SCRIPT_URL)
  await loadScript(BRIDGE_SCRIPT_URL)
  return window as SelfHosted8thWallWindow
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
  if (!runtimeWindow.XR8) {
    throw new Error(`Self-hosted 8th Wall engine did not expose XR8 from ${ENGINE_SCRIPT_URL}.`)
  }

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
