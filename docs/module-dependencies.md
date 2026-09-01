# Module dependency diagrams

These UML-style component diagrams show the static source dependencies inside
each package and the package-level architecture of the monorepo. A component is
a cohesive code subsystem, usually a source directory or a small group of files
with one responsibility. Individual files are grouped where a file-level graph
would obscure the architecture.

An arrow points from the consumer to the dependency. Solid arrows represent
runtime imports. Dashed arrows represent type-only imports, re-exports, dynamic
imports, or runtime URL connections, as labeled. External libraries are omitted
from package diagrams unless they define an important boundary.

## Monorepo

```mermaid
flowchart LR
  STANDALONE["standalone<br/>deployed Next.js application"]
  PLAYGROUND["playground<br/>experiments and custom setups"]
  UI["ui<br/>application controls and TrackSelect"]
  TRACKS["tracks<br/>first-party track implementations"]
  CORE["core<br/>browser runtime and extension contracts"]
  READER["reader<br/>BigBed, BigWig, and cytoband reader"]

  SCREEN(["SCREEN GraphQL service"])
  FILES(["Remote genomic files<br/>HTTP fetch and byte ranges"])

  STANDALONE -->|composes| CORE
  STANDALONE -->|registers| TRACKS
  STANDALONE -->|renders controls| UI
  PLAYGROUND -->|source-mapped imports| CORE
  PLAYGROUND -->|source-mapped imports| TRACKS
  PLAYGROUND -->|source-mapped imports| UI
  PLAYGROUND -. "source-mapped transitive imports" .-> READER
  UI -->|stores, registry, genomic types| CORE
  UI -. "cytoband record types" .-> READER
  TRACKS -->|track contracts and runtime hooks| CORE
  TRACKS -->|regional file reads| READER
  UI -. "tests and package verification only" .-> TRACKS

  STANDALONE -. "server proxy" .-> SCREEN
  TRACKS -. "transcript queries" .-> SCREEN
  READER -->|full-file and range fetches| FILES
```

The production package graph is acyclic. `core` and `reader` are independent
foundations. `tracks` implements the extension contracts from `core` and uses
`reader`; `ui` controls `core` and uses `reader`'s cytoband record types; the
standalone app is the deployed composition root, while the playground consumes
source entries for experiments.

## Core package

Paths are relative to `packages/core/src`.

```mermaid
flowchart TB
  API["Public API<br/>lib.ts"]
  ROOT["Browser composition<br/>browser/GenomeBrowser.tsx"]
  GENOME["Genome domain<br/>genome/*"]
  CONTRACTS["Extension contracts and validation<br/>modules/types.ts<br/>modules/defineTrackModule.ts<br/>modules/schemas.ts"]
  REGISTRY["Module registry<br/>modules/registry.ts"]
  FETCH_POLICY["Fetch-signature policy<br/>modules/fetchOnChange.ts"]
  RUNTIME["Renderer runtime<br/>modules/interaction.ts<br/>modules/runtimeContext*<br/>modules/runtime/*"]
  GEOMETRY["Geometry utilities<br/>modules/utils/*"]

  STATE["Browser state and contexts<br/>browser/state/*"]
  DATA["Data coordination<br/>browser/data/*"]
  VIEWPORT["Viewport interaction<br/>browser/viewport/*"]
  SVG["SVG surface<br/>browser/svg/*"]
  ROWS["Track rows<br/>browser/track-row/*"]
  TOOLTIP["Tooltip subsystem<br/>browser/tooltip/*"]
  SETTINGS["Settings UI<br/>browser/settings/*"]
  OVERLAYS["Browser overlays<br/>browser/overlays/*"]
  ERRORS["Render error boundary<br/>browser/RenderErrorBoundary.tsx"]

  API -. "exports" .-> ROOT
  API -. "exports" .-> GENOME
  API -. "exports" .-> CONTRACTS
  API -. "exports" .-> REGISTRY
  API -. "exports" .-> FETCH_POLICY
  API -. "exports" .-> RUNTIME
  API -. "exports" .-> STATE
  API -. "exports" .-> ROWS
  API -. "exports" .-> TOOLTIP
  API -. "exports" .-> SETTINGS

  ROOT --> STATE
  ROOT --> DATA
  ROOT --> VIEWPORT
  ROOT --> SVG
  ROOT --> ROWS
  ROOT --> TOOLTIP
  ROOT --> OVERLAYS

  CONTRACTS -. "types" .-> GENOME
  REGISTRY -. "types" .-> CONTRACTS
  RUNTIME -. "types" .-> CONTRACTS
  GEOMETRY -. "types" .-> GENOME

  STATE --> GENOME
  STATE --> CONTRACTS
  STATE --> REGISTRY
  STATE --> SETTINGS

  DATA -. "types" .-> STATE
  DATA -. "types" .-> GENOME
  DATA -. "types" .-> CONTRACTS
  DATA -. "types" .-> REGISTRY
  DATA --> FETCH_POLICY

  VIEWPORT -. "types" .-> STATE
  VIEWPORT --> GENOME
  VIEWPORT --> GEOMETRY
  SVG --> GEOMETRY

  ROWS --> DATA
  ROWS --> STATE
  ROWS -. "types" .-> VIEWPORT
  ROWS --> SVG
  ROWS -. "types" .-> CONTRACTS
  ROWS --> RUNTIME
  ROWS --> ERRORS
  ROWS -. "types" .-> GENOME

  TOOLTIP --> RUNTIME
  TOOLTIP -. "types" .-> CONTRACTS
  TOOLTIP --> SVG
  TOOLTIP --> ERRORS

  SETTINGS --> STATE
  SETTINGS -. "types" .-> CONTRACTS
  SETTINGS --> RUNTIME
  OVERLAYS --> STATE
  OVERLAYS -. "types" .-> GENOME
  OVERLAYS -. "types" .-> CONTRACTS
  OVERLAYS --> GEOMETRY
  ROOT -. "types" .-> GENOME
  ROOT -. "types" .-> CONTRACTS
```

