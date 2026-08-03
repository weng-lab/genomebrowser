# Glossary

## Track collection

A track collection is a named group of available track entries and the views used to browse them in TrackSelect. Use `track collection` as the domain term. Treat `folder` as legacy terminology unless referring to filesystem directories.

## Collection view

A collection view defines the columns, grouping fields, and leaf label used to browse one track collection. The active view also determines the grouping-based insertion order for newly submitted tracks.

## Draft selection

The draft selection is the TrackSelect session's uncommitted set of selected collection tracks. Collection interactions, Clear, and Reset change the draft; only Submit changes the track store.

## Collection-qualified ID

A collection-qualified ID uses `${collectionId}::${trackId}` to combine collection identity with track identity so equal track IDs from different collections remain distinct. It is the public identity accepted by TrackSelect APIs such as `defaultTrackIds`, not a field authored inside a collection track.

## Module registry

The module registry is the runtime track store's map of track types to their modules. TrackSelect uses it to validate collection entries and create submitted track instances.

## Track store

The track store is the Zustand hook that owns committed track instances and their order. The same store instance must be shared by TrackSelect and the `GenomeBrowser` it controls.
