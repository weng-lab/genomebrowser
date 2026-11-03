# React review guidance

Use these checks when changing browser components, embedding controls, or app workflows. [Code standards](code_standards.md) covers shared principles; [module design](module-design.md) covers ownership and interfaces.

## Current values and editing drafts

Rendering and callbacks must observe current props. A controlled value follows its parent; an intentional capture-once prop uses an `initial*` or `default*` name. Do not copy an ordinary prop into local state and silently ignore later updates. For example, a track settings draft must deliberately preserve or replace edits when the selected track changes.

Use a `key` to reset an entire editing session only when remounting, losing focus, and discarding local drafts are intended. Derive values from current props or state during rendering instead of synchronizing redundant state with an Effect.

## Effects and interruption

Name the external system an Effect synchronizes: a subscription, timer, DOM listener, or connection. Keep interaction-triggered work in the originating handler or complete domain operation.

Check setup and cleanup together. Replacing stores, switching sessions, or unmounting must release the old subscription or resource. Setup must tolerate setup-cleanup-setup, and obsolete asynchronous completions must not update the new owner. Declare reactive dependencies; do not hide changing values behind refs merely to avoid resynchronization.

## Provider scope

Ask whether two mounted browsers or editors should share state. Scope providers and mutable resources to that answer so independent instances do not interfere. Required Context hooks must detect a missing provider and throw a useful error; a type assertion or dummy default must not hide invalid placement. Optional Context access should be explicit in its contract.

## Store selectors and performance

Subscribe to the value rendering uses, including the result of a lookup rather than just its lookup function. Avoid selecting a whole store when a field or derived boolean is sufficient. Selectors that allocate objects need the store's supported equality mechanism. Reserve imperative reads for non-React code or deliberate event-time snapshots; they do not subscribe displayed output. See [store access in examples](writing/writing.md#store-access-in-examples).

Memoization must not determine correctness or whether a callback sees current props. Check compiler behavior before adding manual stabilization. When subscriptions, Context, or props can change render behavior in core, tracks, or UI, use the [verify-renders skill](../.agents/skills/verify-renders/SKILL.md) to measure committed renders. Verify observable behavior through the affected caller as described in [testing](contributing/testing.md).
