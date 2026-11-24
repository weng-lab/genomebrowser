# Architecture decision records

ADRs record decisions about the **repository and system shape** that should change only when we deliberately change those decisions. Ordinary implementation detail stays in code.

## When to write one

Write an ADR when maintainers choose among meaningful alternatives for package boundaries, persistence, release policy, coordinate conventions, or similar. Skip ADRs for routine refactors and for principles better enforced by lint or covered in [code standards](../code_standards.md). Edit ADRs only when asked.

## Format and status

Each ADR is short: context, decision, consequences. Optional: alternatives considered (only if real). Status: **accepted** or **proposed** (not yet accepted).

To supersede an ADR, write a new ADR with `Supersedes: ADR 000X` that records why the old design was replaced, then delete the old ADR file. Keep existing numbers permanent; check git history if you ever need a retired ADR.
