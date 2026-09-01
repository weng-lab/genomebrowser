---
name: create-playground-harness
description: Use when asked to create an interactive playground page, smoke-test page, demo page, or manual validation harness for genomebrowser changes in apps/playground. This is for temporary human exploration, not automated or agent verification.
---

# Create a playground harness

Create a temporary, interactive page where the maintainer can exercise an implementation and suggest revisions. The harness is disposable by default and must invoke the real package behavior rather than reproduce it.

## Propose the harness

Inspect the current changes, the production API or component they expose, and the nearest playground route. Read `DESIGN.md`. Before changing the Next.js app, read the installed documentation beginning at `apps/playground/node_modules/next/dist/docs/index.md` and follow the applicable guidance.

Give the user a concise proposal that names:

- the behavior they will be able to explore
- the route under `apps/playground/app/<feature>-harness/`
- the real component, hook, function, store, or service the page will invoke
- the controls and observable state the page will expose
- representative normal, boundary, failure, and repeated-action scenarios that matter for this change
- the files expected inside the route directory

Ask the user to approve or revise the proposal. Do not edit files until they approve it. This step is complete when the user and agent agree on a focused harness tied to the actual implementation.

## Keep it self-contained

Place every harness file, fixture, and local helper inside `apps/playground/app/<feature>-harness/`. The entire harness should be removable by deleting that directory.

- Do not add the route to application navigation.
- Do not modify shared playground configuration, styles, or state.
- Do not change production behavior to support the harness.
- Do not add dependencies or reusable abstractions.
- Do not add code markers; the route directory is the disposable boundary.
- Do not expose secrets, move server-only behavior into client code, or invent track URLs.

Import workspace package APIs directly. If the agreed behavior cannot be exercised without changing a file outside the route directory, stop and propose the minimum external plumbing and its cleanup cost before editing it. This step is complete when deleting one route directory removes the harness, unless the user explicitly approved a wider boundary.

## Make behavior explorable

Use MUI and the active theme for application controls, following `DESIGN.md`. Prefer a compact working surface over a polished demo. Use domain-specific labels and include only controls that help the maintainer understand the change.

Provide editable inputs, useful presets, and explicit actions where the flow is not naturally reactive. Show current state, transitions, errors, and raw structured output when they help explain what happened. Exercise the real production seam directly; do not duplicate its logic or replace it with a mock.

Cover the meaningful scenarios from the approved proposal. Include repeated actions when state transitions, cleanup, cancellation, caching, or stale data could affect the result. This step is complete when the maintainer can initiate each scenario and observe its outcome from the page.

## Verify and hand off

Run `pnpm verify` from the repository root and fix failures caused by the harness. Never run `pnpm run dev`; the user owns the development server.

Report:

- the route path the user should open
- the scenarios and controls available
- the production seam being exercised
- the verification result and any unrelated failures
- the route directory to delete when finished

The work is complete when the route builds, the page exercises the agreed production behavior, and cleanup is a clearly identified directory deletion.
