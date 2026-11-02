# Architecture decision records

ADRs record decisions about the **repository and system shape** that should change only when we deliberately change those decisions. Ordinary implementation detail stays in code. Product scope lives under [product](../product/README.md).

## Decisions

- [0001: Embeddable package boundaries](0001-embeddable-package-boundaries.md)
- [0002: Web owns persistence; MCP is a relay](0002-web-owns-persistence-mcp-is-relay.md)
- [0003: Private contracts package](0003-private-contracts-package.md)
- [0004: Web app feature layering](0004-web-app-feature-layering.md)
- [0005: Independent package releases](0005-independent-package-releases.md)
- [0006: Internal zero-based half-open coordinates](0006-internal-zero-based-coordinates.md)

## When to write one

Write an ADR when maintainers choose among meaningful alternatives for package boundaries, persistence, release policy, coordinate conventions, or similar. Skip ADRs for routine refactors and for principles better enforced by lint or covered in [code standards](../code_standards.md).

## Format and status

Each ADR is short: context, decision, consequences. Optional: alternatives considered (only if real). Status: **accepted**, **superseded** (link forward), **historical**, or **proposed** (not yet accepted).

Do not silently rewrite history; supersede and link.
