# Ticket 04: Integrate color controls across settings

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R4, R5, R12, R14, R15
**Blocked by:** Ticket 03

## Outcome

All existing MUI track color settings use the shared custom color field while preserving each setting's required, optional, and fallback behavior.

## Scope

Replace the base color text field and the existing BigWig, CAVE, Transcript, and MethylC color inputs with the shared color field. Adapt existing helper components rather than leaving parallel color-input conventions. Preserve each track's mutation path and place the new fields within the semantic layouts defined by the spec.

## Acceptance Criteria

- [x] Base track Color uses the shared required color field and continues updating `base.color` through the existing base mutation path.
- [x] BigWig clamp indicator color uses the shared field, remains associated with clamp visibility, and retains its existing default when no override is stored.
- [x] CAVE Top color and Bottom color use the shared optional contract and retain their derived fallback semantics.
- [x] Transcript Canonical color and Highlight color use the shared optional contract and remain a responsive semantic pair.
- [x] All four MethylC channel colors use the shared required color behavior and retain their nested configuration update path.
- [x] Clearing an optional field restores its existing fallback; opening or cancelling a picker does not materialize the fallback into configuration.
- [x] Required and optional color edits preserve existing track mutation errors and interaction blocking behavior.
- [x] No obsolete plain-text color helper or duplicated picker/conversion implementation remains in the UI settings code.
- [x] Every integrated color field stacks safely at narrow widths, remains reachable in the scroll region, and does not create page-level horizontal overflow.

## Verification

Update base and track settings tests to cover each integration's update payload and optional fallback behavior. Manually inspect all color fields at normal and narrow modal widths, including disabled BigWig clamp controls and continuous preview. Run relevant core and UI typecheck, lint, tests, and formatting checks.

## Starting Points

- `packages/ui/src/TrackSettings/trackBaseSettings.tsx`
- `packages/ui/src/TrackSettings/optionalTrackColorField.tsx`
- `packages/ui/src/tracks/bigwig/settings.tsx`
- `packages/ui/src/tracks/cave/settings.tsx`
- `packages/ui/src/tracks/transcript/settings.tsx`
- `packages/ui/src/tracks/methylc/settings.tsx`
- `packages/core/src/browser/overlays/SettingsModalController.tsx` for existing interaction blocking and mutation flow

Pay particular attention to CAVE's derived Top/Bottom fallbacks, BigWig's default clamp color, and MethylC's nested committed-config handling. These are different contracts despite sharing one visual control.

## Constraints

- Reuse Ticket 03's color field and conversion behavior; do not fork it per track.
- Preserve existing configuration shapes and core/UI ownership.
- Keep DOM order aligned with the semantic paired layouts and narrow-width reading order.

## Out of Scope

- Changing core's dependency-free fallback `DefaultBaseSettings` color control.
- Adding new color configuration options.
- Modal resizing, position persistence, or drag-boundary redesign.

## Amendments

### A001 - Integrate with neutral unavailable fallbacks

- **Supersedes:** Acceptance criteria 1, 3, and 4 where they require an unavailable base-derived fallback.
- **Replacement:** Base Color uses the shared required field and displays `#000000` when `base.color` is absent without committing that value until the user selects or enters a valid color. CAVE and Transcript optional fields preserve `undefined` and clearing semantics but use the spec's neutral display-only fallback when the current module settings props cannot provide the active base color. CAVE Top color continues to derive its display fallback from the available Bottom color or neutral bottom fallback. No settings props contract change is part of this ticket.
- **Reason:** Complete track context will be addressed by the separate atomic track-update/settings-contract work.

### A002 - Match existing color configuration contracts

- **Supersedes:** Acceptance criteria 2 and 6 for BigWig, plus any criterion that assumes all incoming controlled colors are already six-digit hex.
- **Replacement:** BigWig clamp indicator color uses the shared required field with the validated `#ff0000` default and has no clear action. Existing core-valid color strings in any integrated field remain visible and do not crash settings; they are preserved until replaced by a valid six-digit manual value or picker selection. Picker initialization for a non-hex controlled value uses that field's fallback without materializing it on open or cancel.
- **Reason:** Core validation materializes BigWig's default and existing schemas still accept CSS color strings beyond the picker's new-entry format.
