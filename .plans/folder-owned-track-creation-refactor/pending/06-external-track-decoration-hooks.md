# Slice 6: External Track Decoration Hooks

## Dependencies

Slice 4: Remove Double-State From Test Harness.

## Description

Add a narrow, obvious way for consumers to decorate managed tracks created by `TrackSelect`, such as attaching click handlers, hover behavior, or tooltip-related track callbacks. This slice only happens after the controller refactor is stable, and it should avoid reintroducing double-state or a large integration surface.

## Expected Behaviors Addressed

- Consumers have a simple way to attach extra behavior to managed tracks when needed.
- The core controller refactor remains readable and does not depend on decorator complexity.

## Acceptance Criteria

- [ ] `TrackSelect` exposes a small API for decorating managed tracks after creation and before insertion into `trackStore`.
- [ ] The API is sufficient to support the current test harness callback use case.
- [ ] Decoration support does not reintroduce consumer-owned managed selection state.

## QA

1. Open the local UI test harness with decoration enabled through the new API.
2. Interact with at least one decorated transcript track and one decorated BigBed track.
3. Confirm the expected click or hover behavior still fires.
4. Confirm managed track add/remove behavior still works exactly as before.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
