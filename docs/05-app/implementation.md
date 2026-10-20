# Implementation status

The planned refactor is complete. [App direction](README.md), [sessions](sessions.md), and [feature boundaries](features.md) describe the resulting architecture. App READMEs own setup instructions. See [limitations](limitations.md) for current constraints and deployment gaps, and [Verifying changes](../02-contributing/verify.md) for standard verification guidance.

No compatibility aliases or automatic ownership claims for old SQLite data are part of this design.

Session import/export UI, user settings, incremental writes, and advanced conflict handling remain deferred. MCP authentication, user-scoped discovery tools, and the Vercel Eve agent panel are proposed in [agent authentication](agent-auth.md); they are not part of the completed refactor. The current Agent panel only shows connection information.

[Back to app direction](README.md)
