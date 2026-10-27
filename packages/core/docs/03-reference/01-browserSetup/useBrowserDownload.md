# useBrowserDownload

> **Experimental.** This API may change or be removed in a future release.

Download every rendered track of a browser as one SVG or PNG image. Unlike [useTrackDownload](useTrackDownload.md), this hook works outside the `GenomeBrowser` tree, so an application toolbar can call it with the browser store it already holds.

## Usage

```tsx
import { useBrowserDownload, type BrowserStoreInstance } from "@weng-lab/genomebrowser";

export function ExportButtons({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const { download, isDownloading, error } = useBrowserDownload(browserStore);

  return (
    <div>
      <button type="button" disabled={isDownloading} onClick={() => void download("svg")}>
        Download SVG
      </button>
      <button
        type="button"
        disabled={isDownloading}
        onClick={() => void download("png", { scale: 2 })}
      >
        Download PNG
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

Pass the same `browserStore` given to a mounted `GenomeBrowser`. When no browser is mounted with that store, `download` reports an error.

## API

```ts
type BrowserDownloadOptions = {
  scale?: number;
};

type BrowserDownload = {
  isDownloading: boolean;
  error: string | null;
  download(format: TrackImageFormat, options?: BrowserDownloadOptions): Promise<boolean>;
};

function useBrowserDownload(browserStore: BrowserStoreInstance): BrowserDownload;
```

| Input          | Type                   | Default  | Description                                                    |
| -------------- | ---------------------- | -------- | -------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Store of the mounted browser to export.                        |
| `format`       | `TrackImageFormat`     | Required | `"svg"` vector image or `"png"` raster image.                  |
| `scale`        | `number`               | `1`      | PNG pixels per browser unit. Must be positive. SVG ignores it. |

`download` resolves `true` after requesting a browser download, and `false` on failure, cancellation, or a concurrent call through the same hook. It refuses while any track is loading. Tracks with data errors are exported as rendered. A pending PNG is cancelled when tracks are added, removed, reordered, or changed. The filename contains the chromosome and one-based visible coordinates captured when `download` is called, such as `genome-browser_chr1_1001-2000.png`.

## Image contents and size

Images contain every track in display order with its title and overlays, plus browser-wide highlights, on a white background. Margin controls, tooltips, selection guides, and the loading shield are excluded. The image is the track width wide and the browser's full height tall, regardless of the `GenomeBrowser` `scale` prop.

Features drawn outside the visible region, such as content preloaded for panning, are left out. Styles are written only where the standalone image would otherwise render differently.

Preparing an image blocks the page briefly, and the time grows with the number of features the tracks draw. Browsers limit canvas size, so `download("png")` reports an error when the image times `scale` exceeds 32,767 pixels on a side or about 268 million pixels in area. Some browsers, such as Safari on iOS, allow less. Download SVG for very tall browsers. `download` also reports an error when an image is too large for the browser to build as SVG.
