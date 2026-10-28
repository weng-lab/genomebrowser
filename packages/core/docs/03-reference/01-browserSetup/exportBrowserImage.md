# exportBrowserImage

> **Experimental.** This API may change or be removed in a future release.

Prepare the same whole-browser image as [useBrowserDownload](useBrowserDownload.md) without saving it. Use it to show a preview first, or to export from code that is not a React component. Save the image later with `saveBrowserImage`.

## Usage

```tsx
import {
  exportBrowserImage,
  saveBrowserImage,
  type BrowserImage,
  type BrowserStoreInstance,
} from "@weng-lab/genomebrowser";
import { useState } from "react";

export function PreviewThenDownload({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const [image, setImage] = useState<BrowserImage | null>(null);
  const [url, setUrl] = useState<string>();

  const preview = async () => {
    const next = await exportBrowserImage(browserStore, "png", { scale: 2 });
    setImage(next);
    setUrl(URL.createObjectURL(next.blob));
  };

  return (
    <div>
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

Revoke object URLs you create once the preview closes. Call `saveBrowserImage` from a user action; browsers may block or ask about downloads that start without one.

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
  browserStore: BrowserStoreInstance,
  format: TrackImageFormat,
  options?: BrowserDownloadOptions,
  signal?: AbortSignal,
): Promise<BrowserImage>;

function saveBrowserImage(image: BrowserImage): void;
```

`options` are the same as for [useBrowserDownload](useBrowserDownload.md#api): `scale`, `includeTitles`, `includeRuler`, and `filename`.

| Field      | Description                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `blob`     | The SVG or PNG file contents.                                                                                 |
| `format`   | `"svg"` or `"png"`.                                                                                           |
| `filename` | File name with extension, from `options.filename` or the region, such as `genome-browser_chr1_1001-2000.png`. |
| `width`    | Image width in pixels: browser units for SVG, times `scale` for PNG.                                          |
| `height`   | Image height in pixels, measured the same way.                                                                |

The promise rejects with a readable `Error` in the cases `useBrowserDownload` reports: no mounted browser, tracks still loading, an invalid scale, or an image too large to build. It rejects with `signal.reason` when `signal` aborts, and with an error when tracks change while a PNG is being encoded. Unlike the hook, concurrent calls are allowed. The [image contents and size limits](useBrowserDownload.md#image-contents-and-size) are the same.
