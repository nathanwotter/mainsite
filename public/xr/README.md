Self-hosted 8th Wall integration assets should live under `/xr/`.

Expected files:
- `/xr/xr.js`
  The self-hosted 8th Wall XR engine binary.
- `/xr/xr-slam.js`
  Local SLAM chunk used for world tracking and horizontal-surface placement.
- `/xr/xr-face.js`
  Included in the self-hosted engine bundle layout even if this project does not use face effects.
- `/xr/recxr-8thwall-bootstrap.js`
  Project-specific adapter glue that exposes `window.Recxr8thWallIntegration`.

Expected bridge contract:
- `window.Recxr8thWallIntegration.startSession(config)`
- `window.Recxr8thWallIntegration.stopSession()`
- `window.Recxr8thWallIntegration.resetPlacement()`

Recommended config shape:
- `canvasContainer`
- `guide`
- `placement`
- `onStatus`
- `onSurfaceCandidate`
- `onWorldPlaced`
- `onPlacementReset`
- `onError`

Notes:
- The engine script is expected at `/xr/xr.js`, not `/xr/xrweb.js`.
- SLAM is required for this NCMA release flow. The current loader preloads it with
  `data-preload-chunks="slam"` on the local `xr.js` script tag and also calls
  `XR8.loadChunk('slam')` before the adapter starts the session when available.
- This release uses SLAM-only horizontal-surface placement by default.
- Keep Nathan upright on placement: yaw-only rotation, no pitch/roll tilt, feet on floor.
- If image-target mode returns later, add it back as a separate provider path instead of
  mixing it into the primary SLAM placement flow.
