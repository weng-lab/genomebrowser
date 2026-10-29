---
name: app-development
description: Implement or review genomebrowser app features involving sessions, collections, guest access, account settings, assemblies, or agent/MCP control in apps/web, apps/server, and apps/contracts. Excludes package-only changes and documentation-only edits.
---

# App development

1. Read [product direction](../../../docs/product/README.md) and the relevant [MVP](../../../docs/product/mvp.md) section. MVP is intent, not proof of implementation. Read matching product pages ([sessions](../../../docs/product/sessions.md), [agent-auth](../../../docs/product/agent-auth.md), [limitations](../../../docs/product/limitations.md)), then inspect code and tests.
2. Place work with [feature placement](../../../docs/feature-placement.md) and [ADR 0004](../../../docs/adr/0004-web-app-feature-layering.md). Follow [code standards](../../../docs/code_standards.md).
3. Use the architecture-design skill for new or substantially changed responsibilities. Reuse snapshot schemas; keep live actions out of serialized copies. For agent work, trace contract → authorization/delivery → tab execution → reply; UI and agent share the same owner.
4. Prefer lint, schemas, and tests over new prose rules. Update lint fixtures when changing import boundaries.
5. Verify with [verify](../../../docs/contributing/verify.md). Report implemented behavior separately from planned work; update product context when implementation changes its claims.
