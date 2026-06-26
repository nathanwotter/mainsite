# RecXR Packed Presenter Render Settings

## Format

- Container: MP4 or MOV suitable for Mux upload.
- Codec: H.264 or H.265.
- File alpha: none required.
- Pixel aspect ratio: square pixels.
- Frame size: packed top/bottom layout, `W x 2H`.
- Chroma key: not used for packed-alpha playback.

## Recommended Default Preset

- Visible RGB presenter: `1280 x 720`
- Visible alpha matte: `1280 x 720`
- Final packed export: `1280 x 1440`

This is the default recommendation for the current 16:9 WebXR plane.

## AR Scale Settings

Set the physical AR size in Sanity on each RecXR experience stop:

- Field: `presenterWorldHeightMeters`
- Default: `1.75`
- Standing adults: usually `1.7` to `1.9`
- 6 ft presenter: about `1.83`
- Props/tabletop objects: use smaller values appropriate to the object
- Valid range: `0.3` to `2.5`

Packed-alpha playback uses this field as the fixed world-space plane height. The video resolution only supplies the visible-half aspect ratio, so a `1280 x 1440` packed video displays as a `1280 x 720` 16:9 plane at the configured physical height.

## High-Quality 16:9 Preset

For a higher-quality export:

- Visible RGB presenter: `1920 x 1080`
- Visible alpha matte: `1920 x 1080`
- Final packed export: `1920 x 2160`

## Portrait-Packed Legacy / Special Case

`1080 x 1920` exports use `1080 x 960` visible halves. That visible half is not 16:9, because `1080 / 960 = 1.125`. Use this only when portrait-packed output is intentional or the WebXR plane geometry has been changed to match; otherwise the presenter will stretch.

## Matte Encoding

The alpha matte must be encoded as RGB grayscale in the bottom half:

- white subject = opaque
- black background = transparent
- gray edges = partial transparency
- not inverted

The player computes alpha from RGB luma:

```text
alpha = 0.299R + 0.587G + 0.114B
```

## Export Checks

Before upload:

1. Confirm final height is exactly twice the visible height.
2. Confirm final height is even.
3. Confirm the top half contains the final RGB presenter image, not a green-screen plate for runtime keying.
4. Confirm the bottom half contains only the grayscale matte.
5. Confirm the matte is not inverted.
6. Confirm there is no letterboxing inside either half unless intentional.
7. Run the validator:

```bash
node tools/video/recxr/validate-packed-video.mjs path/to/export.mp4
```
