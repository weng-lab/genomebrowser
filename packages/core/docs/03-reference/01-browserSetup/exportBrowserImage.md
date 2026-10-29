# exportBrowserImage

> **Experimental.** This API may change or be removed in a future release.

Prepare the same whole-browser image as [useBrowserDownload](useBrowserDownload.md) without saving it. Use it to show a preview first, or to export from code that is not a React component. It reads only the `<svg>` that a `GenomeBrowser` passes to its `svgRef` prop. Save the image later with `saveBrowserImage`.

## Usage

```tsx
import {
  GenomeBrowser,
  exportBrowserImage,
  getDefaultImageFilename,
  saveBrowserImage,
  type BrowserImage,
  type BrowserStoreInstance,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import { useRef, useState } from "react";

export function PreviewThenDownload({
  browserStore,
  trackStore,
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [image, setImage] = useState<BrowserImage | null>(null);
  const [url, setUrl] = useState<string>();

  const preview = async () => {
    const { isLoading, region } = browserStore.getState();
    if (isLoading) return;
    const filename = getDefaultImageFilename(region);
    const next = await exportBrowserImage(svgRef.current, "png", { scale: 2, filename });
    setImage(next);
    setUrl(URL.createObjectURL(next.blob));
  };

  return (
    <div>
      <GenomeBrowser browserStore={browserStore} trackStore={trackStore} svgRef={svgRef} />
      <button type="button" onClick={() => void preview()}>
        Preview
      </button>
      {image && <img src={url} alt="Genome browser export" width={image.width / 2} />}
      {image && (
        <button type="button" onClick={() => saveBrowserImage(image)}>
          Download {image.filename}
        </button>
      )}
    </div>
  );
}
```

Check the browser store's `isLoading` before exporting: the image shows tracks as rendered, including any still loading. Revoke object URLs you create once the preview closes. Call `saveBrowserImage` from a user action; browsers may block or ask about downloads that start without one.

## API

```ts
type BrowserImage = {
  blob: Blob;
  format: TrackImageFormat;
  filename: string;
  width: number;
  height: number;
};

function exportBrowserImage(
  svg: SVGSVGElement | null,
  format: TrackImageFormat,
  options?: BrowserDownloadOptions,
  signal?: AbortSignal,
): Promise<BrowserImage>;

function saveBrowserImage(image: BrowserImage): void;

function getDefaultImageFilename(region: GenomicRegion): string;
```

`options` are the same as for [useBrowserDownload](useBrowserDownload.md#api): `scale`, `includeTitles`, `includeRuler`, and `filename`. A blank `filename` becomes `genome-browser`; `getDefaultImageFilename` gives the name the hook uses for a region, such as `genome-browser_chr1_1001-2000`.

| Field      | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `blob`     | The SVG or PNG file contents.                                                                   |
| `format`   | `"svg"` or `"png"`.                                                                             |
| `filename` | File name with extension, from `options.filename`, such as `genome-browser_chr1_1001-2000.png`. |
| `width`    | Image width in pixels: browser units for SVG, times `scale` for PNG.                            |
| `height`   | Image height in pixels, measured the same way.                                                  |

The promise rejects with a readable `Error` when `svg` is `null` or no longer rendered, the scale is invalid, or the image is too large to build. It rejects with `signal.reason` when `signal` aborts. The image is captured when the call starts, so later track changes do not affect it. Unlike the hook, concurrent calls are allowed. The [image contents and size limits](useBrowserDownload.md#image-contents-and-size) are the same.
