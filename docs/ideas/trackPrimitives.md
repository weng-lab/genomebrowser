# Proposed Track Primitive Architecture

**Status:** Design note; not a public API commitment.

This note records a possible direction for reusable tracks and visualization building blocks. The goal is to keep the core genome browser small while making domain-specific tracks straightforward to build in applications or optional packages.

## Motivation

Tracks such as Manhattan and linkage disequilibrium (LD) combine several independent concerns:

- reading a genomic data format or calling an API;
- converting source records into a domain model;
- projecting genomic coordinates into pixels;
- laying out visual marks;
- rendering SVG and wiring interactions.

When these concerns are packaged as one reusable renderer factory, the resulting interface tends to expose domain-specific configuration and browser internals. `createFullLDRenderer` is an example: it provides some reuse, but couples LD rendering, data transformation, config projection, tooltip identity, and interaction state.

The preferred reuse seam is normalized data and geometry, not inheritance between track types. LD is therefore not a child of BigBed. BigBed is one possible source of LD records.

## Goals

- Keep domain-specific modules out of the core package unless they are broadly useful primitives.
- Let applications fetch BigBed and BigWig data without adopting the built-in track modules.
- Let applications transform fetched records with ordinary pure functions.
- Provide a small visual vocabulary for intervals, quantitative values, points, and links.
- Make the built-in tracks use the same public building blocks available to downstream modules.
- Keep data adapters usable independently of React and SVG.
- Allow domain modules reused by several applications to move into optional packages without changing the core.

## Non-goals

- Do not make every internal helper public.
- Do not create a universal track factory with polymorphic config and source behavior.
- Do not rename format-specific adapters to vague names such as `annotation` or `signal`.
- Do not require all domain visualizations to share one normalized model.
- Do not couple cached regional data to viewport width, SVG, or a display mode.

## Layers

### 1. Source adapters

Source adapters read a concrete format or protocol and return records for a genomic region. Their names should remain explicit about the source:

- BigBed adapter
- BigWig adapter
- application-owned JSON, REST, or GraphQL adapters

Adapters return regional data. They do not perform pixel-dependent layout or choose a visualization. A BigBed adapter may support a schema or row parser, but it should not know whether its rows will become annotations, Manhattan points, or LD variants.

### 2. Normalized models

Small normalized models give transforms and layout helpers a stable vocabulary. Likely concepts include:

- **Genomic interval:** chromosome, start, and end, plus an associated item.
- **Signal value:** a genomic interval or position with a numeric value.
- **Point:** a genomic position and one or more values used for placement.
- **Link:** a relationship between two items or genomic positions.

These are independent concepts rather than one large union. Domain transforms can add fields or retain their original source item.

Examples:

- BigBed row → genomic interval
- BigWig row → signal value
- BigBed association row → Manhattan point
- BigBed LD row → variant intervals and links

### 3. Pure geometry and layout

Pure functions convert normalized data into renderable geometry. Candidate capabilities include:

- project genomic coordinates into an x range;
- convert intervals into rectangles;
- pack overlapping intervals into rows;
- condense signal values to available pixels;
- map values into a y domain;
- place point marks;
- create paths between linked marks.

Geometry functions should not read React context, browser stores, tooltip registries, or module config. Their inputs should include all relevant data, region, dimensions, and layout options. Their output should retain the source item so callers can implement tooltips and interactions without reverse lookups.

This pure geometry layer is the primary public seam. It can support SVG today and Canvas or WebGL later.

### 4. Thin SVG primitives

SVG primitives may remove repetitive markup for common marks:

- interval rectangles;
- signal areas or bars;
- point marks;
- link arcs.

They should consume prepared geometry and ordinary style or event callbacks. They should not know a track module type, discover a tooltip component, transform domain data, or own domain-specific state such as an active LD variant.

React primitives should only be exported when they provide meaningful leverage over mapping geometry to SVG directly. A small amount of repeated SVG is preferable to a highly configurable component with a large interface.

### 5. Track recipes

A track recipe composes an adapter, domain transform, geometry, SVG, and browser interaction hooks into a track module.

- BigBed annotation: BigBed adapter → intervals → packed rectangles
- BigWig signal: BigWig adapter → signal values → condensed signal marks
- Manhattan: BigBed or API adapter → association transform → point geometry
- LD: BigBed or API adapter → LD transform → interval and link geometry

The browser package may ship convenience modules for common formats, but those modules should use the public primitive interface rather than private shortcuts.

## Naming policy

Names should communicate which axis they describe:

- Use `BigBed` and `BigWig` for format adapters and format-backed convenience modules.
- Use `interval`, `signal`, `point`, and `link` for normalized models and visual capabilities.
- Use `Manhattan` and `LD` only for domain transforms or complete domain recipes.

An `annotationModule` backed only by BigBed would be misleading. A genuinely source-independent annotation module would require a stable way to supply arbitrary fetching behavior; that seam should not be introduced until more than one real adapter needs it.

## Public interface rules

A proposed export should satisfy most of these rules:

1. It is useful in at least two concrete track compositions.
2. It hides meaningful implementation complexity behind a smaller interface.
3. It does not require importing files under `src/`.
4. Pure data and geometry functions do not depend on React.
5. Render primitives do not depend on module identity or browser-owned registries.
6. Data returned from an adapter remains tied to genomic coordinates, not viewport pixels.
7. Source items remain available through transforms and geometry for interactions.
8. The built-in track using the capability consumes the same public interface.

One application is enough to keep a domain recipe local. Reuse by a second application is evidence for a real shared seam and may justify an optional package.

## Domain module policy

Manhattan, LD, and other domain-specific modules should normally live in the application that needs them. When multiple applications need the same behavior, prefer an optional package built exclusively from core exports. This keeps the core focused without forcing teams to copy mature recipes between projects.

An optional domain package may own:

- source-specific parsing and validation;
- domain models and transformations;
- settings and tooltip content;
- selection or pinning semantics;
- a complete track module composed from core primitives.

It should not require new browser internals merely to reuse rendering code.

## Validation examples

The primitive interface is sufficient when all of the following can be built using package-root exports:

- a normal BigBed interval track;
- a BigBed-backed track with custom row fields and rectangle styling;
- a Manhattan track backed by BigBed or an application API;
- an LD track backed by BigBed or an application API;
- a custom visualization that uses interval geometry without using the built-in BigBed module.

The Manhattan and LD cases should not require factories equivalent to `createFullLDRenderer`.

## Expected direction for existing tracks

- Keep explicit BigBed and BigWig adapters.
- Expose the BigWig adapter consistently with the existing BigBed adapter.
- Extract only the interval, signal, point, and link geometry that proves reusable.
- Make built-in BigBed and BigWig renderers consume those public primitives.
- Replace `createFullLDRenderer` with explicit composition.
- Move Manhattan and LD recipes out of the core package once their required primitives are available.
- Consider a separate package only after cross-application reuse is concrete.

Exact names and signatures should be designed from two or more real consumers rather than fixed by this note.