There is one source-level cycle around the default settings components:
`browser/state/settingsStore.ts` →
`browser/settings/DefaultBaseSettings.tsx` →
`browser/state/browserContextState.ts` →
`browser/state/settingsStore.ts`. The final edge is type-only, so the emitted
runtime graph remains acyclic. The notable coupling is that the state layer
chooses concrete default UI components.

## Tracks package

Paths are relative to `packages/tracks/src`. The nodes below describe code
subsystems, not the runtime meaning of a “track module.” Similar first-party
implementations are grouped to keep the dependency layers visible.

```mermaid
flowchart TB
  API["Package facade<br/>lib.ts"]
  EXPORTS["Public subpath exports<br/>package.json and */index.ts"]

  SHARED_API["Shared public facade<br/>shared/index.ts"]
  FOUNDATION["Shared foundations<br/>shared/coordinates<br/>shared/layout<br/>shared/signal<br/>shared/schemas.ts"]
  SHARED_UI["Shared settings and tooltips<br/>shared/settings/*<br/>shared/tooltips/*"]

  BIGBED["BigBed engine<br/>bigbed/*"]
  CCRE["cCRE specialization<br/>ccre/*"]
  BULKBED["BulkBed specialization<br/>bulkbed/*"]

  BIGWIG["BigWig engine<br/>bigwig/*"]
  CAVE["CAVE specialization<br/>cave/*"]
  METHYLC["MethylC specialization<br/>methylc/*"]

  TRANSCRIPT["Transcript implementation<br/>transcript/*"]
  CORE["core package"]
  READER["reader package"]

  EXPORTS -. "root export" .-> API
  EXPORTS -. "subpath exports" .-> SHARED_API
  EXPORTS -. "subpath exports" .-> BIGBED
  EXPORTS -. "subpath exports" .-> BIGWIG
  EXPORTS -. "subpath exports" .-> CCRE
  EXPORTS -. "subpath exports" .-> BULKBED
  EXPORTS -. "subpath exports" .-> CAVE
  EXPORTS -. "subpath exports" .-> METHYLC
  EXPORTS -. "subpath exports" .-> TRANSCRIPT

  API --> BIGBED
  API --> CCRE
  API --> BULKBED
  API --> BIGWIG
  API --> CAVE
  API --> METHYLC
  API --> TRANSCRIPT

  SHARED_API -. "re-exports" .-> FOUNDATION
  SHARED_API -. "re-exports" .-> SHARED_UI
  SHARED_UI --> FOUNDATION
  SHARED_UI --> CORE
  FOUNDATION --> CORE
  FOUNDATION -. "types" .-> READER

  BIGBED --> FOUNDATION
  BIGBED --> SHARED_UI
  CCRE --> BIGBED
  CCRE --> FOUNDATION
  CCRE --> SHARED_UI
  BULKBED --> BIGBED
  BULKBED --> FOUNDATION
  BULKBED --> SHARED_UI

  BIGWIG --> FOUNDATION
  BIGWIG --> SHARED_UI
  CAVE --> BIGWIG
  CAVE --> FOUNDATION
  CAVE --> SHARED_UI
  METHYLC --> BIGWIG
  METHYLC --> FOUNDATION
  METHYLC --> SHARED_UI

  TRANSCRIPT --> FOUNDATION
  TRANSCRIPT --> SHARED_UI

  BIGBED --> READER
  BIGWIG --> READER

  BIGBED --> CORE
  CCRE --> CORE
  BULKBED --> CORE
  BIGWIG --> CORE
  CAVE --> CORE
  METHYLC --> CORE
  TRANSCRIPT --> CORE
```

