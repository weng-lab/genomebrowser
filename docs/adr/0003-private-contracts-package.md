# ADR 0003: Private contracts package

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

Web and MCP must agree on tool names, parameter schemas, and reply shapes without importing each other's runtimes (Next.js, React stores, Hono internals).

## Decision

Place browser-safe command contracts, wire schemas, and the shared region schema in private `@weng-lab/contracts` (`apps/contracts`). Depend only on schema libraries (Zod). Both apps import the package through the workspace; neither imports the other's source.

## Consequences

Handlers, user models, and session snapshots stay app-owned. Lint forbids non-schema dependencies in contracts. Adding a command means updating contracts, then the web handler and tests; MCP picks up tools from the compiled definitions.
