import { useCallback, useSyncExternalStore } from "react";

type TagCatalog = {
  listeners: Set<() => void>;
  tags: readonly string[];
};

const emptyTags: readonly string[] = [];
const catalogsByUrl = new Map<string, TagCatalog>();

function getCatalog(url: string): TagCatalog {
  let catalog = catalogsByUrl.get(url);
  if (!catalog) {
    catalog = { listeners: new Set(), tags: emptyTags };
    catalogsByUrl.set(url, catalog);
  }
  return catalog;
}

export function publishObservedGeneTags(url: string, tags: Iterable<string>): void {
  const catalog = getCatalog(url);
  const nextTags = new Set(catalog.tags);
  let changed = false;

  for (const tag of tags) {
    if (!tag || nextTags.has(tag)) continue;
    nextTags.add(tag);
    changed = true;
  }

  if (!changed) return;
  catalog.tags = [...nextTags].toSorted((left, right) => left.localeCompare(right));
  for (const listener of catalog.listeners) listener();
}

export function getObservedGeneTags(url: string): readonly string[] {
  return getCatalog(url).tags;
}

export function useObservedGeneTags(url: string): readonly string[] {
  const subscribe = useCallback(
    (listener: () => void) => {
      const catalog = getCatalog(url);
      catalog.listeners.add(listener);
      return () => {
        catalog.listeners.delete(listener);
      };
    },
    [url],
  );
  const getSnapshot = useCallback(() => getObservedGeneTags(url), [url]);

  return useSyncExternalStore(subscribe, getSnapshot, () => emptyTags);
}
