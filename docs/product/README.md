# App product direction

We are building an agentic genome browser researchers can use manually or with an integrated agent. [MVP scope](mvp.md) owns vision, launch scope, follow-ups, and open decisions. Agent control is central; users can disable it and keep browsing manually.

These pages distinguish **intended** behavior from **implemented** behavior. GitHub issues track work. Implementation how-to lives in `apps/web/README.md` and `apps/server/README.md`. Placement and layering live in the knowledge base ([feature placement](../feature-placement.md), [ADR 0002](../adr/0002-web-owns-persistence-mcp-is-relay.md), [ADR 0004](../adr/0004-web-app-feature-layering.md)), not here.

## Read next

- [MVP scope](mvp.md)
- [Sessions](sessions.md): persistence intent and save invariants
- [Agent access and control](agent-auth.md)
- [Limitations](limitations.md)
- [Production deployment](production.md): beta vs real production resources

Import boundaries are linted; skills guide workflows. Prefer schemas, runtime checks, and tests over new prose rules.
