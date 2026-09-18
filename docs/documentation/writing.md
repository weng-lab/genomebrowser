# Writing documentation

- Package docs teach consumers through the public surface; maintainer docs explain repository boundaries, rationale, and safe modification. Keep the audiences distinct.
- Give each topic one canonical home. Tutorials teach a sequence, guides explain independent tasks/concepts, reference specifies APIs, and troubleshooting diagnoses symptoms. Link to exhaustive reference instead of duplicating its tables.
- Every public export needs a reference destination, not a separate file. Keep related types with the owning API and small cooperating components together. Add a page for a distinct reader task or capability, not simply because a PR or option exists.
- Package docs must work from an installed package. Use package-local relative links; never link upward into repository-only docs or across to sibling package directories. Cross-package links need verified published destinations, with enough local context to follow the example.
- Examples use public exports. For track URLs use `YOUR_URL_HERE` or an existing repository URL. Do not invent data sources or APIs to simplify examples.
- Installation and starter commands must select a release that provides the documented APIs. Verify the intended release channel rather than assuming `@latest` contains the documented version. Keep actual minimum runtime requirements explicit where relevant; documentation edits do not change publication policy.

## Current behavior and rationale

Prefer direct current behavior over phrases such as "previously," "now supports," or "unlike the old API." Integrate changes into the explanation rather than appending a correction beneath outdated text. Bundled documentation describes its accompanying package version. A reader should not need knowledge of an earlier implementation to understand it.

Retain useful rationale for current decisions. Change history belongs in PRs, release notes, or clearly labeled historical ADRs. Separate migration guidance and include it only when requested or necessary for a supported upgrade path. Do not introduce compatibility APIs as part of documentation work.

## Evidence and examples

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
