# DownloadImageDialog

> **Experimental.** This dialog uses the experimental `useBrowserDownload` hook from `@weng-lab/genomebrowser` and may change.

`DownloadImageDialog` lets people download every track and highlight in the current region as one SVG or PNG image. Pass the same browser store instance used by a mounted `GenomeBrowser`. The host owns the dialog's visibility.

## Usage

`ControlToolbar` and `ManagementControls` provide a **Download image** icon button through `onDownloadImage`:

```tsx
import { useState } from "react";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { DownloadImageDialog, ManagementControls } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
});

const useTrackStore = createTrackStore({ modules: [] });

export function BrowserWithImageDownload() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ManagementControls onDownloadImage={() => setOpen(true)} />
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <DownloadImageDialog
        browserStore={useBrowserStore}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

## Behavior

The **File name** field shows the default name, based on the chromosome and visible coordinates, as its placeholder, followed by the chosen format's extension. Leaving it blank uses the default. A typed name applies to that download and is cleared when the dialog is reopened.

SVG is selected by default. Choosing PNG shows **Resolution** options of 1×, 2× (default), and 3× the browser's size. Under **Include**, **Track titles** and **Ruler** start checked. Leaving out titles or rulers moves the remaining tracks up so the image has no gaps. The margin column with track colors and controls is never included. The dialog keeps the format, resolution, and include choices when it is reopened.

**Download** is disabled while tracks load. Selecting it shows progress, then closes the dialog once the browser download starts. Large browsers can take a few seconds to prepare. Failures, such as a PNG beyond the browser's canvas limits, appear in the dialog, which stays open so people can choose SVG or a lower resolution. Closing the dialog before the image is ready cancels it.

## API

### DownloadImageDialogProps

| Prop           | Type                   | Default  | Description                                          |
| -------------- | ---------------------- | -------- | ---------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Store of the mounted browser to capture.             |
| `open`         | `boolean`              | Required | Whether the dialog is open.                          |
| `onClose`      | `() => void`           | Required | Called when the user requests that the dialog close. |

## Accessibility

The dialog uses MUI's modal focus and keyboard behavior, labels each option group, and announces progress as a status. Its close button is named **Close download image**.
