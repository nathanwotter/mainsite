export type UprightPlacementInput = {
  anchorOffsetX?: number | null
  anchorOffsetY?: number | null
  anchorOffsetZ?: number | null
  anchorYaw?: number | null
}

export function getUprightGuidePlacement(input: UprightPlacementInput, guideHeight: number) {
  const offsetX = typeof input.anchorOffsetX === 'number' ? input.anchorOffsetX : 0
  const offsetY = typeof input.anchorOffsetY === 'number' ? input.anchorOffsetY : 0
  const offsetZ = typeof input.anchorOffsetZ === 'number' ? input.anchorOffsetZ : 0
  const yaw = typeof input.anchorYaw === 'number' ? input.anchorYaw : 0

  return {
    position: {
      x: offsetX,
      y: (guideHeight / 2) + offsetY,
      z: offsetZ,
    },
    rotation: {
      x: 0,
      y: (yaw * Math.PI) / 180,
      z: 0,
    },
    yawDegrees: yaw,
  }
}
