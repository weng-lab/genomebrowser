# useTrackDownload

Download the visible plot and title of one rendered track as SVG or PNG. Every track's settings dialog includes **Download image** buttons, including tracks without a custom settings form. Use this hook to add image downloads to custom browser-hosted controls.

## Usage

Import from `@weng-lab/genomebrowser`. Call the hook inside a track's settings, renderer, or tooltip, where the nearest mounted `GenomeBrowser` supplies the SVG and stores.

```tsx
import { useTrackDownload, type TrackSettingsProps } from "@weng-lab/genomebrowser";

export function ImageSettings({ track }: TrackSettingsProps<Record<string, never>>) {
  const { download, isDownloading, error } = useTrackDownload(track.base.id);

  return (
    <div>
      <button type="button" disabled={isDownloading} onClick={() => void download("png")}>
        Download PNG
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

Assign this component to a module's `settingsComponent` to exercise the public hook. The shared dialog already supplies SVG and PNG buttons, so a custom button is useful when an application needs different labels or presentation.

## API

```ts
type TrackImageFormat = "svg" | "png";

type TrackDownloadOptions = {
  includeRuler?: boolean;
};

type TrackDownload = {
  isDownloading: boolean;
  error: string | null;
  rulerTrackId: string | null;
  download(format: TrackImageFormat, options?: TrackDownloadOptions): Promise<boolean>;
};

function useTrackDownload(trackId: string): TrackDownload;
```

| Input     | Type               | Default  | Description                             |
| --------- | ------------------ | -------- | --------------------------------------- |
| `trackId` | `string`           | Required | ID of the track in the hosting browser. |
| `format`  | `TrackImageFormat` | Required | SVG vector image or PNG raster image.   |

`options` defaults to `{}`. Its `includeRuler` field defaults to `false`. Set it to `true` to capture the displayed ruler and selected track in a single file:

```ts
await download("png", { includeRuler: true });
```

`rulerTrackId` identifies the selected track when it is a ruler; otherwise it is the first ruler in display order, or `null` when there is none. This value updates as tracks are added, removed, or reordered. Ruler modules declare `isRuler: true` in [defineTrackModule](../03-trackDefinition/defineTrackModule.md#definition-options). The first-party `rulerModule` declares this flag.

The settings dialog uses MUI controls and the host theme. Its **Include ruler** checkbox starts unchecked and is disabled when no ruler is present or the selected track is itself a ruler. Calling `download` with `includeRuler: true` without a ruler reports an error. Exporting a ruler itself includes it once.

`download` captures the current track drawing and region when called. It resolves `true` after requesting a browser download; this does not confirm that the user saved the file. It resolves `false` on failure, cancellation, or a concurrent call through the same hook. Failures appear in `error`; a new attempt clears the error. `isDownloading` covers image preparation, including asynchronous PNG conversion.

The filename contains a sanitized track title, chromosome, and one-based inclusive visible coordinates, followed by the format extension. For example, a track titled `Signal` at internal region `chr1:1000-2000` downloads as `Signal_chr1_1001-2000.svg`. The capture and filename keep the region at the time of the call even if the viewport changes during PNG conversion.

## Image contents and dimensions

Images include the visible plot, its title, and track overlays on a white background. Existing clipping and pan transforms preserve the visible portion of the track. The margin controls, hover shading, tooltips, and browser-wide highlight layers are excluded.

When included, the ruler appears directly above the selected track with its current title, coordinate labels, and any displayed sequence bases. Intervening tracks are omitted. Both plots retain their genomic alignment and clipping.

SVG dimensions use the current logical track width and the sum of the included plots' and titles' heights. PNG rounds those dimensions up to whole pixels. With fixed sizing, logical width is independent of `GenomeBrowser.scale`. With responsive sizing, logical width changes with the available container width and `scale`, so export width changes too.

Core copies SVG definitions and computed presentation styles into the image. First-party SVG renderers work without module-specific export code. Custom renderers using external images, web fonts, or HTML inside `foreignObject` can depend on resources unavailable to a standalone SVG or the browser's PNG decoder. Such resources are not embedded by this API.

## Availability and lifetime

The hook throws if called outside a `GenomeBrowser`. A download reports an error when the track is missing, loading, or has a failed data request, or when PNG decoding or canvas encoding fails. The settings buttons are disabled while browser interactions are blocked and while their own download is being prepared.

Closing the settings dialog cancels its pending PNG conversion. Unmounting the hook, changing its track ID, replacing the hosting stores, or removing or updating either included track also cancels pending work. Cancellation resolves `false` without a new error. Repeated completed downloads are allowed. Temporary image URLs and download elements are released by core.

Each hook is scoped to its hosting browser, including when several browser instances share stores or track IDs. Export reads the current drawing and does not fetch track data.

See [track settings](../03-trackDefinition/trackSettings.md) and [browser setup](README.md).