The local source graph has no static import cycle. Specialized implementations
depend on their format engine; the format engines never import a specialization.

## UI package

Paths are relative to `packages/ui/src`.

```mermaid
flowchart TB
  API["Public API<br/>lib.ts"]
  CLI["TrackSelect CLI<br/>trackselect.ts"]
  CORE["core package"]
  READER["reader package"]

  NAV["Browser navigation control<br/>BrowserNavigationButton/*"]
  CYTO["Cytobands orchestrator<br/>cytobands/cytobands.tsx"]
  CYTO_SVG["Cytoband rendering<br/>cytobands/cytobandSvg.tsx<br/>currentRegionBracket.tsx"]
  HIGHLIGHTS["Highlight interaction<br/>cytobands/highlightLayer.tsx<br/>highlightTooltip.tsx"]

  SELECT["TrackSelect facade<br/>TrackSelect/TrackSelect.tsx"]
  SCHEMA["Collection schema boundary<br/>TrackSelect/schema/*"]
  MODEL["Collection transforms<br/>collectionRows, grouping, order,<br/>views, selection, and types"]
  RECONCILE["Core-track reconciliation<br/>collectionStore.ts<br/>collectionInteraction.ts"]
  SESSION["Draft session and context<br/>TrackSelect/session/*"]
  GRID["Grid adapter<br/>collectionGrid.tsx<br/>collectionColumns.ts<br/>CollectionCells.tsx"]
  LIST["Collection list<br/>collectionList/*"]
  TREE["Selected-track tree<br/>selectedTracksTree/*"]
  LAYOUT["Layout and dialogs<br/>layout/* and dialogs/*"]

  API -. "exports" .-> NAV
  API -. "exports" .-> CYTO
  API -. "exports" .-> SELECT
  API -. "exports" .-> SCHEMA
  API -. "exports" .-> GRID
  API -. "exports" .-> RECONCILE
  CLI --> SCHEMA
  CLI --> CORE

  NAV --> CORE
  CYTO --> CYTO_SVG
  CYTO --> HIGHLIGHTS
  CYTO --> CORE
  CYTO -. "cytoband record types" .-> READER
  CYTO_SVG -. "genomic types" .-> CORE
  HIGHLIGHTS -. "genomic types" .-> CORE

  SELECT --> SCHEMA
  SELECT --> RECONCILE
  SELECT --> SESSION
  SELECT --> LAYOUT
  SCHEMA -. "types" .-> CORE
  MODEL -. "types" .-> SCHEMA
  SELECT --> MODEL
  RECONCILE --> MODEL
  RECONCILE -. "types" .-> SCHEMA
  RECONCILE --> CORE
  SESSION --> MODEL
  SESSION --> RECONCILE
  SESSION -. "types" .-> SCHEMA
  LAYOUT --> SESSION
  LAYOUT --> GRID
  LAYOUT --> LIST
  LAYOUT --> TREE
  LAYOUT -. "types" .-> MODEL
  LAYOUT -. "types" .-> SCHEMA
  GRID --> MODEL
  GRID -. "types" .-> SCHEMA
  LIST -. "types" .-> SCHEMA
  TREE --> MODEL
  TREE -. "types" .-> SCHEMA
```

