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

For the current requested production preset:

- RGB presenter: `1080 x 960`
- Alpha matte: `1080 x 960`
- Final export: `1080 x 1920`

This is a portrait packed preset. Its visible half is not 16:9, while the current WebXR video plane is 16:9. Use it only when that portrait packed production target is intentional, or update the player plane geometry to match.

## Fusion Node Strategy

Starting from a keyed presenter:

```text
MediaIn
  |
DeltaKeyer / keyed RGBA
  |
  +--> RGB branch
  |     - preserve clean presenter RGB
  |     - use a black/transparent-safe background outside the subject
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

For a final comp of `1080 x 1920`:

- Put the RGB branch in the top `1080 x 960` region.
- Put the matte branch in the bottom `1080 x 960` region.
- Expect the validator to warn that the visible half is not 16:9.

If using normalized Transform centers:

- Top/RGB center: `X 0.5`, `Y 0.75`
- Bottom/matte center: `X 0.5`, `Y 0.25`

## Matte Requirements

The bottom half must be normal grayscale:

- white = opaque
- black = transparent
- gray = soft transparency

Do not invert the matte. Do not rely on a file alpha channel. The current player reads the bottom-half RGB luma and uses that as alpha.

## Edge Quality

The RecXR shader combines:

- RGB from the top half
- alpha luma from the bottom half

If edges look dark or fringed, check whether the RGB branch is premultiplied against black. A clean straight/unpremultiplied presenter color pass usually produces better edges. If needed, test an AlphaDivide/unpremultiply step before packing the RGB branch.

Keep fully transparent RGB areas clean and dark to avoid codec noise around the subject.
