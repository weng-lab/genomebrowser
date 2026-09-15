# UI troubleshooting

Start with the symptom below. The [API reference](reference/README.md) specifies accepted props and behavior; the [guides](README.md#guides) show complete integrations.

## Controls do not affect the displayed browser

Pass the same browser store to `GenomeBrowser`, `BrowserNavigationButton`, `BrowserSelectionControls`, and `HighlightDialog`. TrackSelect needs the same track store as GenomeBrowser. Creating another store with identical options still creates separate state.

Keep store instances stable across renders. Use a lazy state initializer for each mounted browser, or a file-scoped store for intentionally shared state. See [Add browser controls](gettingStarted/addBrowserControls.md#create-stores-for-the-browser).

Navigation buttons disable themselves when the requested movement is unavailable, including at chromosome boundaries. Invalid pan fractions or zoom factors also disable the action. See [navigation actions](reference/browserControls/BrowserNavigationButton.md#browsernavigationaction).

## The browser has no visible tracks

Give the browser container a positive width and register the modules for its tracks. In flex or grid layouts, `minWidth: 0` allows the container to shrink to the available space.

If the ruler appears but a signal track does not, check the track's URL, browser network errors, assembly, and selected region. UI controls do not load track data themselves.

When relying on `defaultTrackIds`, keep TrackSelect mounted even while it is closed. Rendering it only when `open` is true delays default initialization until the user opens the picker.

## The collection fails to open

Read the collection validation error. Confirm that every track type is registered and every config matches its module. Remove unsupported properties, give collections unique IDs, and give tracks unique IDs within each collection. Check that metadata fields used for columns and grouping exist in the collection entries.

Use the same modules for collection schema generation, validation, and the runtime store. TypeScript's `satisfies` checks structure but does not replace runtime validation.

Validation also runs while TrackSelect is closed. An application loading external collection data should handle loading and validation errors before rendering the picker. See [collection constraints](reference/trackSelection/TrackSelect.md#selection-and-validation-constraints).

## A selection resets unexpectedly

Initialization uses `initialTrackIds` when supplied, otherwise `defaultTrackIds`. Passing `[]` explicitly clears collection tracks; omitting both preserves the initial store.

TrackSelect can reapply the initial selection when it remounts, receives a different store, or its collection, view, or track IDs change. Changing `maxTracks` or the initial selection also reapplies it. The initial selection comes from `initialTrackIds`, or from `defaultTrackIds` when initial IDs are absent. Keep the picker mounted and use `open` for visibility. Keep restored IDs stable rather than feeding every live track change back into `initialTrackIds`.

Changing defaults while explicit initial IDs are present changes the Reset target without reinitializing the store. See [initial and reset selections](reference/trackSelection/TrackSelect.md#set-initial-and-reset-selections).

## A track cannot be selected

Check `maxTracks`, which defaults to 50 across all supplied collections. Increasing the draft beyond the limit opens a limit dialog. Remove selected tracks or raise the configured limit. Tracks outside the collections do not count toward it.

Initial and default lists must contain unique, known qualified IDs in the form `collectionId::trackId` and fit within the limit. A bare authored track ID is not a qualified ID.

## Submit fails or the order is unexpected

A failed creation, invalid interaction resolver result, or rejected store update leaves the store unchanged and keeps the dialog open with an error. Read that error and check the selected entries against their registered modules. Resolver output may contain only supported callback functions.

Newly selected tracks follow the active view's grouping and collection source order. Existing tracks retain their relative order. Reset restores the supplied default order in the draft; Submit then applies it. See [TrackSelect](reference/trackSelection/TrackSelect.md).

## A fixed track disappears or its source becomes read-only

TrackSelect treats IDs matching supplied collection entries as collection-owned. Give fixed tracks IDs outside that reserved set. Applying an initial selection or submitting a draft can reuse or remove a matching track even if application code created it directly.

Collection-owned tracks use `source: "host"`. First-party settings disable their source URL inputs. Other settings remain editable. This is expected behavior for tracks supplied through a collection.

## Saved selections do not match the browser

`onCommittedTrackIds` runs only after successful Submit. Initialization, Reset without Submit, Cancel, and direct store changes do not invoke it. It reports collection-qualified track IDs in order, excluding fixed tracks outside the collections.

Saving those IDs preserves selection and order, not changed track settings. Validate restored IDs against the current collections, and scope storage to the relevant assembly and collection set. See [restore and save a selection](guides/trackSelection.md#restore-and-save-a-selection).

A storage failure after Submit does not undo the accepted track update. Handle persistence errors in the callback and report them separately.

## MUI components show a license warning

Check that the application configures its MUI X Premium license before rendering TrackSelect. The package does not supply a key or read environment variables. See [license setup](../README.md#configure-the-mui-x-license), and check peer-dependency warnings for incompatible installed versions.

## The chromosome overview is empty

Check for fetch errors before rendering Cytobands. Supply matching chromosome names, valid cytoband records, a positive finite chromosome length, and usable numeric dimensions. Records for another chromosome do not render. The component does not fetch records or display a loading/error state.

For a missing viewport bracket, confirm `currentRegion.chromosome` matches the displayed chromosome and the region overlaps its extent. For missing highlights, check their chromosome and coordinates. Coordinates must use zero-based, half-open regions.

Custom tooltip content must be SVG-compatible. If it appears only on pointer hover, that is expected; keyboard focus does not open tooltips. See [Connect a chromosome overview](guides/chromosomeOverview.md) and the [Cytobands reference](reference/chromosomeOverview/Cytobands.md).