TrackSelect has a deliberate ownership boundary: draft selection state stays in
`session/*`; only submission reconciles that draft into the core track store.
There are two source-level, type-only cycles inside grouped nodes:
`highlightLayer.tsx` ↔ `highlightTooltip.tsx` and `collectionColumns.ts` ↔
`CollectionCells.tsx`. Neither is a runtime cycle.

## Applications

Standalone paths are relative to `apps/standalone`; playground paths are
relative to `apps/playground`.

```mermaid
flowchart TB
  ROOT["Standalone root layout<br/>app/layout.tsx"]
  HOME["Standalone home route<br/>app/page.tsx"]
  API["SCREEN proxy<br/>app/api/screen-graphql/route.ts"]

  LICENSE["MUI X license setup<br/>components/MuiXLicenseProvider.tsx"]

  BROWSER["Browser composition<br/>components/Browser.tsx"]
  TOOLBARS["Browser toolbars<br/>components/Toolbars.tsx"]
  OVERVIEW["Region overview<br/>components/RegionOverview.tsx"]
  WIDTH["Observed-width hook<br/>hooks/useObservedWidth.ts"]
  COLLECTIONS["Track collections<br/>lib/trackCollections.ts<br/>lib/human-biosamples.json"]

  CORE["core package"]
  TRACKS["tracks package"]
  UI["ui package"]
  READER["reader package"]
  SCREEN(["SCREEN GraphQL service"])

  ROOT --> LICENSE
  HOME --> BROWSER

  BROWSER --> TOOLBARS
  BROWSER --> OVERVIEW
  BROWSER --> WIDTH
  BROWSER --> COLLECTIONS
  OVERVIEW --> WIDTH
  OVERVIEW -->|loads cytoband files| READER

  BROWSER --> CORE
  BROWSER --> TRACKS
  BROWSER --> UI
  TOOLBARS --> UI
  OVERVIEW --> UI
  COLLECTIONS -. "types" .-> UI

  TOOLBARS -. "GraphQL URL" .-> API
  COLLECTIONS -. "transcript endpoint" .-> API
  API --> SCREEN
```

The standalone graph is acyclic. Route modules point toward composition
components; compositions point toward leaf controls and workspace packages. The
API route is server-only and is connected to client code by URL, not by a source
import. `RegionOverview` owns the cytoband file read and passes ready records to
the UI renderer; the API route remains the server boundary for SCREEN requests.

```mermaid
flowchart TB
  ROOT["Playground root layout<br/>app/layout.tsx"]
  HOME["Playground home route<br/>app/page.tsx"]
  ZOOM_ROUTE["Zoom prototype route<br/>app/zoom-prototypes/page.tsx"]
  NAV_BOUNDARY["Navbar client boundary<br/>components/AppNavbarRoute.tsx"]
  NAV["Navbar<br/>components/AppNavbar.tsx"]
  ZOOM_BOUNDARY["Prototype client boundary<br/>components/ZoomPrototypeRoute.tsx"]
  ZOOM_PAGE["Prototype composition<br/>components/ZoomPrototypePage.tsx"]
  ZOOM_CONTROLS["Prototype controls<br/>components/zoom-prototypes/*"]
  EXAMPLES["Unwired examples<br/>examples/core/*<br/>examples/ui/*"]
  CORE["core source entry"]
  TRACKS["tracks source entries"]
  UI["ui source entry"]
  READER["reader source entry"]

  ROOT --> NAV_BOUNDARY
  NAV_BOUNDARY -. "dynamic import" .-> NAV
  ROOT --> HOME
  ZOOM_ROUTE --> ZOOM_BOUNDARY
  ZOOM_BOUNDARY -. "dynamic import" .-> ZOOM_PAGE
  ZOOM_PAGE --> ZOOM_CONTROLS
  ZOOM_PAGE --> CORE
  ZOOM_PAGE --> TRACKS
  EXAMPLES -. "not routed" .-> CORE
  EXAMPLES -. "not routed" .-> TRACKS
  EXAMPLES -. "not routed" .-> UI
  TRACKS --> READER
```

