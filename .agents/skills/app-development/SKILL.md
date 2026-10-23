---
name: app-development
description: Implement or review genomebrowser app features involving sessions, collections, guest access, account settings, assemblies, or agent/MCP control in apps/web, apps/server, and apps/contracts. Excludes package-only changes and documentation-only edits.
---

# App development

## Establish scope and current behavior

Read [app direction](../../../docs/05-app/README.md) and the relevant part of [MVP scope](../../../docs/05-app/mvp.md). The MVP is product intent, not proof that a feature exists. Read the matching feature context and [limitations](../../../docs/05-app/limitations.md), then inspect code and tests for the affected operation. Explicit task instructions can change the agreed scope; do not silently pull follow-ups into ordinary implementation work.

- Sessions, guest restoration, or copies: [sessions](../../../docs/05-app/sessions.md).
- Agent commands, connection lifetimes, or access: [agent access and control](../../../docs/05-app/agent-auth.md). Provider choice and proposed credentials are not settled APIs.
- Ownership and wiring: [feature boundaries](../../../docs/05-app/features.md) and [feature placement](../../../docs/01-project/02-feature-placement.md).

## Work through the owning operation

Use the architecture-design skill for new or substantially changed responsibilities. For smaller changes, extend the existing owner. Session callers should not reconstruct autosave, cancellation, or store-replacement ordering. Reuse snapshot schemas and inferred types rather than creating parallel persistence models. Live store actions and resources do not belong in serialized session copies.

For agent work, trace the operation from contract through authorization and delivery to browser execution and reply. Check interruption and access revocation at the boundaries that actually accept reads or mutations, rather than treating UI visibility as enforcement. UI and agent paths should use the same owning operation. Verify new behavior against the requested scope, including manual operation when agent access is disabled.

## Prefer enforcement over more instructions

Import and cycle rules are already enforced by the root lint configuration and `tools/lint/policy.test.mjs`. When changing a dependency boundary, update its lint rule and meaningful allowed/forbidden fixtures together. For behavioral invariants, use the owning schema, runtime check, and tests. Keep design tradeoffs in product context; do not add a prose rule as a substitute for enforceable behavior.

Follow [verification](../../../docs/02-contributing/verify.md) for required checks and the React/render skills when applicable. Report implemented behavior separately from planned work, and update the affected app context when the implementation changes its claims.
