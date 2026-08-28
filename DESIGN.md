# Application design

This document is the design authority for `packages/ui`, `apps/standalone`, and `apps/playground`. Prefer product requirements first, this document second, and nearby code as implementation evidence rather than automatic precedent.

## Product character

Build calm, compact scientific application UI.

- Prefer alignment, spacing, and typography over decorative surfaces.
- Keep expert workflows dense without shrinking labels or controls.
- Use sentence case and specific domain language.
- Preserve context when showing loading, empty, disabled, or error states.

## Ownership

- `packages/core` owns genome rendering, browser state, and track infrastructure.
- `packages/tracks` owns the curated MUI-based first-party track modules and all UI used specifically by tracks, including reusable settings controls and tooltip helpers.
- `packages/ui` owns larger MUI application controls that interact with the browser system as a whole.
- `apps/standalone` owns deployed product composition and application-specific presentation.
- `apps/playground` owns experimental routes and custom browser compositions. Examples may remain unwired until a maintainer needs them.
- Do not move behavior across these boundaries solely for visual convenience.

## MUI and theming

- Use MUI for application controls and interaction behavior.
- Use plain CSS for non-MUI structures; do not recreate established MUI controls with custom CSS.
- Read interface colors, spacing, shape, and typography from the active theme.
- Do not install global resets or impose a package-wide theme on host applications.
- Keep scientific colors in domain configuration, separate from interface colors.
- Use `sx` for local composition; extract styling only after real repetition.

## Forms and settings

- Keep controls beside the content or decision they affect.
- Use visible labels; placeholders provide examples, not labels.
- Use compact MUI controls and responsive layouts that stack at narrow widths.
- Settings update live unless a workflow explicitly introduces Apply/Cancel.
- Surface validation failures without discarding the entered value.

### Track settings

- The core settings modal owns the shell, title, close behavior, and positioning.
- `TrackBaseSettings` owns title, color, display, and height controls.
- A module `settingsComponent` renders only its track-specific config controls.
- First-party modules arrive pre-bound to their track-specific settings components. Custom modules bind their own `settingsComponent`; do not introduce core helpers solely for UI composition.
- Use `TrackSettingsSection` for grouping, `TrackSettingsFieldRow` for fixed peer rows, and `TrackSettingsFieldGrid` for free-flowing peer fields.
- Every public config option must have an accessible input.

## Actions and accessibility

- Give an action group at most one contained primary action.
- Icon-only actions require an accessible name.
- Preserve MUI keyboard and focus behavior.
- Do not rely on color alone to communicate state or scientific meaning.

## Responsive behavior

- Stack or wrap meaningful groups rather than shrinking controls.
- Prevent page-level horizontal overflow.
- Keep source order consistent with reading and keyboard order.

## Before finishing

Check representative and long content, narrow width, keyboard operation, disabled/error states, and consistency with existing shared components.

## Updating this document

Add a rule only when it should guide multiple future implementations. Replace obsolete guidance instead of keeping a chronological decision log. Use an ADR for consequential architectural decisions.
