# Track Margin Reorganization Plan

## Workflow

- When a feature OR large task (many changes) is done, **suggest** doing a git commit with a short summary of the changes.
- If a commit is done, mark the feature/task(s) as complete.

---

## Feature 1: Remove Margin Label from Track Margin

Remove the short label text displayed in the left margin while preserving the colored bar, buttons, and range indicators.

### Tasks

- [x] **1.1** Remove the margin label `<text>` element from `margin.tsx` (lines 89-92)
  - Keep the range indicators (MarginTicks for BigWig min/max values)
  - Keep the colored bar on the left edge
  - Keep all buttons (settings, top, bottom)

- [x] **1.2** Remove the `marginLabel` prop from the Margin component interface
  - Update the component props type definition
  - Remove the prop from the destructured parameters

- [x] **1.3** Clean up `wrapper.tsx` to remove unused shortLabel code
  - Remove `const shortLabel = createShortLabel(id);` (line 30)
  - Remove `marginLabel={shortLabel}` prop from `<Margin>` component (line 102)

> **Commit suggestion:** After completing Feature 1, commit with message: "Remove margin label from track margin, keep buttons and range indicators"

---

## Feature 2: Verify Button Layout (No Changes Needed)

Buttons will remain in their current vertically-centered horizontal position. This is just a verification step.

### Tasks

- [ ] **2.1** Verify buttons remain properly positioned after label removal
  - Settings icon at `x={marginWidth / 10}`
  - Top icon at `x={marginWidth / 10 + 15}`
  - Bottom icon at `x={marginWidth / 10 + 30}`
  - All at `y={height / 2 + 2}` (vertically centered)

- [ ] **2.2** Verify range indicators (MarginTicks) still display correctly for BigWig tracks
  - Min value at bottom of track
  - Max value at top of track

---

## Summary of Preserved Elements

| Element                       | Status     |
| ----------------------------- | ---------- |
| Colored bar (left edge)       | Keep       |
| Settings button               | Keep       |
| Bring to Top button           | Keep       |
| Bring to Bottom button        | Keep       |
| Range indicators (BigWig)     | Keep       |
| Margin right edge line        | Keep       |
| **Margin label (shortLabel)** | **Remove** |

---

## Files to Modify

1. `packages/core/src/components/tracks/wrapper/margin.tsx`
2. `packages/core/src/components/tracks/wrapper/wrapper.tsx`
