# Standalone glossary

Terms specific to the standalone app. Use them consistently in code, tests, and docs. Shared browser terms, such as browser store, track store, track instance, and track collection, are defined in the [repository glossary](../../../docs/glossary.md).

## Sessions

### Session snapshot

The serializable browser and track store state: assembly, visible region, highlights, browser settings, and ordered tracks with pinned IDs. It excludes modules, callbacks, fetched data, and runtime state such as selection mode. Guests and saved sessions share this shape. Code: `SessionSnapshot` in `features/session-snapshot/`.

A **serialized track** is one track within a snapshot: its type, source ownership, base settings, and config. Code: `SerializedTrack`.

The **initial snapshot** is the starting state for guests and new sessions: the assembly's reference ruler and default gene track, both pinned.

### Saved session

A named session snapshot stored in PostgreSQL for one account, with a revision number. Each update names the revision it was based on, so a stale tab cannot overwrite newer work. Code: `SavedSession` in `features/sessions/`.

### Active session

The saved session the current tab is working in. The navbar shows its name, and the Browser link returns to it. The tab remembers only its ID, name, and owner in `sessionStorage`. Code: `ActiveSessionProvider`, `useActiveSession`, and `RegisterActiveSession`.

### Autosave

Background saving of store changes to the open saved session. It batches changes, allows one write at a time, and retries transient failures. See [session persistence](sessionPersistence.md#saved-sessions).

## Accounts and ownership

### Owner

The Clerk user who owns private data. The server always resolves the owner from the Clerk session through `requireOwner` or the page queries, never from a URL or request body.

## Custom tracks

### Custom track

A user-owned serialized track saved to the account's custom collection for one assembly. Adding it to a session creates an independent track instance; later session edits do not change the custom track. Code: `CustomTrack` in `features/custom-tracks/`.

### Track catalog

The track types users can create, with each type's label, description, preview, default config, and rules such as a required assembly or source URL. Code: `features/custom-tracks/catalog.ts`.

## Assemblies

### Assembly registry

The assemblies users can choose, with each assembly's chromosomes, initial region, reference sequence, gene datasets, and search capabilities. Code: `features/assemblies/assemblies.ts`. **Provided collections** are the track collections the app offers for an assembly, in `features/assemblies/trackCollections.ts`.

Return to [standalone docs](README.md).
