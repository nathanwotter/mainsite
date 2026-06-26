# RecXR Packed Presenter QA Checklist

Use this checklist before uploading an AR guide video.

## Layout

- [ ] Video is top/bottom packed.
- [ ] Top half is RGB presenter video.
- [ ] Bottom half is grayscale alpha matte.
- [ ] Top and bottom halves have the same width and height.
- [ ] Packed height is exactly double the visible half height.
- [ ] Packed height is even.

## Alpha Matte

- [ ] White areas correspond to opaque subject regions.
- [ ] Black areas correspond to transparent background.
- [ ] Gray areas are only used for soft edges or intentional transparency.
- [ ] Matte is not inverted.
- [ ] Matte is stored in RGB grayscale, not only in a file alpha channel.

## RGB Presenter

- [ ] Presenter color appears in the top half only.
- [ ] Background outside the presenter is clean and does not contain green-screen spill.
- [ ] Edges do not show dark halos.
- [ ] If dark halos appear, test an unpremultiply/AlphaDivide step before packing.

## Dimensions

- [ ] Current requested preset, if used: `1080 x 1920` packed.
- [ ] Inferred visible half for that preset: `1080 x 960`.
- [ ] If using `1080 x 1920`, the non-16:9 visible half is intentional or the player plane geometry has been adjusted.
- [ ] If true 16:9 is required, use a visible half such as `1920 x 1080` and a packed export of `1920 x 2160`.
- [ ] Validator has been run.

## Player Expectations

- [ ] Sanity RecXR stop uses `Packed Alpha Guide`.
- [ ] Packed video is uploaded to the AR guide video field.
- [ ] A standard fallback video exists when useful.
- [ ] The packed export does not depend on a real alpha channel.
