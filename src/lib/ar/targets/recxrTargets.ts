export type RecxrAnchorStop = {
  imageTargetName?: string | null
  imageTargetWidth?: number | null
  anchorOffsetX?: number | null
  anchorOffsetY?: number | null
  anchorOffsetZ?: number | null
  anchorYaw?: number | null
  anchorMode?: string | null
  title?: string | null
}

export function getRecxrImageTargetAssetUrl(imageTargetName?: string | null) {
  const safeName = String(imageTargetName || '').trim().replace(/[^a-zA-Z0-9_-]/g, '')
  return safeName ? `/xr/targets/${safeName}/manifest.json` : ''
}

export function formatRecxrTargetDebugLine(stop?: RecxrAnchorStop | null) {
  return stop
    ? `imageTargetName=${stop.imageTargetName || 'unset'} | resolvedUrl=${getRecxrImageTargetAssetUrl(stop.imageTargetName) || 'unset'} | imageTargetWidth=${typeof stop.imageTargetWidth === 'number' ? stop.imageTargetWidth : 'unset'} | anchorOffsetX=${stop.anchorOffsetX ?? 0} | anchorOffsetY=${stop.anchorOffsetY ?? 0} | anchorOffsetZ=${stop.anchorOffsetZ ?? 0} | anchorYaw=${stop.anchorYaw ?? 0}`
    : 'imageTargetName=unset | resolvedUrl=unset | imageTargetWidth=unset | anchorOffsetX=0 | anchorOffsetY=0 | anchorOffsetZ=0 | anchorYaw=0'
}
