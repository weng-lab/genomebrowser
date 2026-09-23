# Sessions and persistence

Session design and implementation status. Current behavior is identified below; guest tab persistence and user collections remain planned. Setup and implementation details live in the [app README](../README.md).

The standalone genome browser is for researchers exploring genomic regions and comparing tracks from provided datasets and their own data sources. Sessions let them return to ongoing work. Collections help them organize tracks for use across that work.

## Explore without an account

Planned: guests begin with default tracks and access to provided track collections. They can adjust the browser and tracks while they work. Their current setup is saved temporarily in the tab using `sessionStorage`, so a reload restores it. Guest work has no database session.

For example, a researcher opens the browser, moves to a gene, adds a provided track, and adjusts its appearance. Reloading the same tab brings back that working setup.

Implemented: guests and new sessions start with the ruler and the assembly's default gene track. The provided collections are gene annotations and, for hg38, ENCODE human biosamples. The transition from guest work to a signed-in session still needs a decision.

## Return to saved work

Implemented: signed-in users can have up to five sessions. The dashboard creates a named session from the assembly picker and opens it in the browser. Browser and track store changes automatically persist to PostgreSQL in short batches, with one write in flight at a time. Returning to a session restores the visible region, highlights, track configuration, and order. Selection mode is transient. The database initializes the stores only when loading the session page. Save responses update the local revision and save status without replacing store state or refreshing the page.

For example, a researcher arranges several tracks around a region of interest, changes their colors and heights, and returns later. Opening that session restores those choices so they can continue their comparison.

Implemented: users name sessions when creating them and can delete sessions from the dashboard to make room at the limit. The browser has no manual save button or name editor. Autosave runs silently, shows an alert for save failures, and retries transient failures without blocking browser interaction. A stale revision cannot overwrite a newer save from another tab. Pending changes flush when leaving or hiding the page, but closing before saving finishes can still lose edits. Recovery and navigation warnings remain open.

## Work within one assembly

Agreed: every session has a fixed genome assembly. All tracks in that session are interpreted in that assembly's coordinate system.

For example, a researcher working in an hg38 session adds a custom track URL. The browser treats its data as hg38. If the file actually contains mouse coordinates, supplying the wrong data is the user's error; the browser cannot reliably verify the underlying assembly.

Implemented: users choose an assembly when creating a session. An application-owned registry provides each assembly definition, reference-track resources, available collections, and search capabilities. Provided collections are filtered by assembly.

## Organize reusable tracks

Agreed first-version scope: users add custom tracks through hosted data URLs and organize them into collections that act like folders. Their custom tracks are available across sessions. Actual file uploads are deferred.

For example, a researcher groups several hosted signal tracks into a collection called "Pilot study." They can use those tracks while working in different sessions without registering the URLs again.

A collection entry and a session track are separate. Once added, the session stores an independent track instance with its current configuration and no collection dependency. Changing its appearance in one session does not change the collection entry or another session. Changes to a collection must not rewrite existing session instances.

The application provides the assembly-specific collections described above. Personal collections remain planned.

## Choose collections for a session

Exploratory: users may be able to add, disable, or remove collections from individual sessions while keeping their personal collections available across the account.

For example, a researcher may want "Pilot study" available in one session and a different set of collections available in another. Whether this only changes the available catalog or also affects loaded tracks is unresolved. Hiding a collection while retaining loaded tracks is a proposal, not an agreed rule.

## Questions that most affect UI design

- What happens to guest work on sign-in, especially when the account already has five sessions?
- Is choosing collections per session part of the first version, and what does disabling or removing one do?
- How should users recover unsaved edits after failed saves, switching sessions, sign-out, or a conflicting update?
- Which additional assemblies, reference sources, and provided collections are needed?
