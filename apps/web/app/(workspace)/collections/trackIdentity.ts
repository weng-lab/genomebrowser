import type { AnyTrackInstance, TrackCollection } from "@weng-lab/genomebrowser";

/** Recognize the app's default tracks without changing IDs in existing sessions. */
export function resolveDefaultCollectionTrackId(
  track: AnyTrackInstance,
  collections: TrackCollection[],
): string | undefined {
  const isDefault =
    (track.base.id === "genes" && track.type === "gene") ||
    (track.base.id === "ccres" && track.type === "ccre-bigbed");
  if (!isDefault || typeof track.config.url !== "string") return;
  const matches = collections.flatMap((collection) =>
    collection.tracks
      .filter((entry) => entry.type === track.type && entry.config.url === track.config.url)
      .map((entry) => `${collection.id}::${entry.base.id}`),
  );
  if (matches.length === 1) return matches[0];
}
