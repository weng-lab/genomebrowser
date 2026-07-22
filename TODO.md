# Monorepo Decision Backlog

This file tracks project-level decisions that affect more than one package or should be settled
before implementation. Package-specific implementation work remains in each package's `TODO.md`.

## High priority

- [ ] **Choose the UI testing methodology for the monorepo.** Decide which behaviors belong in
      fast Node tests, DOM/component tests, browser automation, and manual acceptance checks. Also
      choose the tools and conventions for rendering components, interacting with them, and sharing
      fixtures. Do not grow one-off jsdom integration suites before this is settled.

      This decision currently blocks or may reshape:

      - `packages/ui-v2/TODO.md`: remaining TrackSelect component-boundary coverage
      - `packages/v2/TODO.md`: real client-runtime testing for dialogs, focus, effects, error
        boundaries, multiple browser instances, pointer capture, and SVG coordinates

      The smallest useful outcome is a short testing policy plus one representative test proving
      the chosen setup. Until then, keep deterministic logic and store behavior in existing unit or
      hook-level tests, and explicitly waive any beta test gates that require a new test layer.

## Components

Highlight Modal
Settings Modal Components per module
Tooltips
check docs/ideas

## Later

Add cross-package or hard-to-reverse decisions here as they arise. Keep concrete implementation
tasks in the relevant package backlog.
