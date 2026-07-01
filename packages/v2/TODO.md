# v2 RC TODO

## P0

- **Public/docs still read alpha.** `packages/v2/package.json` is `0.0.0` +
  `private`, README says “still being shaped”, `docs/v2/testing.md` is TBD,
  `validation.md` says WIP, and `notes.md` still says to create high-level and
  cookbook docs.

> Docs for sure need fixing, and we need docs for both maintainers/agents as well as users to bundle with the library. The user facing docs need to outline all exported features, but also not be so bloated to keep it easy to read, and for agents to use without rotting context.

- **BigBed-derived module seam is broken.** Docs encourage custom modules
  reusing `DenseBigBed`/`SquishBigBed`, but those renderers hard-code
  `useTooltip({ type: "bigbed" })`. A custom `peaks` module’s tooltip won’t
  resolve to `peaks`; it resolves to `bigbed`. The tooltip seam needs current
  module type from context/renderer props, not hard-coded inside reusable
  renderers.

> Bigbed module is a bit awkward. Ideally I want all the internally built modules to really be a stepping stone for users. They all do the basics, but can be picked apart, and expose some nice helpful things like SVG rendering functions for signal and annotations, fetch functions etc. This way they are mostly like usable pieces to build your own custom track, but also coincide with the most basic of tracks. Think lego pieces we expose, but also build our own creation internally for simple use cases.

## P0/P1

- **External data/custom data is missing.** Core has `externalDataStore` +
  `useCustomData`, which LD/Manhattan rely on. v2 creates data store internally
  and exposes no injection seam. Don’t port core’s custom config shape, but v2
  needs either a narrow data injection module/API or a documented custom-module
  fetch pattern for app-owned data.

> I don't think we want external data access anymore, now that we can have custom tracks all together. The idea with the external data store is to overwrite data for a given track with custom fetched data, but now this is irrelevant.

## P1

- **Transcript fetch config is not library-grade.** `transcript/fetch.ts` reads
  `import.meta.env.SCREEN_API_KEY` at module scope. For a package, that’s
  build-time coupled. Better seam: `createTranscriptModule({ apiKey, endpoint })`,
  or a fetch adapter injected into the module.

>

- **Decide core track parity explicitly.** Core has `motif`, `importance`,
  `ldtrack`, `manhattan`, and old `custom`; v2 only documents BigWig, BigBed,
  BulkBed, Transcript, MethylC, plus exported-but-undocumented `caveModule`. RC
  doesn’t need full parity, but it does need a clear “first-party vs
  cookbook/custom module” decision.
- **Track-author utility surface is too thin.** v2 uses but does not export
  useful helpers like `createXScale`, `createReverseXScale`,
  `svgPoint`/`useSvgPoint`, BigWig raw fetch/condense helpers, etc. Core
  exported similar helper hooks/utilities. A small documented “track author
  toolkit” would reduce internal-path imports.
- **`caveModule` looks accidental as public API.** It’s exported from
  `src/lib.ts`, undocumented in `docs/v2/tracks`, untested, and hard-codes
  Wenglab URLs. Either document it as first-party, move it to examples, or stop
  exporting it.
- **Data cache signatures need hardening.** Fetch signature ignores module type;
  same track id with a different module can reuse stale data. BulkBed also says
  changing dataset name won’t refetch, but fetch stores `datasetName` and
  renderer prefers stale fetched names.
- **Region math can go negative.** `expandRegion`/pan commit can produce
  negative starts, and fetchers pass them directly. Genomic regions should
  probably clamp at the browser region seam.

> Need to clamp regions to common values so that the region doesn't go beyond a chromosome's limit

- **Clean up track module settings components.** Fix weird behavior with number inputs
  and clean it up overall to make it more useable and less clunky. This is the default
  visual for the browser and should be adjusted to be so.

> Number inputs are currently really awkward to use, and the whole UI is a bit too plain

## P2

- **Settings validation UX is inconsistent.** Base settings displays mutation
  errors; module settings mostly ignore `TrackMutationResult`. Invalid module
  settings can silently fail. MethylC has no settings panel despite a rich
  config.
- **Renderer errors are not really isolated.** `TrackContent` has a `try/catch`,
  but React render errors inside the renderer won’t be caught. RC should
  probably have a per-track error boundary.
- **Core export/download APIs are absent.** Core supports SVG/BED/bedGraph
  download and context-menu download. v2 context menu only does display/remove.
  If users depend on exports, make this a browser export module with a narrow API.
- **Set up dev tools properly (OXC, Vite etc).** We need to add config files and set up our own rules, maybe even try Ultracite again to fully enforce strict rules better. Maybe linters etc. TS Go and latest versions of packages.
