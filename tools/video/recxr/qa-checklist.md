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

- [ ] Final presenter RGB appears in the top half only.
- [ ] Top half does not require a green background or runtime chroma key.
- [ ] Transparency comes exclusively from the bottom-half matte.
- [ ] Edges do not show dark halos.
- [ ] If dark halos appear, test an unpremultiply/AlphaDivide step before packing.

## Dimensions

- [ ] Default preset, if used: `1280 x 1440` packed.
- [ ] Inferred visible half for the default preset: `1280 x 720`.
- [ ] High-quality preset, if used: `1920 x 2160` packed with `1920 x 1080` visible halves.
- [ ] If using `1080 x 1920`, the portrait-packed `1080 x 960` visible half is intentional or the WebXR plane geometry has been adjusted.
- [ ] Validator has been run.

## Player Expectations

- [ ] Sanity RecXR stop uses `Packed Alpha Guide`.
- [ ] Packed video is uploaded to the AR guide video field.
- [ ] A standard fallback video exists when useful.
- [ ] The packed export does not depend on a real alpha channel.
- [ ] The packed export does not depend on chroma-key removal.
