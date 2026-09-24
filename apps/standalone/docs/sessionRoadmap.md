# Session roadmap

Planned session and collection workflows, and the product questions they raise. [Session persistence](sessionPersistence.md) describes what is implemented today. Terms follow the [glossary](glossary.md).

The standalone genome browser is for researchers exploring genomic regions and comparing tracks from provided datasets and their own data sources. Sessions let them return to ongoing work. Collections help them organize tracks for use across that work.

## Explore without an account

Planned: guests begin with default tracks and access to provided track collections. They can adjust the browser and tracks while they work. Their current setup is saved temporarily in the tab using `sessionStorage`, so a reload restores it. Guest work has no saved session.

For example, a researcher opens the browser, moves to a gene, adds a provided track, and adjusts its appearance. Reloading the same tab brings back that working setup.

Today, guests start from the same initial snapshot as new sessions, but a reload discards their changes. The transition from guest work to a signed-in session still needs a decision.

## Return to saved work

Signed-in users can already create, autosave, reopen, and delete saved sessions. Still open: recovering unsaved edits after failed saves, switching sessions, sign-out, or a conflicting update, and whether to warn before navigating away with pending changes.

For example, a researcher arranges several tracks around a region of interest, changes their colors and heights, and returns later. Opening that session restores those choices so they can continue their comparison.

## Work within one assembly

Agreed: every session has a fixed genome assembly. All tracks in that session are interpreted in that assembly's coordinate system.

For example, a researcher working in an hg38 session adds a custom track URL. The browser treats its data as hg38. If the file actually contains mouse coordinates, supplying the wrong data is the user's error; the browser cannot reliably verify the underlying assembly.

Additional assemblies, reference sources, and provided collections are added to the assembly registry. A mouse ENCODE biosample collection is wanted but not yet available.

## Organize reusable tracks

Agreed first-version scope: users add custom tracks through hosted data URLs and organize them into collections that act like folders. Their custom tracks are available across sessions. Actual file uploads are deferred.

For example, a researcher groups several hosted signal tracks into a collection called "Pilot study." They can use those tracks while working in different sessions without registering the URLs again.

A custom track and a session's track instance are separate. Once added, the session stores an independent serialized track with no collection dependency. Changing its appearance in one session does not change the custom track or another session. Changes to a collection must not rewrite existing session tracks.

Today, each account has one custom collection per assembly. Named collections, collection editing, and deletion remain planned.

## Choose collections for a session

Exploratory: users may be able to add, disable, or remove collections from individual sessions while keeping their personal collections available across the account.

For example, a researcher may want "Pilot study" available in one session and a different set of collections available in another. Whether this only changes the available catalog or also affects loaded tracks is unresolved. Hiding a collection while retaining loaded tracks is a proposal, not an agreed rule.

## Questions that most affect UI design

- What happens to guest work on sign-in, especially when the account is at its session limit?
- Is choosing collections per session part of the first version, and what does disabling or removing one do?
- How should users recover unsaved edits after failed saves, switching sessions, sign-out, or a conflicting update?
- Which additional assemblies, reference sources, and provided collections are needed?

Return to [standalone docs](README.md).
