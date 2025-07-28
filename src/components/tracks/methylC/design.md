# 🧬 MethylC Track Design Specifications

## Overview

The *MethylC* track displays DNA methylation data as a paired track (forward and reverse strand). Each track visualizes:

- **Bars**: Methylation ratio (range 0 to 1)

- **Line overlay**: Read depth (plotted on the same x-axis, scaled to its own y-range)

- **Empty regions** (i.e., no data for the current strand and position) are rendered with a distinct background color.

This track helps users visually compare methylation patterns across strands, contexts (CG/CHG/CHH), and coverage levels.

## Track Configuration

### Basic Example

```json
{
  "id": "methylc-h1",
  "trackType": "methylc",
  "displayMode": "full",
  "title": "H1 Methylation",
  "height": 120,
  "url": "https://vizhub.wustl.edu/public/hg19/methylc2/h1.liftedtohg19.gz",
  "colors": {
    "CG": { "color": "#648bd8", "background": "#d9d9d9" },
    "CHG": { "color": "#ff944d", "background": "#ffe0cc" },
    "CHH": { "color": "#ff00ff", "background": "#ffe5ff" }
  },
  "emptyColor":"#000000",
  "depthColor": "#01E9FE"
}
```

| Key          | Type   | Description                                                   |
| ------------ | ------ | ------------------------------------------------------------- |
| `trackType`  | string | Should be `"methylc"`                                         |
| `title`      | string | Display name of the track                                     |
| `url`        | string | Backend endpoint serving the Tabix-indexed methylation data   |
| `height`     | number | Total height in pixels (split across forward/reverse strands) |
| `colors`     | object | Color mapping for CG / CHG / CHH methylation contexts         |
| `emptyColor` | string | Hex color for regions with no data                            |
| `depthColor` | string | Color for the read depth line                                 |


## methylC BedGraph Format

| chromosome | start |  end  | methylation context | methylation value | strand | read depth |
| ---------- | ----- | ----- | ------------------- | ----------------- | ------ | ---------- |
| chr1       | 10542 | 10543 | CG                  | 0.923             | -      | 26         |
| chr1       | 10556 | 10557 | CHH                 | 0.040             | -      | 25         |
| chr1       | 10562 | 10563 | CG                  | 0.941             | +      | 17         |
| chr1       | 10563 | 10564 | CG                  | 0.958             | -      | 24         |
| chr1       | 10564 | 10565 | CHG                 | 0.056             | +      | 18         |
| chr1       | 10566 | 10567 | CHG                 | 0.045             | -      | 22         |
| chr1       | 10570 | 10571 | CG                  | 0.870             | +      | 23         |
| chr1       | 10571 | 10572 | CG                  | 0.913             | -      | 23         |

The bedGraph file should be compressed with bgzip and indexed with Tabix for efficient access.

