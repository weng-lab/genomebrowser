---
name: create-playground-harness
description: Use when asked to create an interactive playground page, smoke-test page, demo page, or manual validation harness for genomebrowser changes in apps/playground. This is for temporary human exploration, not automated or agent verification.
---

# Create a playground harness

Create a temporary, interactive page where the maintainer can exercise an implementation and suggest revisions. The harness is disposable by default and must invoke the real package behavior rather than reproduce it.

## Propose the harness

Inspect the current changes, the production API or component they expose, and the nearest playground route. Read [interface design](../../../docs/01-project/03-design.md). Before changing the Next.js app, read the installed documentation beginning at `apps/playground/node_modules/next/dist/docs/index.md` and follow the applicable guidance.

Give the user a concise proposal that names:

- the behavior they will be able to explore
- the route under `apps/playground/app/<feature>-harness/`
- the real component, hook, function, store, or service the page will invoke
- the controls and observable state the page will expose
- representative normal, boundary, failure, and repeated-action scenarios that matter for this change
- the files expected inside the route directory

Ask the user to approve or revise the proposal. Do not edit files until they approve it.

## Keep it self-contained

Place every harness file, fixture, and local helper inside `apps/playground/app/<feature>-harness/`. The entire harness should be removable by deleting that directory.

- Do not add the route to application navigation.
- Do not modify shared playground configuration, styles, or state.
- Do not change production behavior to support the harness.
- Do not add dependencies or reusable abstractions.
- Do not add code markers; the route directory is the disposable boundary.
- Do not expose secrets, move server-only behavior into client code, or invent track URLs.

Import workspace package APIs directly. If the agreed behavior requires changes outside the route directory, stop and describe the required changes and how to remove them. Get the user's approval before editing those files.

## Make behavior explorable

Use MUI and the active theme for application controls, following the interface design guidance. Keep the page compact and focused on the behavior being explored. Use domain-specific labels and include only controls that help the maintainer understand the change.

Provide editable inputs, useful presets, and explicit actions where the flow is not naturally reactive. Show current state, transitions, errors, and raw structured output when they help explain what happened. Call the production component or API directly. Do not duplicate its logic or replace it with a mock.

Cover the meaningful scenarios from the approved proposal. Include repeated actions when state transitions, cleanup, cancellation, caching, or stale data could affect the result.

## Verify and hand off

Run `pnpm verify` from the repository root and fix failures caused by the harness. Never run `pnpm run dev`; the user owns the development server.

Report:

- the route path the user should open
- the scenarios and controls available
- the production component or API being called
- the verification result and any unrelated failures
- the route directory to delete when finished

The work is complete when the route builds and the maintainer can run each agreed scenario and observe its outcome. Deleting the route directory must remove the harness. If the user approved changes outside that directory, also explain how to remove those changes.
