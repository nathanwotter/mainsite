Place compiled image target files here for the first iPhone image-target runtime.

Expected convention:
- `/recxr/image-targets/<imageTargetName>.mind`

Example:
- If a stop uses `imageTargetName = "welcome-marker"`, the runtime will request:
  `/recxr/image-targets/welcome-marker.mind`

This first implementation uses one target index per stop and mounts the guide media
relative to that target with the configured width, offsets, and yaw.
