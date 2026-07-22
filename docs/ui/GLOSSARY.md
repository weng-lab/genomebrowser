# Glossary

## Track catalog

A track catalog is a named collection of available track entries and the views used to browse them in TrackSelect. Use `track catalog` as the domain term for these collections. Treat `folder` as legacy terminology unless referring to filesystem directories.

## Catalog view

A catalog view defines the columns, grouping fields, and leaf label used to browse one track catalog. The active view also determines the grouping-based insertion order for newly submitted tracks.

## Draft selection

The draft selection is the TrackSelect session's uncommitted set of selected catalog tracks. Catalog interactions, Clear, and Reset change the draft; only Submit changes the track store.

## Catalog-qualified ID

A catalog-qualified ID uses `${catalogId}::${trackId}` to combine catalog identity with track identity so equal track IDs from different catalogs remain distinct. It is the public identity accepted by TrackSelect APIs such as `defaultTrackIds`, not a field authored inside a catalog track.

## Module registry

The module registry is the runtime track store's map of track types to their modules. TrackSelect uses it to validate catalog entries and create submitted track instances.

## Track store

The track store is the Zustand hook that owns committed track instances and their order. The same store instance must be shared by TrackSelect and the `GenomeBrowser` it controls.
