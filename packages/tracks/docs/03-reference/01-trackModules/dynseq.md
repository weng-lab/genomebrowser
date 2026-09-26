# dynseq

`dynseqModule` behaves like a [BigWig track](bigwig.md), replacing the full signal plot
with score-scaled reference nucleotides when zoomed in. It uses the same signal renderer,
viewport scaling, hover behavior, and signal settings as BigWig.

```ts
import { dynseqModule } from "@weng-lab/genomebrowser-tracks/dynseq";

dynseqModule.create({
  base: { id: "phylop", title: "phyloP" },
  config: { url: "YOUR_URL_HERE", twoBitUrl: "YOUR_URL_HERE" },
});
```

## Displays and defaults

The `full` display shows letters when the shared browser gate enables detail and sequence is available. Otherwise it draws the BigWig signal. The `dense` display always uses BigWig's dense signal renderer.

The host sets `basePairDetail.maxVisibleBases` in `createBrowserStore`, or changes it with `setBasePairDetail`. The default is 100 visible bp, inclusive. Core's `useBasePairDetail()` enables letters at 8 logical SVG units per base and keeps them visible down to 6. Overscan does not affect the gate; resizing uses the actual plot width. Responsive UI scale changes logical width, while fixed sizing scale leaves the gate unchanged.

Defaults match BigWig: display `full`, height `80`, and color `#2266aa`.
Nucleotides use their own colors; the base color controls the signal plot.

## Configuration

| Option                | Default   | Meaning                                                                                                            |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `url`                 | required  | Score BigWig URL.                                                                                                  |
| `twoBitUrl`           | required  | Reference 2bit URL for letters.                                                                                    |
| `fillWithZero`        | `false`   | Treat missing signal pixels as zero when drawing signal and determining the range. Does not invent scored letters. |
| `yRange`              | automatic | Optional `{ min?: number, max?: number }` bounds. Both specified bounds must satisfy `min < max`.                  |
| `showClampIndicators` | `true`    | Mark values clipped by the range in full signal and sequence views.                                                |
| `clampIndicatorColor` | `#ff0000` | Six-digit hexadecimal indicator color.                                                                             |

Changing either URL refetches. Other settings update rendering
without refetching. Settings use the shared base, height, range, and rendering controls;
host-owned tracks disable URL editing.

## Fetching and reference availability

At signal resolution, dynseq uses the same resolution-aware BigWig reader as BigWig,
including zoom summaries. It retains intervals rather than allocating a point for each base.
Dense display never requests reference sequence.

Within the browser's bp cutoff, full display reads raw scores and reference sequence for the render region. This includes overscan and happens even when the width guard hides letters. It retains the last successful reference window, so resizing the same region reuses sequence. Outside the cutoff, or in dense display, it reads signal without reference sequence.

A broken reference does not affect views outside the bp cutoff or dense displays. Within the cutoff, a reference request failure reports a track fetch error, including on narrow plots. If the reference contains no sequence for the region, the track shows the available signal instead.

Both files must support HTTP range requests and send permissive CORS headers when cross-origin.
See [Data source troubleshooting](../../04-troubleshooting.md).

## Sequence scaling and gaps

Letters use BigWig's automatic viewport range or the configured bounds. Offscreen scores
in overscan do not determine the range. Positive scores extend upward from the zero baseline;
negative scores extend downward. The baseline is clipped to the range when zero is outside it.

Each glyph occupies one genomic base even when scores are sparse. Lowercase reference
bases are uppercased before choosing a glyph. Missing scores and unsupported reference
characters have no letter. Zero-height letters have no visible glyph, but scored supported
bases retain a full-height hover target so their position and score remain inspectable.

## Data and interactions

`DynseqData` contains `signal`, an array of BigWig source or summary records, and `sequence`,
an array of 2bit records. Sequence is empty outside the bp cutoff and in dense display.

`DynseqItem` is `SignalPoint | DynseqPoint`. `DynseqPoint` has `{ position, score, base }`;
position is zero-based and base is uppercase. Hover and leave callbacks receive a signal
point in signal displays and a nucleotide point in sequence view. Check `"base" in item`
to distinguish them. Tooltips show the signal value or the nucleotide's position and score.

`DynseqInteraction` types those callbacks. `DynseqDisplay` is `"full" | "dense"`.
`DynseqCreateInput` and `DynseqConfig` describe creation input and resolved configuration.
All these types are exported from the `/dynseq` entry point.

## Glyphs

The nucleotide shapes use the weng-lab LogoJS geometry as SVG paths.
`NUCLEOTIDE_GLYPHS` and `NUCLEOTIDE_COLORS` are exported from `/dynseq` for applications
that draw the same letters elsewhere.
