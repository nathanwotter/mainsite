# RecXR Packed Presenter Render Settings

## Format

- Container: MP4 or MOV suitable for Mux upload.
- Codec: H.264 or H.265.
- File alpha: none required.
- Pixel aspect ratio: square pixels.
- Frame size: packed top/bottom layout, `W x 2H`.

## Current Requested Preset

- Visible RGB presenter: `1080 x 960`
- Visible alpha matte: `1080 x 960`
- Final packed export: `1080 x 1920`

The validator will report that the visible half is not 16:9, because `1080 / 960 = 1.125`. Use this preset only when the portrait packed export is the desired production target.

## True 16:9 Alternative

If the visible presenter half should be true 16:9:

- Visible RGB presenter: `1920 x 1080`
- Visible alpha matte: `1920 x 1080`
- Final packed export: `1920 x 2160`

## Matte Encoding

The alpha matte must be encoded as RGB grayscale in the bottom half:

- white subject = opaque
- black background = transparent
- gray edges = partial transparency

The player computes alpha from RGB luma:

```text
alpha = 0.299R + 0.587G + 0.114B
```

## Export Checks

Before upload:

1. Confirm final height is exactly twice the visible height.
2. Confirm final height is even.
3. Confirm the top half contains only the color presenter.
4. Confirm the bottom half contains only the grayscale matte.
5. Confirm the matte is not inverted.
6. Confirm there is no letterboxing inside either half unless intentional.
7. Run the validator:

```bash
node tools/video/recxr/validate-packed-video.mjs path/to/export.mp4
```

