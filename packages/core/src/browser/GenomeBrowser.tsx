import { BrowserCanvas } from "./BrowserCanvas";
import { BrowserProvider } from "./state/BrowserContext";
import type { BrowserStoreInstance } from "./state/browserStore";
import type { TrackStoreInstance } from "./state/trackStore";
import { useContainerWidth } from "./viewport/useContainerWidth";

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  /** Follow the container by default, or use the store's configured track width. */
  sizing?: "responsive" | "fixed";
  /** Magnification of the entire SVG. Must be finite and positive. */
  scale?: number;
};

export function GenomeBrowser({
  browserStore,
  trackStore,
  sizing = "responsive",
  scale = 1,
}: GenomeBrowserProps) {
  const useBrowserStore = browserStore;
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const configuredTrackWidth = useBrowserStore((state) => state.trackWidth);
  const { containerRef, width } = useContainerWidth(sizing === "responsive");

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("GenomeBrowser scale must be a finite positive number.");
  }

  const trackWidth =
    sizing === "fixed"
      ? configuredTrackWidth
      : width === null
        ? null
        : Math.max(1, width / scale - marginWidth);

  return (
    <div
      ref={containerRef}
      style={{
        width: sizing === "fixed" ? (marginWidth + configuredTrackWidth) * scale + 2 : "100%",
        maxWidth: "100%",
        minWidth: 0,
        padding: 0,
        boxSizing: "border-box",
        border: "1px solid #ccc",
        overflowX: "auto",
      }}
    >
      {trackWidth !== null && (
        <BrowserProvider
          browserStore={browserStore}
          trackStore={trackStore}
          trackWidth={trackWidth}
        >
          <BrowserCanvas trackWidth={trackWidth} scale={scale} />
        </BrowserProvider>
      )}
    </div>
  );
}
