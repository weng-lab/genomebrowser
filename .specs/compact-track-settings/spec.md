# Compact Track Settings

**Status:** Complete

## Problem

Track settings modals use more vertical space than necessary because related controls often stack in a narrow column. This makes settings-heavy tracks cumbersome to scan and edit. Color settings are also plain text fields, which are efficient for known values but make visual color selection difficult.

## Desired Outcome

Track settings use a compact, responsive layout that places closely related controls beside one another at the normal modal width, stacks them safely when space is limited, and provides one consistent color control for visual selection and manual hexadecimal entry.

## Current State

- The core package owns the draggable modal shell, including its title, close behavior, position, and size constraints.
- The UI package owns the MUI base settings and track-specific settings forms.
- The default modal has a 520px maximum width and a vertically scrolling content region.
- `TrackSettingsFieldGrid` uses responsive auto-fitting columns with a 12rem minimum field width, but it groups controls according to incidental child order rather than explicit semantic relationships.
- `TrackSettingsSection` provides accessible `fieldset` and `legend` grouping.
- `DraftRangeFields` already edits and validates minimum and maximum values as one logical range.
- UI color options are currently plain text fields. The core fallback base settings has a native color input paired with a text input, but does not provide the desired shared picker experience.

## Requirements

- **R1:** At the normal settings modal width, base settings must place Title and Color on one row and Display mode and Height on a second row.
- **R2:** When only one display mode is available, Height must remain naturally sized and the layout must not reserve an empty cell for a hidden Display mode control.
- **R3:** Semantic field rows must stack in source order when their container cannot provide a usable width for every field. Controls must not become narrower merely to preserve a multi-column layout.
- **R4:** Track-specific settings must be arranged according to their relationships rather than forced into a uniform matrix:
  - BigWig and MethylC minimum and maximum range fields appear beside one another when space allows.
  - CAVE top and bottom colors appear together.
  - Transcript canonical and highlight colors appear together; Assembly and Version appear together; Endpoint and Highlight gene remain full-width controls.
  - BigWig clamp visibility and clamp indicator color are visually associated, while the source URL remains full width.
  - BulkBed dataset Name and URL appear together when space allows.
  - MethylC peer source and color fields may flow into responsive columns, while long URL fields retain a usable width.
- **R5:** Existing setting sections, labels, validation messages, optional-value behavior, update timing, and track mutation behavior must remain intact unless this specification explicitly changes them.
- **R6:** URL fields, alerts, shared validation messages, and controls whose content needs the section width must be able to span the complete row.
- **R7:** Settings forms must use compact control sizes and modestly tighter spacing to reduce height. They must not apply a global font-size override or override the embedding application's theme typography. Labels and entered values must remain comfortably readable.
- **R8:** The UI package must provide one reusable color field for base and track-specific color settings.
- **R9:** The color field must show the current color visually, allow direct hexadecimal entry, and open a custom picker with saturation/value selection and hue selection.
- **R10:** The manual color field must accept a six-digit hexadecimal color in `#RRGGBB` form without case sensitivity. An incomplete or invalid draft must remain editable, must not update the track, and must show an accessible validation error.
- **R11:** Valid manual color entry must commit on blur or Enter. Escape must restore the last committed value. Picker interaction must provide a continuous track preview while the user changes the color.
- **R12:** Optional color settings must retain their existing fallback semantics. Clearing an optional color must restore its caller-defined fallback rather than committing an arbitrary picker default. Required colors must not be clearable.
- **R13:** The color picker must support pointer and keyboard operation, expose meaningful accessible names for its controls, manage focus when opened and closed, and not rely on the color preview alone to communicate the selected value.
- **R14:** The reusable color field must cover the base track color and existing UI color settings for BigWig clamp indicators, CAVE signals, transcript highlighting, and MethylC channels.
- **R15:** Layout and picker behavior must remain usable in a narrow viewport: settings stack without page-level horizontal overflow, the modal content remains scrollable, and the close control remains reachable.

## Technical Decisions

