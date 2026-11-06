<!--
Write so a reviewer can tell in a minute what changed, where to start reading, and what could go wrong.
Skip preambles and keep prose short. Describe the final change, not the investigation behind it.
Explanations that need more than a few sentences belong in the issue, an ADR, or code comments.
Don't copy CI check lists or logs here.
-->

## Summary

<!-- One or two sentences on what changes for the user or consumer. -->
<!-- Optionally add one small sketch, such as a diff of a call tree, component tree, or file tree, when it shows the change faster than words. -->

## Review guide

<!-- The two or three files to read first, and what to check in each. -->

## Risk

**Blast radius:**

<!-- Fill in the line above from the diff's paths, such as: `core` (public API) · `tracks` › bigwig, bigbed · `web` › sessions -->
<!-- Name packages by folder. Under tracks, name the track modules; under web, name the apps/web/features areas. -->
<!-- Mark (shared) on code every consumer reaches: core, reader, tracks/shared, web/shared. A small diff there is still wide. -->
<!-- Mark (public API) when package exports change and (stored data) when a session or collection schema or migration changes. -->
<!-- Leave out docs, tests, and lint config unless they are the whole change ("docs only"). Past about four areas, collapse, e.g. "tracks (all modules), web (5 features)". -->

<!-- Whoever implemented the change tends to understate its risk, so write this for a skeptical reviewer. -->
<!-- In a few plain sentences: what could break, whether reverting the PR fully undoes it, and what wasn't tested or verified. -->
<!-- Stored data and public package exports are common reasons a revert isn't enough. Name gaps directly instead of reassuring. -->

## Manual verification

<!-- Optional. Remove this section if hands-on review isn't useful. -->
<!-- Give the reviewer up to three short steps to exercise the changed behavior. Screenshots and videos are welcome but not required. -->

<!-- End with "Closes #123" when this pull request resolves an issue. -->
