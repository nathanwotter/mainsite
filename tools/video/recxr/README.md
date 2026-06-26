# RecXR Video Production Toolkit

This toolkit documents the packed-presenter video format expected by the current RecXR player and provides a small validator for checking exports before upload.

## Expected Packed Format

The current RecXR presenter path expects a normal video file with color and alpha packed vertically:

```text
Packed export: W x 2H

+--------------------------+
| RGB presenter, W x H     |  top half
+--------------------------+
| grayscale alpha, W x H   |  bottom half
+--------------------------+
```

- Top half: RGB presenter video.
- Bottom half: grayscale alpha matte.
- Alpha matte: white is opaque, black is transparent, gray is partial transparency.
- The shader reads luma from the bottom-half RGB channels. It does not read a file alpha channel.
- The top half should already be the final RGB image. No green background or chroma key is required for packed-alpha playback.
- Packing is top/bottom, not left/right.

## Production Presets

The recommended default for the current 16:9 WebXR plane is:

- Visible presenter half: `1280 x 720`
- Packed export: `1280 x 1440`

For a high-quality 16:9 packed export, use:

- Visible presenter half: `1920 x 1080`
- Packed export: `1920 x 2160`

Avoid using `1080 x 1920` as the default for the current WebXR plane. That export has `1080 x 960` visible halves, which are portrait-packed and not 16:9, so the visible presenter will stretch unless the WebXR plane geometry is changed to match.

## Current Player References

- Packed-alpha shader: `src/components/RecxrArGuide.astro`
- Canvas fallback packed-alpha decode: `src/components/RecxrArGuide.astro`
- RecXR Sanity/Mux stop mapping: `src/pages/recreation-futures-lab/recxr/[slug].astro`
- RecXR Sanity video mode fields: `studio/schemaTypes/recxrSite.ts`

## Validator

Run:

```bash
node tools/video/recxr/validate-packed-video.mjs path/to/export.mp4
```

The validator requires `ffprobe` from FFmpeg to be installed and available on your PATH.

It reports:

- width
- height
- whether height is even
- inferred visible height
- visible-half aspect ratio
- whether the visible half is 16:9
- frame count, if available
- duration, if available

Use the report as a pre-upload sanity check. It does not inspect the actual matte pixels yet.
