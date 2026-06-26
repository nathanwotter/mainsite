# RecXR Packed Presenter Fusion Macro Notes

These notes describe the intended Fusion graph for generating a packed presenter video from a keyed presenter.

## Target Output

The current RecXR player expects one normal video file with two stacked regions:

```text
+--------------------------+
| RGB presenter            |
| W x H                    |
+--------------------------+
| alpha matte              |
| W x H                    |
+--------------------------+

Final packed frame: W x 2H
```

The top half should be the final RGB presenter image. Packed-alpha playback does not chroma-key this image and does not require a green background.

For the recommended default production preset:

- RGB presenter: `1280 x 720`
- Alpha matte: `1280 x 720`
- Final export: `1280 x 1440`

This matches the current 16:9 WebXR video plane. For a higher-quality export, use `1920 x 1080` RGB and matte halves packed into a `1920 x 2160` final frame.

The older `1080 x 1920` packed export uses `1080 x 960` visible halves. That is portrait-packed and will stretch on the current WebXR plane unless the player plane geometry is changed.

## Fusion Node Strategy

Starting from a keyed presenter:

```text
MediaIn
  |
DeltaKeyer / keyed RGBA
  |
  +--> RGB branch
  |     - preserve the final presenter RGB image
  |     - do not prepare this branch for runtime chroma keying
  |     - resize to W x H
  |     - position in top half of final comp
  |
  +--> Matte branch
        - copy alpha channel into RGB
        - white subject on black background
        - resize to W x H
        - position in bottom half of final comp

Final Background / comp: W x 2H
```

## Placement

For a final comp of `1280 x 1440`:

- Put the RGB branch in the top `1280 x 720` region.
- Put the matte branch in the bottom `1280 x 720` region.
- Expect the validator to report that the visible half is 16:9.

If using normalized Transform centers:

- Top/RGB center: `X 0.5`, `Y 0.75`
- Bottom/matte center: `X 0.5`, `Y 0.25`

## Matte Requirements

The bottom half must be normal grayscale:

- white = opaque
- black = transparent
- gray = soft transparency

Do not invert the matte. Do not rely on a file alpha channel. Do not rely on green-screen removal. The current player reads the bottom-half RGB luma and uses that as alpha.

## Edge Quality

The RecXR shader combines:

- RGB from the top half
- alpha luma from the bottom half

If edges look dark or fringed, check whether the RGB branch is premultiplied against black. A clean straight/unpremultiplied presenter color pass usually produces better edges. If needed, test an AlphaDivide/unpremultiply step before packing the RGB branch.

Keep fully transparent RGB areas clean and dark to avoid codec noise around the subject.
