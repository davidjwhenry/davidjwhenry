# Hero art generator

Draws the `dh` mark — taken verbatim from `sites/david-henry/public/dh-mark.svg`
— as a README hero, in the `design-system/design.md` idiom: white ground, ink,
one mint moment, Inter 800 + DM Mono.

```sh
npm install          # opentype.js, once
node gen.js ../assets        # animated (what ships)
STATIC=1 node gen.js ../assets-static   # settled, no animation
```

Both fonts are vendored in `fonts/` so this runs with no network and no font
install. `Inter-ExtraBold.ttf` is the variable Inter instanced at `wght=800,
opsz=32`; `DMMono-Medium.ttf` is DM Mono 500. Both OFL.

## Why the text is drawn as paths

GitHub serves README images through its camo proxy and renders them as images,
so no external font ever loads. Live `font-family` would fall back to whatever
the viewer happens to have. Every glyph here is converted to a filled path, so
the type is identical on every machine.

`lib.js` serialises path data itself rather than using opentype.js's
`toPathData()`, which has a rounding bug that emits a `NaN` mid-path once
coordinates get large — SVG parsers stop at the bad command and silently drop
the rest of the glyph run. `gen.js` fails the build if `NaN` appears in any
output.

## Animation

CSS keyframes inside the SVG, which do run when the SVG is loaded as an
`<img>` (scripts do not, animations do). The base state of every element is the
**finished** artwork and the keyframes animate in from hidden, so a renderer
that ignores animations still shows the complete image rather than a blank
banner. `prefers-reduced-motion: reduce` disables it.
