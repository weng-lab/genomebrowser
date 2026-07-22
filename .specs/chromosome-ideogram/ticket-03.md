# Ticket 03: Harden and Document Ideogram Integration

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R5–R7, R9–R20, R24–R25
**Blocked by:** T02

## Outcome

The chromosome ideogram is proven against both established use cases, documented for downstream consumers, and protected by integration-level regression coverage.

## Scope

Complete the feature through integration hardening:

- Add a current-region example by passing the complete `BrowserRegion` selected from a v2 browser store to `currentRegion`.
- Add a multiple-locus example with click handlers and custom tooltip content.
- Demonstrate custom tooltip content that loads or looks up information only while active.
- Add regression coverage spanning fetching, rendering, highlights, and tooltip lifecycle.
- Exercise rapid chromosome changes and rapid highlight transitions.
- Verify deterministic overlapping-highlight behavior.
- Integrate both use cases into the UI v2 manual harness.
- Add self-contained UI v2 package documentation covering the public API, fetching, endpoint overrides, proxy/authentication expectations, highlights, interactions, accessibility, and tooltip ownership.

This ticket should harden the completed component rather than redesign its public contract.

## Acceptance Criteria

- [x] Automated coverage demonstrates a complete chromosome with a separate current-region bracket.
- [x] The browser-region example passes a v2 `BrowserRegion` directly to `currentRegion` without a component-specific adapter type.
- [x] Changing the browser-store region moves the non-interactive bracket without refetching cytobands or changing application highlights.
- [x] Automated coverage demonstrates multiple interactive loci with custom tooltip content.
- [x] The custom-tooltip example can obtain application data from the highlight ID or coordinates without extending the shared highlight type.
- [x] Async or stateful tooltip content mounts only for the pointer-hovered highlight and does not remain attached after the pointer moves.
- [x] Integration coverage confirms rapid endpoint, assembly, or chromosome changes cannot display stale bands.
- [x] Integration coverage confirms rapid movement between highlights cannot display stale tooltip content.
- [x] Integration coverage covers wide, narrow, overlapping, clipped, mismatched-chromosome, and invalid highlights.
- [x] Integration coverage confirms pointer and keyboard activation report the same semantic highlight while focus does not open or retain a visual tooltip.
- [x] The UI v2 manual harness visibly demonstrates the browser-region and multiple-locus use cases.
- [x] The manual harness uses placeholder or existing endpoints only and does not invent track URLs.
- [x] Package documentation identifies all required and optional props.
- [x] Package documentation describes the default SCREEN GraphQL endpoint and endpoint override.
- [x] Package documentation explains why applications may need an authenticated proxy and how to supply its URL.
- [x] Package documentation describes inherited and explicit highlight chromosome behavior.
- [x] Package documentation describes default and custom tooltips, including the active-only mount lifecycle.
- [x] Package documentation includes pointer and keyboard interaction behavior.
- [x] Package documentation explains that application-specific tooltip data remains application-owned.
- [x] Package documentation uses only public package-root imports.
- [x] Existing UI v2 behavior and tests remain green.

## Verification

Verify the two supported workflows end to end at the component boundary:

1. A complete v2 browser-store `BrowserRegion` passed to `currentRegion` and rendered as a separate non-interactive bracket over its chromosome.
2. Multiple clickable loci with narrow and wide geometry and asynchronously populated custom tooltip content.

Run the complete applicable UI v2 test suite, type checking/build, linting, formatting checks, and React diagnostics according to repository guidance.

Inspect the manual integration harness without running the repository development server.

Confirm package documentation is self-contained and does not link upward into root maintainer documentation.

## Constraints

- Do not expand the public API unless a demonstrated integration failure cannot be solved through the approved contract.
- Use existing or placeholder endpoints in examples.
- Keep package documentation self-contained for installed-package use.
- Treat the saved spec and completed T01/T02 contracts as authoritative.
- Any necessary architectural deviation must be raised before implementation.

## Out of Scope

- Migrating PsychSCREEN or SCREEN3.0.
- Removing legacy core or `umms-gb` cytobands.
- Adding application-specific data fetching to `Cytobands`.
- Supporting multiple chromosomes in one component.
- General-purpose annotation or track rendering.

## Completion Notes

Added by the implementation workflow.
