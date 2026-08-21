import type { TrackResources } from "../../modules/types";

export type TrackResourceScope = Readonly<{ type: string; id: string }>;

/**
 * Owns the per-track value maps exposed to fetchers through
 * `TrackFetchContext.resources`. One instance lives for the lifetime of one
 * mounted `GenomeBrowser`, so browser instances cannot reach each other's
 * values. Scopes are keyed structurally by track type and track ID; fetchers
 * only ever supply local string keys.
 */
export type TrackResourceStoreInstance = {
  resourcesFor(scope: TrackResourceScope): TrackResources;
  /**
   * Drops every scope whose (type, ID) pair is not in `scopes`. Called with
   * the current track list so removing a track releases its stored values.
   */
  retain(scopes: Iterable<TrackResourceScope>): void;
  /** Releases all remaining values. Called when the browser unmounts. */
  clear(): void;
};

export function createTrackResourceStore(): TrackResourceStoreInstance {
  const scopes = new Map<string, Map<string, unknown>>();

  const getScopeValues = (scope: TrackResourceScope) => {
    const key = `${scope.type}\u0000${scope.id}`;
    let values = scopes.get(key);
    if (!values) {
      values = new Map();
      scopes.set(key, values);
    }
    return values;
  };

  return {
    resourcesFor(scope) {
      const values = getScopeValues(scope);
      return {
        get: <T>(key: string) => values.get(key) as T | undefined,
        set: (key, value) => {
          values.set(key, value);
        },
        delete: (key) => {
          values.delete(key);
        },
        clear: () => {
          values.clear();
        },
      };
    },
    retain(activeScopes) {
      const activeKeys = new Set(
        [...activeScopes].map((scope) => `${scope.type}\u0000${scope.id}`),
      );
      for (const [key, values] of scopes) {
        if (!activeKeys.has(key)) {
          // Empty the map as well so facades a fetcher still holds observe
          // the release instead of writing to a detached scope.
          values.clear();
          scopes.delete(key);
        }
      }
    },
    clear() {
      for (const values of scopes.values()) values.clear();
      scopes.clear();
    },
  };
}
