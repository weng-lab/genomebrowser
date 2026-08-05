# Ticket 04: Integrate color controls across settings

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R4, R5, R12, R14, R15
**Blocked by:** Ticket 03

## Outcome

All existing MUI track color settings use the shared custom color field while preserving each setting's required, optional, and fallback behavior.

## Scope

Replace the base color text field and the existing BigWig, CAVE, Transcript, and MethylC color inputs with the shared color field. Adapt existing helper components rather than leaving parallel color-input conventions. Preserve each track's mutation path and place the new fields within the semantic layouts defined by the spec.

## Acceptance Criteria

- [ ] Base track Color uses the shared required color field and continues updating `base.color` through the existing base mutation path.
- [ ] BigWig clamp indicator color uses the shared field, remains associated with clamp visibility, and retains its existing default when no override is stored.
- [ ] CAVE Top color and Bottom color use the shared optional contract and retain their derived fallback semantics.
- [ ] Transcript Canonical color and Highlight color use the shared optional contract and remain a responsive semantic pair.
- [ ] All four MethylC channel colors use the shared required color behavior and retain their nested configuration update path.
- [ ] Clearing an optional field restores its existing fallback; opening or cancelling a picker does not materialize the fallback into configuration.
- [ ] Required and optional color edits preserve existing track mutation errors and interaction blocking behavior.
- [ ] No obsolete plain-text color helper or duplicated picker/conversion implementation remains in the UI settings code.
- [ ] Every integrated color field stacks safely at narrow widths, remains reachable in the scroll region, and does not create page-level horizontal overflow.

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
