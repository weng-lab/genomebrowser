# Ticket 04: Align Cytoband Authentication and Assembly Inputs

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R2–R7, R22
**Blocked by:** T01

## Outcome

`Cytobands` can call the protected SCREEN GraphQL endpoint using the same build-time credential behavior as the Transcript module, while accepting common GRCh38 assembly aliases and sending the API’s expected `hg38` value.

## Scope

Update cytoband request handling to:

- Read `SCREEN_API_KEY` from `import.meta.env`, consistent with the current Transcript module.
- Send the key as a bearer token when using the default SCREEN GraphQL endpoint.
- Produce a clear configuration error when the default endpoint is used without a key.
- Never send the SCREEN API key to a consumer-supplied endpoint.
- Accept `GRCh38`, `GRCH38`, and `hg38` as equivalent human assembly inputs.
- Normalize those aliases to `hg38` only in the cytoband GraphQL request.
- Preserve unsupported or application-specific assembly strings rather than guessing a mapping.
- Keep request identity based on the caller’s endpoint, assembly, and chromosome.
- Keep the manual harness using the public `GRCh38` assembly name.
- Add the necessary UI v2 Vite environment typing and prefix configuration.
- Add focused authentication and assembly-normalization tests.

## Acceptance Criteria

- [x] The default SCREEN request includes `Authorization: Bearer <SCREEN_API_KEY>`.
- [x] The default request fails with a clear configuration message when `SCREEN_API_KEY` is unavailable.
- [x] A custom endpoint does not receive the SCREEN authorization header.
- [x] `GRCh38`, `GRCH38`, and `hg38` each produce `assembly: "hg38"` in GraphQL variables.
- [x] Unknown assembly strings are passed through unchanged.
- [x] Assembly normalization does not change the component’s public assembly prop or browser-store state.
- [x] Endpoint, original assembly input, and chromosome remain the request-cache identity.
- [x] The GraphQL query shape remains compatible with the existing core cytoband query.
- [x] Authentication failures, HTTP failures, and GraphQL failures remain visible while SVG dimensions and geometry remain valid; long text overflow is accepted.
- [x] UI v2 declares and exposes the `SCREEN_` build environment consistently with v2.
- [x] The manual harness renders the ideogram using `assembly="GRCh38"`.
- [x] Existing cytoband request, cache, rendering, and geometry tests remain green.

## Verification

Focused tests must demonstrate:

- Authorized default-endpoint requests.
- Missing-key behavior.
- No credential forwarding to overridden endpoints.
- All supported GRCh38 aliases and unknown-assembly pass-through.
- Request identity and completed-cache behavior across aliases.
- Existing HTTP, GraphQL, malformed-response, and rendering behavior.

Run the applicable UI v2 tests, build/type declarations, lint, format check, and React diagnostics according to repository guidance.

## Constraints

- Match the Transcript module’s current `import.meta.env.SCREEN_API_KEY` behavior for consistency.
- Never expose the key through component props.
- Never forward the SCREEN key to arbitrary endpoints.
- Normalize assembly names at the request boundary only.
- Do not modify the Transcript module or its known credential-coupling TODO.
- Do not add Apollo.
- Do not add highlights or tooltips.

## Out of Scope

- Replacing build-time credentials with an application proxy.
- Resolving Transcript’s existing release/security TODO.
- Supporting arbitrary assembly synonym databases.
- Migrating PsychSCREEN or SCREEN3.0.
- Documenting the final public component API, which remains in Ticket 03.

## Completion Notes

Added default SCREEN endpoint authentication through build-time `import.meta.env.SCREEN_API_KEY`, while ensuring custom endpoints never receive that credential. Cytoband requests now normalize `GRCh38`, `GRCH38`, and `hg38` to the resolver's `hg38` wire value and preserve unknown assemblies. Cache identity continues to use the caller's original assembly.

Updated UI v2 environment typing and Vite `SCREEN_` exposure, retained `GRCh38` in the manual harness, and expanded focused coverage for authentication, missing credentials, custom endpoints, assembly aliases, pass-through behavior, and alias cache identity.

Validation completed successfully: focused ideogram tests (22), full UI v2 tests (72), UI v2 build/type declarations, lint, format check, and `git diff --check`. React Doctor reported no chromosome ideogram findings; remaining warnings are pre-existing TrackSelect diagnostics.

Added maintainer guidance in `docs/v2/dataFetching.md` and linked it from `docs/v2/concepts.md`. The guide documents SCREEN endpoint authentication, CORS diagnosis, assembly normalization, request ownership, credential boundaries, and the known build-time credential risk.
