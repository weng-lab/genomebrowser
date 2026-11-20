/**
 * Names collection views and sorting use for a track's own ID, title, and type. A metadata
 * field with one of these names would be hidden behind the track's own value, so editors
 * refuse them.
 */
export const builtInTrackFields: readonly string[] = ["id", "title", "type"];
