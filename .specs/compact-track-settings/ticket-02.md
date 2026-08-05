# Ticket 02: Reflow track-specific settings

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R3, R4, R5, R6, R7, R15
**Blocked by:** Ticket 01

## Outcome

Every existing track-specific settings panel uses compact semantic grouping, with related controls sharing space and width-sensitive controls spanning or stacking appropriately.

## Scope

Apply the shared semantic row and full-width behavior to BigWig, MethylC, CAVE, Transcript, BigBed, and BulkBed settings. Preserve existing sections and settings behavior while changing field composition and spacing.

## Acceptance Criteria

- [x] BigWig Minimum and Maximum share a responsive row; the automatic-range action remains beneath them; the source URL spans its section.
- [x] BigWig clamp visibility and clamp indicator color are visually associated without crowding the independent Fill missing values switch.
- [x] MethylC Minimum and Maximum share a responsive row, while the coverage switch remains a separate control.
- [x] MethylC peer URL and color controls flow into usable responsive columns and stack rather than compress when necessary.
- [x] CAVE Neurotransmitter and Age share a row, and Top color and Bottom color share a row, when space allows.
- [x] Transcript Endpoint spans its row; Assembly and Version share a responsive row; Highlight gene spans its row; Canonical color and Highlight color share a responsive row.
- [x] BigBed's single URL remains full width.
- [x] Each BulkBed dataset places Name and URL together when space permits and stacks them in source order when constrained; dataset actions and validation remain intact.
- [x] Long URLs, labels, helper text, and errors neither clip nor create page-level horizontal overflow.
- [x] All setting values, labels, validation, update timing, optional behavior, add/remove behavior, and mutation paths remain unchanged.

## Verification

Update focused component tests only where composition affects observable structure or behavior. Manually inspect every settings panel at normal modal width and a narrow container width, including long URLs and validation errors. Run relevant UI typecheck, lint, tests, and formatting checks.

## Starting Points

- `packages/ui/src/TrackSettings/draftRangeFields.tsx`
- `packages/ui/src/tracks/bigwig/settings.tsx`
- `packages/ui/src/tracks/methylc/settings.tsx`
- `packages/ui/src/tracks/cave/settings.tsx`
- `packages/ui/src/tracks/transcript/settings.tsx`
- `packages/ui/src/tracks/bigbed/settings.tsx`
- `packages/ui/src/tracks/bulkbed/settings.tsx`

Do not treat every adjacent pair as semantically related. URLs and complex controls should retain full width where specified, and DOM order must remain the narrow-layout reading order.

## Constraints

- Consume the shared layout behavior established by Ticket 01 rather than creating per-track CSS conventions.
- Preserve `TrackSettingsSection` fieldset/legend semantics and existing MUI accessibility behavior.
- Do not alter configuration types, defaults, or track rendering.

## Out of Scope

- Replacing text color fields with the custom color picker.
- Renaming or regrouping settings sections beyond the field relationships named in the spec.
- Modal resizing, persistence, or title-bar redesign.
