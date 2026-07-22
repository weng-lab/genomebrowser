import type { TrackSelectCatalog } from "../schema/catalogSchema";

export function getInitialViewIds(trackCatalogs: TrackSelectCatalog[]) {
  return new Map(trackCatalogs.map((catalog) => [catalog.id, catalog.views[0].id]));
}

export function getActiveView(
  catalog: TrackSelectCatalog,
  activeViewIdByCatalog: Map<string, string>,
) {
  return (
    catalog.views.find((view) => view.id === activeViewIdByCatalog.get(catalog.id)) ??
    catalog.views[0]
  );
}
