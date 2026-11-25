# ADR 0006: Internal zero-based half-open coordinates

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

Genomic tools disagree on 0-based vs. 1-based starts and inclusive vs. exclusive ends. Mixing conventions inside the runtime causes off-by-one bugs across stores, fetchers, and renderers.

## Decision

Inside the browser, all regions are **zero-based and half-open**. Stores, track fetchers, renderers, and interaction callbacks follow that convention. File readers return zero-based half-open records regardless of the format on disk. Convert to and from **display coordinates** (one-based, inclusive) only at human-facing boundaries using `formatDisplayRegion` and `parseDisplayRegion`.

## Consequences

Consumer docs and the glossary state the convention explicitly, and APIs never silently reinterpret coordinate strings. New readers for 1-based formats must convert coordinates on the way in. Do not reopen this internal convention without a new ADR.
