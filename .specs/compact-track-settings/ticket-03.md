# Ticket 03: Build the accessible color field

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R5, R8, R9, R10, R11, R12, R13, R15
**Blocked by:** None

## Outcome

The UI package has one tested, reusable color field that combines a visual swatch, validated hexadecimal entry, and an accessible custom saturation/value and hue picker for required and optional colors.

## Scope

Implement the shared color field, color conversion utilities, draft lifecycle, picker popover, pointer interaction, keyboard interaction, focus handling, and tests. Demonstrate both required and optional contracts in focused component tests; broad settings-panel integration is deferred to Ticket 04.

## Acceptance Criteria

- [ ] The closed field displays a visible color swatch and a labeled text input containing the current explicit hexadecimal value.
- [ ] Activating the picker control opens a custom saturation/value surface and hue control initialized from the current color.
- [ ] Picker changes emit normalized `#RRGGBB` values continuously for live preview.
- [ ] Manual entry accepts case-insensitive six-digit `#RRGGBB`, commits a normalized valid value on blur or Enter, and does not emit incomplete or invalid drafts.
- [ ] Invalid manual input remains editable and has an accessible, visibly associated validation error.
- [ ] Escape restores the last committed text value rather than emitting the draft.
- [ ] Optional mode can clear an explicit color to `undefined`; merely opening and closing the picker does not convert a displayed fallback into an explicit value.
- [ ] Required mode cannot be cleared.
- [ ] The picker can be opened, operated, and closed with a keyboard; every interactive element has a meaningful accessible name and visible focus treatment.
- [ ] Focus enters the picker predictably and returns to the opening control when it closes.
- [ ] The selected hexadecimal value remains available as text, so color is not communicated visually alone.
- [ ] The picker and popover remain usable within the modal's scrolling region and a narrow viewport without horizontal page overflow.

## Verification

Add focused tests for required and optional values, fallback preservation, valid and invalid drafts, blur and Enter commit, Escape cancellation, clearing, pointer-driven preview, keyboard operation, accessible names, validation associations, and focus restoration. Manually inspect pointer dragging, visible focus, popover placement, narrow-width behavior, and host-theme compatibility. Run relevant UI typecheck, lint, tests, and formatting checks.

## Starting Points

- `packages/ui/src/TrackSettings/optionalTrackColorField.tsx`
- `packages/ui/src/TrackSettings/draftInput.ts`
- `packages/ui/src/TrackSettings/draftTextField.tsx`
- `packages/ui/package.json`
- `packages/core/src/browser/settings/settingsColor.ts`
- Existing MUI Popover, TextField, Slider, and button conventions in `packages/ui`

Avoid deriving track configuration from transient invalid text. Keep color conversion and interaction logic centralized. If a new runtime dependency is considered, justify it against bundle size, accessibility behavior, React 19 support, and the small required feature set before adding it.

## Constraints

- The shared field belongs to `packages/ui`; do not move MUI into core.
- Supported committed values are six-digit hexadecimal colors only; alpha and alternate formats are out of scope.
- Optional fallback display and explicit stored value are distinct states.
- Do not recreate an established MUI control when MUI already provides the required interaction semantics.

## Out of Scope

- Integrating the field into every settings panel.
- Alpha, gradients, palettes, eyedropper support, or color history.
- Changing public track configuration shapes.
