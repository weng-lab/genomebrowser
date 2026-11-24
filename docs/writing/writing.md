# Writing documentation

## Audience and scope

Keep consumer docs and maintainer docs separate. Package docs (`packages/*/docs/`) teach consumers through the public API. Maintainer docs (`docs/`) explain repository boundaries, decisions, and how to change the codebase safely.

Give each topic one canonical home:

- **Tutorials** walk through a workflow in order.
- **Guides** cover standalone tasks and concepts.
- **Reference** specifies public APIs.
- **Troubleshooting** diagnoses concrete symptoms.

Link to reference pages instead of copying their tables. Every public export needs a reference entry, not necessarily its own file. Keep supporting types with the API that owns them and small cooperating components on one page. Add a new page for a distinct reader task or capability, not just because a PR added an option.

## Bundled package docs

Package docs ship inside the npm package and must work when read from `node_modules`:

- Each package that ships a `docs/` folder should point readers and coding agents from its `README.md` to `node_modules/<package-name>/docs/README.md`, noting that those docs match the installed version. Keep those paths and the starter's `AGENTS.md` current when moving files.
- Use package-local relative links inside `packages/*/docs/`. Never link upward into repo-only docs or across to sibling package folders. Cross-package links must target verified published URLs, with enough local context to follow the example.
- Use only public exports in examples, and never invent APIs or fake genomic data hosts.
- Make sure install and starter commands select a release channel that actually contains the documented APIs instead of assuming `@latest` does. State minimum runtime requirements where relevant; docs changes do not change release policy.

## Describe current behavior

Write about how the current version works. Avoid phrases like "previously", "now supports", or "unlike the old API", and update outdated text in place instead of appending a note underneath it. Readers of bundled docs should not need to know how an older version worked.

Keep rationale that explains why the current design is the way it is. Change history belongs in PRs, release notes, or clearly labeled historical ADRs. Keep migration notes separate and include them only when asked or when needed for a supported upgrade path. Do not add compatibility APIs as part of a docs change.

## Evidence and examples

Check the relevant repo docs, public entry points, implementation, and tests before making behavioral claims. Verify defaults, callback timing, ownership, lifetimes, errors, constraints, and accessibility against source or tests. Leave out unverified claims or mark uncertainty explicitly, and never present proposals as shipped behavior.

Organize docs around what the reader needs to do, not the source file layout. Start examples with the smallest realistic setup that works, including required imports, props, and context, and put advanced options in separate examples.

### Store access in examples

Inside React components and custom hooks, select displayed state and actions at the top level through the bound store hook, then call selected actions in event handlers. Selecting a stable action does not subscribe the component to the state that action mutates. For displayed lookups, select the derived value directly, such as `state.getTrack(id)?.base.title`, rather than selecting a lookup function and calling it during render.

Use `getState()` outside React, such as in module callbacks or initialization, or for a deliberate event-time snapshot that does not drive rendering. Because `getState()` does not subscribe, do not use it to read displayed state or as the default way to call actions in components. Hosted renderers, settings forms, and tooltips obtain their stores through `useGenomeBrowser()` and follow the same selector pattern. Mark standalone imperative examples clearly.

## Voice and style

Write clearly and concretely for someone using or changing the browser, without sacrificing technical accuracy.

- Lead with what the feature does or when to use it, then explain how. Skip broad introductory paragraphs about application domains. Guides build a workflow; references need only a short opener before the contract.
- Define unfamiliar terms with a concrete example. For instance, a sequence name identifies a chromosome or contig, such as `chr1`. Keep API names exact and follow the [glossary](../glossary.md), using `region` and `locus` rather than "interval" except inside actual API names.
- Assume the reader knows standard genome-browser concepts. State once in the first-browser intro that tracks share a viewport, rather than repeating that panning moves all tracks. Spend the space on package-specific behavior like request invalidation, error handling, and linked browser instances.
- Use a direct manual voice, like "Create a browser store..." or "To add a track, register its module...", instead of "You can..." or "You will learn...". Name who does what: the app owns the store, the module fetches data, and the browser renders tracks.
- Prefer plain phrasing over abstract jargon: write "when every request finishes" instead of "when the batch settles", and "create stores once per component" instead of "establish an ownership boundary". Keep precise API and technical terms where they earn their place.
- Keep one idea per paragraph so instructions read as connected prose rather than a pile of disconnected tips. Cut filler and repeated package names.
- Use sentence-case headings, straight quotes, and light emphasis. Separate thoughts with periods or commas rather than em dashes or parenthetical asides, while preserving exact code and math punctuation.

Before finishing, read the page top to bottom for flow. Tighten abstract wording, break up dense paragraphs, cut repetition, and verify that defaults, errors, and constraints remain intact.
