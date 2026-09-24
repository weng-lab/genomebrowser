import type { BrowserStoreInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import type { JsonValue, SessionSnapshot } from "./types";

// Reject values JSON would silently drop or change. Optional object properties may be absent.
function toJson(value: unknown, ancestors = new Set<object>()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || ancestors.has(value))
    throw new Error("Session data must be JSON serializable.");
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  ) {
    throw new Error("Session data must contain only plain objects and arrays.");
  }
  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.map((item) => toJson(item, ancestors))
    : Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, toJson(item, ancestors)]),
      );
  ancestors.delete(value);
  return result;
}

export function captureSessionSnapshot(
  browserStore: BrowserStoreInstance,
  trackStore: TrackStoreInstance,
): SessionSnapshot {
  const browser = browserStore.getState();
  const tracks = trackStore.getState();
  const snapshot: SessionSnapshot = {
    version: 1,
    browser: {
      assembly: browser.assembly,
      region: browser.region,
      highlights: browser.highlights,
      marginWidth: browser.marginWidth,
      trackWidth: browser.trackWidth,
      fontSize: browser.fontSize,
      titleSize: browser.titleSize,
      selectionHighlight: browser.selectionHighlight,
    },
    trackStore: {
      tracks: tracks.tracks.map(({ type, base, config, source }) => ({
        type,
        base,
        config: toJson(config) as Record<string, JsonValue>,
        source,
      })),
      pinnedTrackIds: [...tracks.pinnedTrackIds],
    },
  };
  // Detach the captured data from store objects before an asynchronous save.
  return JSON.parse(JSON.stringify(toJson(snapshot))) as SessionSnapshot;
}