- Core continues to own only the modal shell; semantic form layout and the custom color field belong to `packages/ui`.
- Layout expresses intentional field relationships. Existing shared grid and section primitives may be extended with explicit row or full-width behavior, but no API should require every settings panel to conform to a fixed 2×N grid.
- Responsive decisions are based on the available settings container width, not only the application viewport, because the browser is embeddable.
- DOM order matches visual and keyboard order in both paired and stacked layouts.
- The picker uses a local draft while editing text. Invalid text does not enter track configuration. Picker-generated values are normalized to `#RRGGBB` before update.
- Color conversion and picker interaction logic are centralized rather than reimplemented by individual settings panels.
- Density comes primarily from semantic pairing, `size="small"` controls, and reduced layout gaps. The UI package does not impose a package-wide theme or typography scale on host applications.
- Public track configuration shapes and core/UI ownership boundaries do not change.

## Verification Strategy

- Add focused component tests for base settings field order, the conditional Display mode case, and preservation of existing update and validation behavior.
- Add layout assertions at representative wide and narrow container widths for semantic pairing, full-width fields, stacking, and absence of horizontal overflow.
- Retain and extend `DraftRangeFields` tests to verify minimum/maximum validation is unchanged after layout changes.
- Test the reusable color field with required and optional values, valid and invalid drafts, blur/Enter commit, Escape cancellation, clearing, picker updates, and fallback preservation.
- Test keyboard and focus behavior for opening, operating, and closing the picker, including accessible names and validation associations.
- Manually inspect representative base, BigWig, MethylC, Transcript, CAVE, BigBed, and BulkBed settings at normal and narrow widths. Confirm long content, scrolling, close access, host-theme compatibility, and continuous color preview.
- Run the repository's relevant core and UI typecheck, lint, test, and formatting checks.

## Out of Scope

- Making the settings modal user-resizable.
- Persisting modal dimensions, positions, or picker history.
- Changing track configuration schemas or rendering behavior.
- Redesigning the modal title bar or replacing the draggable shell.
- Adding alpha/transparency, gradients, saved palettes, eyedropper integration, or non-hexadecimal color formats.
- Applying a global MUI theme or global typography reduction.

## Risks and Edge Cases

- Auto-fitting fields without semantic row boundaries can regroup unrelated controls at wider sizes; intentional row grouping must remain authoritative.
- Long URLs, translated labels, validation text, and host typography can require more width than expected and must trigger stacking rather than clipping.
- Optional colors may be undefined while displaying a derived fallback. Opening or closing the picker without a selection must not convert that fallback into an explicit override.
- Continuous picker updates can be frequent. Updates must remain responsive and use the existing mutation path without introducing duplicated local configuration state.
- Saturation/value controls require deliberate keyboard semantics and visible focus treatment; a pointer-only custom canvas or surface is insufficient.
- The wider shell can overflow if opened near a viewport edge. Narrow-viewport and close-button reachability checks are required even though drag-boundary redesign is outside this specification.

## Amendments

### A001 - Neutral fallback without base settings context

- **Supersedes:** R12 and the Technical Decisions statement that optional fallback display and explicit stored value are distinct states, only where the effective fallback depends on browser-owned base state unavailable to the module settings component.
- **Replacement:** Optional color fields must still keep displayed fallback and explicit stored value distinct and clearing must still restore `undefined`. When the current settings contract cannot provide the effective base-derived color, the picker may use `#000000` as a neutral display-only fallback without writing it to configuration. CAVE's display-only top fallback derives from the available bottom color or this neutral bottom fallback. A missing base track color is likewise displayed as `#000000` without being committed until the user makes a valid color selection. Supplying the complete track snapshot and atomic updater to module settings is deferred to the separate atomic track-update/settings-contract work.
- **Reason:** Exact base-derived fallbacks cannot be represented through the current `{ id, config, updateConfig }` module settings contract, and changing that public contract is outside this work.

### A002 - Preserve existing CSS color values

- **Supersedes:** R10 only for controlled values that were already accepted by existing track schemas, and R12 for BigWig clamp indicator color.
- **Replacement:** New manual color edits still accept and commit only six-digit `#RRGGBB` values. Existing controlled color strings accepted by current track schemas, including three-digit hex and CSS color values, must remain visible and must not crash settings; the user may replace them with a picker-generated or manually entered six-digit value. A non-hex value unavailable to picker conversion uses the field's display fallback to initialize the picker without committing on open or cancel. BigWig clamp indicator color is presented as required because core validation always materializes its `#ff0000` schema default; it is not clearable in the UI.
- **Reason:** Layout and picker integration must not invalidate existing configurations, and the BigWig validated config cannot represent the optional cleared state assumed by the original requirement.
