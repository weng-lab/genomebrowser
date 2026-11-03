# ADR 0006: Internal zero-based half-open coordinates

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

Genomic tools disagree on 0- vs 1-based and inclusive vs exclusive ends. Mixing conventions inside the runtime causes off-by-one bugs across stores, fetchers, and renderers.

## Decision

Inside the browser, regions are **zero-based and half-open**. Stores, track fetchers, renderers, and interaction callbacks use that convention. File readers return zero-based half-open records regardless of on-disk format. Convert to and from **display** (one-based inclusive) only at human boundaries via `formatDisplayRegion` / `parseDisplayRegion`.

## Consequences

Consumer docs and the glossary must state the convention; APIs do not silently reinterpret strings. New readers for 1-based formats must convert on the way in. Roadmap items about “clarifying” coordinates should not reopen this internal rule without a new ADR.