The playground's Turbopack aliases and TypeScript paths map every public
workspace package entry, including track subpaths and the reader, to source.
The examples remain outside the route graph until a maintainer explicitly wires
one for an investigation.

## Reader package

Paths are relative to `packages/reader/src`.

```mermaid
flowchart TB
  API["Public API<br/>lib.ts"]
  BIGWIG["BigWig facade<br/>bigWig.ts"]
  BIGBED["BigBed facade<br/>bigBed.ts"]
  CYTO["Cytoband parser and reader<br/>cytobands.ts"]
  CONTRACTS["Shared contracts<br/>genomicFile.ts"]

  VALIDATION["Input validation<br/>internal/inputValidation.ts"]
  ABORT["Abort checkpoint<br/>internal/abort.ts"]
  HTTP["HTTP range requests<br/>internal/httpRange.ts"]
  REQUESTS["Range reader and read-ahead<br/>internal/requestRangeReader.ts"]
  BINARY["Binary cursor<br/>internal/binaryReader.ts"]
  BIGINT["Safe offset arithmetic<br/>internal/bigint.ts"]

  HEADER["Common BBI header<br/>internal/bbi/commonHeader.ts"]
  CHROMS["Chromosome B+ tree<br/>internal/bbi/chromosomeTree.ts"]
  INDEX["Regional R-tree index<br/>internal/bbi/regionalIndex.ts"]
  BLOCKS["Data-block planning and loading<br/>internal/bbi/dataBlocks.ts"]
  ZOOM["Zoom headers<br/>internal/bbi/zoomHeaders.ts"]
  BW_DECODER["BigWig decoder<br/>internal/bigWigDecoder.ts"]
  BB_DECODER["BigBed decoder<br/>internal/bigBedDecoder.ts"]

  API -. "exports" .-> BIGWIG
  API -. "exports" .-> BIGBED
  API -. "exports" .-> CYTO
  API -. "types" .-> CONTRACTS

  BIGWIG -. "types" .-> CONTRACTS
  BIGWIG --> VALIDATION
  BIGWIG --> ABORT
  BIGWIG --> REQUESTS
  BIGWIG --> HEADER
  BIGWIG --> CHROMS
  BIGWIG --> INDEX
  BIGWIG --> BLOCKS
  BIGWIG --> ZOOM
  BIGWIG --> BW_DECODER
  BIGWIG -. "types" .-> HTTP

  BIGBED -. "types" .-> CONTRACTS
  BIGBED --> VALIDATION
  BIGBED --> ABORT
  BIGBED --> REQUESTS
  BIGBED --> HEADER
  BIGBED --> CHROMS
  BIGBED --> INDEX
  BIGBED --> BLOCKS
  BIGBED --> BB_DECODER
  BIGBED -. "types" .-> HTTP

  CYTO --> VALIDATION
  CYTO --> ABORT

  VALIDATION -. "types" .-> CONTRACTS
  REQUESTS --> ABORT
  REQUESTS --> HTTP
  HTTP --> ABORT
  HTTP --> BIGINT

  HEADER --> BINARY
  HEADER --> HTTP
  HEADER -. "types" .-> REQUESTS
  CHROMS --> BIGINT
  CHROMS --> BINARY
  CHROMS --> REQUESTS
  CHROMS -. "types" .-> HEADER
  INDEX --> BIGINT
  INDEX --> BINARY
  INDEX --> REQUESTS
  INDEX -. "types" .-> HEADER
  BLOCKS --> ABORT
  BLOCKS --> REQUESTS
  BLOCKS --> INDEX
  BLOCKS -. "types" .-> HEADER
  ZOOM --> BIGINT
  ZOOM --> BINARY
  ZOOM --> HTTP
  ZOOM -. "types" .-> HEADER
  BW_DECODER --> ABORT
  BW_DECODER --> BINARY
  BB_DECODER --> ABORT
  BB_DECODER --> BINARY
```

The reader graph is acyclic and layered: public facades orchestrate format
reads; BBI structures and decoders sit below them; range transport and binary
primitives form the foundation.

## Maintenance notes

These diagrams were derived from static imports, re-exports, package manifests,
and the app's observed URL connections. Update them when a source dependency
crosses one of the shown subsystem or package boundaries. Internal edits that do
not change a boundary do not require a diagram change.
