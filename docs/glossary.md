# Project glossary

## Browser and coordinates

### Browser instance

One mounted `GenomeBrowser`, with its own rendering, fetched results, and track resources. Instances can share application-owned stores while retaining separate rendering and data lifetimes. The **host application** is the website embedding the browser. **Browser context** gives hosted renderers, settings, and tooltips access to that instance's stores through `useGenomeBrowser()`.

### Browser store and track store

The two application-owned stores controlling a browser. The **browser store** holds the assembly, viewport region, highlights, and browser settings. The **track store** holds registered modules, track instances, their order, and their configuration. Sharing a store lets multiple browser instances or controls operate on the same state. A **session** is the application's saved or restorable browsing setup, rather than either store object itself.

### Viewport

The genomic span currently visible in the browser, also called the **visible region**. Use viewport when discussing what the user sees. **Zoom** changes that genomic span; **scale** changes the physical size of the drawing and controls.

### Render region

The genomic span prepared for drawing, including **overscan**, the extra coverage beyond the viewport used during panning. A renderer positions its data using the region and width supplied with that data. The visible region can differ from this render region.

### Overscan

The extra genomic coverage prepared beyond the viewport’s edges, allowing existing track content to move into view immediately during panning while new data loads.

> viewport = visible coverage; render region = viewport plus overscan.

### Coordinate space

The system used to express positions and sizes. **Genomic coordinates** locate bases, **logical SVG coordinates** position the drawing before UI scale is applied, and **screen pixels** describe its displayed size. Specify the space when discussing widths, pointer movement, or alignment. Genomic regions in this project use zero-based, half-open coordinates.

## Tracks and presentation

### Track

One configured visualization in the browser. **Track instance** specifically means its runtime object, with an ID, type, configuration, and optional interaction callbacks. One track can contain several internal rows or combine several datasets. A **pinned track** is excluded from ordinary drag reordering; pinning does not mean sticky scrolling.

### Track module

The reusable implementation of a track type. Its **fetcher** produces data for a request, and its **renderers** draw that data. The module also defines configuration validation and can provide settings and tooltips. Fetchers can return local data without a network request. The **module registry** maps registered type identifiers to their modules. Several track instances can use the same module.

### Display mode

A module-supported way to draw a track's data, selected by `base.display`. Each mode has a renderer. Use display mode for a visualization choice, and collection view for a way of organizing a catalog.

### Track configuration

The configured values for one track. **Base settings**, stored in `base`, include ID, title, color, height, and display mode. Reserve **config** for the module-specific `config` object, such as source URLs and filtering thresholds. A module's **config schema** defines valid values and defaults. **Track settings** can refer to the controls used to edit these values.

### Track anatomy

The named parts of a displayed track:

- **Frame**: the structure supplied by core around the drawing, including its title, margin, and controls.
- **Margin**: the strip left of the data containing the color indicator and controls, also used for drag reordering.
- **Plot**: the genomic drawing area, excluding the margin and title. Also called the data area.
- **Overlay**: drawing anchored to the visible plot instead of moving with panning content, as provided by `TrackOverlay`.

Use these names to identify where a change belongs, such as "add a control to the margin" or "keep the label in an overlay."

### Row layout

The arrangement of items into rows inside a track. **Packing** places items into rows to avoid overlap. **Row height** is the vertical space for one internal row; **track height** is the height allocated to the track's plot. Use track order for the arrangement of whole tracks, so "row" does not ambiguously refer to both levels.

## Collections and ownership

### Track collection

A reusable catalog of configured tracks for one assembly. A **collection entry** describes an available track; a **track instance** is the runtime object created from it. Listing an entry does not load it into the browser.

**Metadata** describes and organizes entries separately from runtime config. A **collection view** specifies catalog grouping and columns. **Track selection** chooses entries to load; in `TrackSelect`, a draft selection becomes committed on Submit. A **qualified track ID**, such as `signals::sample`, combines collection and entry IDs for selection and runtime identity in `TrackSelect`.

### Source ownership

Whether the application or user controls a track's data source. Runtime tracks record this as `source: "host"` or `source: "user"`. Settings can use it to disable source editing for **host-owned tracks** while allowing display changes. Core records ownership but does not enforce which config fields are editable. Source ownership is distinct from the source URL itself.

## Fetching and reuse

### Render demand

The region and logical drawing width core asks a track's fetcher to satisfy. A demand can include overscan beyond the viewport. The fetcher receives it alongside an assembly and track snapshot. **Fetch-affecting config** means config fields marked with `fetchOnChange`; changes to those values require fetching or fetch-time processing again.

### Track resources

Reusable values retained between fetches for one track type and ID in one browser instance, such as a file reader or cache. Resources are separate from track configuration and the current fetch result. The fetcher manages their validity when sources change; removing the track or unmounting the browser releases core's references to them.

## Keep the vocabulary useful

Prefer these terms in discussions, issues, and documentation. Qualify ambiguous words: region selection versus track selection, display mode versus collection view, and track height versus row height. Preserve exact API names when discussing code.

When a recurring project concept needs a shared name, suggest an addition here. Prefer placing related vocabulary under an existing entry, and add a main entry only when it captures a distinct concept. Avoid expanding the glossary with general biology or software terminology unless this project gives it a specific meaning.

Return to [Maintainer documentation](README.md).
