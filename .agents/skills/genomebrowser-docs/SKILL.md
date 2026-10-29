---
name: genomebrowser-docs
description: Organize and maintain bundled genomebrowser package docs and the repository knowledge base, including documentation updates for public behavior or API changes. Covers audits and documentation migrations; edit ADRs only when requested. Excludes commit messages, TODO files, and code comments unless requested.
---

# Genomebrowser docs

Read [writing](../../../docs/writing/writing.md). Then only what the task needs:

- Package structure/tutorials/audits: [package documentation architecture](../../../docs/writing/package-architecture.md)
- Public APIs: [API reference writing](../../../docs/writing/api-reference.md)
- Knowledge base / ADRs: [docs/README.md](../../../docs/README.md), [adr/README.md](../../../docs/adr/README.md)

Do not duplicate policy in this skill.

## Workflow

For discussion or audit, propose audience, page map, and approach before editing. When edits are authorized, complete that scope. Documentation required by an implementation change is in scope. Edit ADRs only when requested; do not expand a focused change into a package-wide migration.

1. Find the page that owns each explanation. Verify behavioral claims against public entry points, implementation, and tests. Distinguish product intent from implemented behavior.
2. For restructuring, inventory pages and exports; list keep/move/merge/retire before writing.
3. Rewrite affected explanations; update navigation and inbound links; retire legacy only after content has a home.
4. Check flow, duplication, and that maintainer pages help decisions rather than paraphrasing code.
5. Validate coverage, links, and package inclusion; report uncertainty.
