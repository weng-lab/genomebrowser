# useBrowserDownload

> **Experimental.** This API may change or be removed in a future release.

Download every rendered track of a browser as one SVG or PNG image. Unlike [useTrackDownload](useTrackDownload.md), this hook works outside the `GenomeBrowser` tree, so an application toolbar can call it with the browser store it already holds and a ref to the browser's SVG.

## Usage

```tsx
import {
  GenomeBrowser,
  useBrowserDownload,
  type BrowserStoreInstance,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import { useRef } from "react";

export function BrowserWithExport({
  browserStore,
  trackStore,
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { download, isDownloading, error } = useBrowserDownload(browserStore, svgRef);

  return (
    <div>
      <GenomeBrowser browserStore={browserStore} trackStore={trackStore} svgRef={svgRef} />
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

Pass the `browserStore` and `svgRef` given to the same `GenomeBrowser`. Each view of a shared store pair has its own ref, so the ref decides which view is exported. When the ref's browser is not rendered, `download` reports an error. To show the image before saving it, use [exportBrowserImage](exportBrowserImage.md).

## API

```ts
type BrowserDownloadOptions = {
  scale?: number;
  includeTitles?: boolean;
  includeRuler?: boolean;
  filename?: string;
};

type BrowserDownload = {
  isDownloading: boolean;
  error: string | null;
  defaultFilename: string;
  download(format: TrackImageFormat, options?: BrowserDownloadOptions): Promise<boolean>;
};

function useBrowserDownload(
  browserStore: BrowserStoreInstance,
  svgRef: RefObject<SVGSVGElement | null>,
): BrowserDownload;
```

| Input           | Type                   | Default  | Description                                                                                              |
| --------------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `browserStore`  | `BrowserStoreInstance` | Required | Store of the browser to export. Supplies the loading state and default file name.                        |
| `svgRef`        | `RefObject`            | Required | The ref passed to the browser's `svgRef` prop.                                                           |
| `format`        | `TrackImageFormat`     | Required | `"svg"` vector image or `"png"` raster image.                                                            |
| `scale`         | `number`               | `1`      | PNG pixels per browser unit. Must be positive. SVG ignores it.                                           |
| `includeTitles` | `boolean`              | `true`   | Include each track's title. Without titles, the title strips are removed and the plots move up.          |
| `includeRuler`  | `boolean`              | `true`   | Include tracks whose module declares `isRuler`. When `false`, the tracks below move up to close the gap. |
| `filename`      | `string`               | —        | File name without its extension. A matching extension is dropped, and blank names use `defaultFilename`. |

`download` resolves `true` after requesting a browser download, and `false` on failure, cancellation, or a concurrent call through the same hook. It refuses while any track is loading. Tracks with data errors are exported as rendered. The image shows the tracks as they were rendered when `download` was called, even if they change while a PNG is encoded. `defaultFilename` contains the chromosome and one-based visible coordinates, such as `genome-browser_chr1_1001-2000`, and updates as the region changes. Use it as a placeholder for a file name field. Without a `filename`, `download` uses the default for the region captured when it is called. Characters that file systems reject are replaced with `_`, and the format's extension is added.

## Image contents and size

Images contain every track in display order with its overlays, plus browser-wide highlights, on a white background. Titles and rulers are included by default. The margin column with track colors and controls, tooltips, hover shading, selection guides, and the loading shield are always excluded. Highlights stretch to the full image height when titles or rulers are left out. The image is the track width wide and as tall as the included tracks, regardless of the `GenomeBrowser` `scale` prop.

Features drawn outside the visible region, such as content preloaded for panning, are left out. Styles are written only where the standalone image would otherwise render differently.

Preparing an image blocks the page briefly, and the time grows with the number of features the tracks draw. Browsers limit canvas size, so `download("png")` reports an error when the image times `scale` exceeds 32,767 pixels on a side or about 268 million pixels in area. Some browsers, such as Safari on iOS, allow less. Download SVG for very tall browsers. `download` also reports an error when an image is too large for the browser to build as SVG.
