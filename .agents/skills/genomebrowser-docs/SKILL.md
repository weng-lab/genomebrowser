---
name: genomebrowser-docs
description: Organize and maintain bundled genomebrowser package docs and repository maintainer guidance, including documentation updates for public behavior or API changes. Covers audits and documentation migrations; edit ADRs only when requested. Excludes commit messages, TODO files, and code comments unless requested.
---

# Genome Browser Docs

Documentation describes the system at the documented revision. Bundled docs describe their accompanying package version. A reader should not need knowledge of an earlier implementation to understand the current system.

## Scope and routing

For discussion or an audit, propose the audience, page map, and content approach before editing. When documentation edits or a package pass are authorized, complete that scope without approval for each page. Documentation required by an implementation change is already in scope. Do not expand a focused change into a package-wide migration.

Read only the references relevant to the work:

- For package page creation, placement, tutorials, audits, or restructuring, read [Package architecture](references/packageArchitecture.md). It defines the target tree, learning path, and package migration workflow. A wording-only edit does not require it.
- For documenting or changing components, functions, hooks, stores, module contracts, types, or other public APIs, read [API reference writing](references/apiReference.md). It defines canonical coverage, API grouping, and component templates.
- For root maintainer docs, app READMEs, architecture, design/contribution guidance, or requested ADR work, read [Maintainer documentation](references/maintainerDocs.md).

A task may need multiple references; do not load all of them by default. Existing docs may not yet follow the target architecture. Preserve the scope of a focused edit rather than moving unrelated pages.

## Shared documentation contract

- Package docs teach consumers through the public surface; maintainer docs explain repository boundaries, rationale, and safe modification. Keep the audiences distinct.
- Give each topic one canonical home. Tutorials teach a sequence, guides explain independent tasks/concepts, reference specifies APIs, and troubleshooting diagnoses symptoms. Link to exhaustive reference instead of duplicating its tables.
- Every public export needs a reference destination, not a separate file. Keep related types with the owning API and small cooperating components together. Add a page for a distinct reader task or capability, not simply because a PR or option exists.
- Package docs must work from an installed package. Use package-local relative links; never link upward into repository-only docs or across to sibling package directories. Cross-package links need verified published destinations, with enough local context to follow the example.
- Examples use public exports. For track URLs use `YOUR_URL_HERE` or an existing repository URL. Do not invent data sources or APIs to simplify examples.
- Installation and starter commands target the full release: use `@latest`, not prerelease tags or pinned versions. Keep actual minimum runtime requirements explicit where relevant.

## Updating docs with implementation changes

When a PR changes behavior:

1. Find the canonical explanation and other affected examples, API tables, tutorials, troubleshooting entries, and architectural claims.
2. Rewrite existing explanations and examples to describe the complete resulting behavior. Integrate options into the API and workflow rather than appending a change announcement.
3. Remove obsolete instructions, superseded examples, irrelevant caveats, and abandoned ideas. Update links and index entries when destinations change.
4. Read the affected sections as a whole for contradictions, repetition, and dependence on historical context. Verify the resulting description against code, not just the new sentences.

Prefer direct current behavior over phrases such as "previously," "now supports," or "unlike the old API." For example, write "The module supplies the complete settings form" rather than appending a correction beneath an outdated explanation.

Retain useful rationale for current decisions. Change history belongs in PRs, release notes, or clearly labeled historical ADRs. Separate migration guidance and include it only when requested or necessary for a supported upgrade path. Do not introduce compatibility APIs as part of documentation work.

## Evidence and writing

Read the relevant repository instructions, existing docs, public entry points, implementation, and tests before making behavioral claims. Verify defaults, callback timing, ownership, lifetimes, errors, constraints, and accessibility against source or tests. Omit unconfirmed claims or identify the uncertainty explicitly; do not present proposals as implemented behavior.

Organize by reader needs rather than source-file layout. Lead examples with the smallest realistic working setup; include required imports, props, and context, and keep advanced cases separate.

### Store access in examples

In React components and custom hooks, select displayed values and actions through the bound store hook at the top level, then invoke selected actions in event handlers. Selecting a stable action does not subscribe to the state it changes. For displayed lookups, select the result, such as `state.getTrack(id)?.base.title`, rather than selecting a lookup function and calling it during rendering.

Use `getState()` for code outside React, including file-scoped module callbacks and initialization, or for a deliberate event-time snapshot of a value that does not drive rendering. It creates no subscription; do not use it to read displayed state or as the default way to access actions inside components. Hosted renderers, settings, and tooltips obtain their stores through `useGenomeBrowser()` and then follow the same selector pattern. Keep standalone imperative reference examples clearly identified as such.

## Voice and style

Write for someone using or changing the genome browser. Be direct and concrete without sacrificing technical detail.

- Start with what the feature does or when to use it, then explain how. Avoid abstract introductions about application domains or demonstrating capabilities. Guides build a workflow; references need only a short introduction before the complete contract.
- Define unfamiliar terms with an example. A sequence name identifies a chromosome or contig, such as `chr1`. Preserve API names and use consistent terminology.
- Call a span on a chromosome a "region" or "genomic region." Use "locus" (plural "loci") when referring to a biological location. Do not alternate with "interval" or invent context such as "candidate interval" for a generic example. Preserve actual API identifiers and data-field names, such as `intervals`, when discussing those contracts.
- Assume familiarity with ordinary genome-browser behavior. State once in the first-browser introduction that tracks share the viewport; do not repeat that navigation moves all tracks or that browser actions affect the whole display. Explain package-specific contracts such as request invalidation, error handling, and linked browser instances where they matter.
- Use a manual-style voice: "To add a track, register its module..." or "Create a browser store..." rather than "You can..." or "You will learn..." Name who does what: the application owns the store, the module fetches data, and the browser renders tracks.
- Explain behavior in concrete terms. Write "when every request finishes" instead of "when the batch settles," and "create stores once per component" instead of "establish an ownership boundary." Retain precise API and technical terms where they help.
- Develop one idea per paragraph, connecting the purpose, behavior, and practical consequence. Direct instructions should still read as connected prose, not a string of isolated commands or conditional tips. Remove filler, repeated package identity, and claims that add no useful information.
- Use sentence-case headings, straight quotes, and restrained emphasis. Separate prose thoughts with periods or commas instead of em dashes or parenthetical asides. Preserve required code and mathematical punctuation.

Before finishing, read the page for flow. Simplify abstract wording, split dense paragraphs, and remove repeated explanations. Keep the manual voice and preserve defaults, errors, and constraints.

## Completion

- Check affected API coverage using the API reference guidance when applicable.
- Read changed pages as a coherent current snapshot; remove conflicting or obsolete claims and duplicate authoritative explanations.
- When a page's scope changes, review its title, filename, and index description together. Check links, heading targets, navigation, and inbound links after renames or moves. Verify bundled pages remain included in the package.
- Type-check or run examples when practical, and use existing repository verification tools. Validation must cover the resulting docs, not merely added text.
- Complete the documentation required by the authorized scope. Report files changed, validation, and material uncertainty; distinguish planned work from finished documentation.
