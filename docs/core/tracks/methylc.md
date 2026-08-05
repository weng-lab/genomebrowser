# MethylC Track

`methylCModule` renders split-strand methylation signal from BigWig channels.

## Config

```ts
const track = methylCModule.create({
  id: "methylation",
  title: "Methylation",
  config: {
    urls: {
      plusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "YOUR_URL_HERE" },
        chh: { url: "YOUR_URL_HERE" },
        depth: { url: "YOUR_URL_HERE" },
      },
      minusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "YOUR_URL_HERE" },
        chh: { url: "YOUR_URL_HERE" },
        depth: { url: "YOUR_URL_HERE" },
      },
    },
  },
});
```

Fields:

- `urls`: plus-strand and minus-strand channel URLs for `cpg`, `chg`, `chh`, and `depth`
- `colors`: optional channel colors for `cpg`, `chg`, `chh`, and `depth`; every value uses six-digit `#RRGGBB` syntax
- `maskCpgByCoverage`: masks CpG values by coverage when `true`, default `false`
- `range`: optional fixed y-axis range with `{ min, max }`; `min` must be less than `max`

Display modes:

- `split`

Defaults:

- `height`: `100`
- `display`: `split`
- `colors.cpg`: `#648bd8`
- `colors.chg`: `#ff944d`
- `colors.chh`: `#ff00ff`
- `colors.depth`: `#525252`

## Fetch Behavior

The module fetches each non-empty channel URL as BigWig data. Empty channel URLs return empty data for that channel.

Changing any channel `url` triggers a refetch. Changing colors, `maskCpgByCoverage`, `range`, height, or display mode does not refetch data.
