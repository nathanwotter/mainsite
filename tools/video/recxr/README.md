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
- Packing is top/bottom, not left/right.

## Production Presets

The current requested packed presenter preset is:

- Visible presenter half: `1080 x 960`
- Packed export: `1080 x 1920`

Note: `1080 x 960` is not mathematically 16:9. The current WebXR panel geometry is 16:9, so a non-16:9 visible half may be stretched in that path. The validator reports the visible-half aspect ratio explicitly so this is easy to catch.

For a true 16:9 visible half, use dimensions such as:

- Visible presenter half: `1920 x 1080`
- Packed export: `1920 x 2160`

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

