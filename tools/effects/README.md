# Effects and state machines spike evidence

This directory records the Oct 29 spike for Jair and Juniper. The proposal is in
[the draft ADR](../../docs/adr/0001-restrict-effects.md). It is not adopted policy.

Run from the repository root after `pnpm install`:

```sh
pnpm audit:effects
pnpm lint:effects
node tools/effects/metrics.mjs
pnpm web test sessionLifecycle.test.ts
pnpm verify
```

Run verification **escalated, one run at a time** in this environment. The default
sandbox breaks subprocess output and loopback listeners. The focused web tests
need workspace dependencies built first; `pnpm verify` supplies that ordering.
The session tests use contract-correct in-memory HTTP responses, not PostgreSQL.
Database tests are skipped when `GB_TEST_DATABASE_URL` is absent.

## Audit

[audit.json](audit.json) is the complete file:line inventory, with one category and
an idiomatic replacement for every call. [classifications.json](classifications.json)
is the human judgment behind it. `node tools/effects/audit.mjs --write` updates the
report after reviewing classifications. Ordinary invocation fails on drift,
unclassified sites, stale entries, or changed callback fingerprints.

The TypeScript AST pass scans JS/TS source and test files recursively under both
requested directories. It excludes generated `.next`, `dist`, coverage, caches,
and dependencies. It recognizes named imports, aliases, default React imports,
and namespace imports. It counts calls, not import mentions, effect events,
comments, or documentation examples. Re-exported hooks, CommonJS imports,
computed member access, and lexical shadowing require extending binding analysis;
none occur among the repository's current effect calls. The parser comes from
core's declared TypeScript compiler API dependency.

| Scope         | Production | Tests | Total |
| ------------- | ---------: | ----: | ----: |
| apps/web      |          6 |     1 |     7 |
| packages/core |         24 |     4 |    28 |
| Both          |         30 |     5 |    35 |

| Category      | Production | Tests | Total |
| ------------- | ---------: | ----: | ----: |
| derived state |          1 |     0 |     1 |
| syncing state |          2 |     1 |     3 |
| event logic   |          0 |     2 |     2 |
| external sync |         26 |     2 |    28 |
| data fetching |          1 |     0 |     1 |

Mixed sites get one primary category. Download effects are classified as syncing
state because they reset React state from identity changes; their abort and
subscription cleanup must remain. DOM measurements and committed ref publication
are external synchronization even when they set state. Data-controller connection
and session start own external resource lifetimes; route-driven `open(requested)`
is the data-fetching trigger. These choices are reviewable judgments, not facts
inferred by the parser. A blanket rule based on setter names would get them wrong.

## Lint POC

The repository uses **oxlint 1.76.0**, with React hook dependency checking already
enabled. [plugin.mjs](plugin.mjs) uses its JS plugin API; the separate config makes
`pnpm lint:effects` opt-in and warning-only. Root `pnpm verify` exercises the actual
CLI through `lint.test.mjs`, including aliases, namespaces and unknown effects.
Turbo's policy inputs include the rule, manifest and audited source directories.

It reports **7 warnings: 4 production and 3 test sites**, exactly the non-external
categories above. A reviewed external site is allowed only while its fingerprint
matches. New or changed effects warn with render derivation, identity reset,
event-handler, query/route-owner, or external-review guidance. Reviewed bad sites
get their specific replacement as the diagnostic. The rule does not pretend to
infer arbitrary callback semantics, including effects hidden in custom hooks.
Fingerprinting makes review conservative and whitespace-sensitive; that is a
maintenance cost to evaluate before adoption. It deliberately does not autofix.

[Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) documents
this integration API, which remains alpha.

## State machine POC

**Choice: session load/save, specifically autosave's write lifecycle**, because
retry identity, newer edits, conflict resolution and terminal failures already
interact in a real Zustand-backed flow. The app has remote agent commands rather
than a chat lifecycle; local session file import is not implemented. The SQLite
import script is an administrative migration, not a user interaction to rewrite.

The existing session owner remains the complete operation for callers:

```ts
const session = createSession({
  transport: createSessionTransport(),
  createStores,
  navigation: { show },
  saveMachine: "xstate", // or "reducer" (the spike default)
});
const stop = session.start();
await session.store.getState().open(id);
session.store.getState().rename("Promoter");
await session.store.getState().close();
stop();
```

Both variants run behind this same operation, not as disconnected transition
demos. `saveLifecycle.ts` defines a discriminated union: idle, writing with a fixed
request and retry count, conflict with a failure, or ended with a failure. A
conflict or ended state cannot also expose a write request. Reducer transitions
are independent of the XState transition table. XState stores the union in one
nested context field because `assign` merges top-level context properties.
Both machines stop with the existing Effect scope.

The machine owns write phase and failure transitions. Autosave still owns latest
and acknowledged snapshots, revision, refused-input history, debounce, retry
clock, flush waiters and subscriptions. Effect still serializes requests, aborts
HTTP work and closes resources. Zustand browser/track stores and track modules
are unchanged. This is a bounded rewrite of the write lifecycle, not a replacement
of the whole session service or the Effect runtime.

`START` retains one immutable body/revision/save ID. `UNAVAILABLE` increments its
retry count without replacing the request; acknowledgement releases it. Invalid
input releases it but retains refused-body history with the autosave owner.
Conflict blocks future writes until explicit resolution; permanent failures end
saving. This avoids adding a second actor system to own the same timers/requests.
The simpler alternative is retaining the original local variables inside the
existing deep autosave module. That remains viable and is smaller.

`sessionLifecycle.test.ts` passes 78 behavior tests, 39 scenarios per variant.
It runs the entire existing lifecycle suite against each
variant, including lost responses, backoff, newer edits, close/flush, deletion,
account changes, unsupported restoration and simultaneous conflict resolution.
The added case deletes a session during conflict resolution and verifies terminal
save failure, command-signal revocation, no further PUTs, and explicit discard.
Tests drive the real session operation, stores, snapshot code and HTTP transport;
only HTTP responses and time are controlled. No render improvement is claimed:
this spike changes no React hooks, components, selectors, or core subscriptions.
Existing render-budget tests remain part of workspace verification.

## Size and branching

[metrics.json](metrics.json) is generated by `metrics.mjs`, using the immutable
baseline commit `581f353f2086cd9ad3f0e1e6694ce79202acb1dc`. That commit must be
available locally to reproduce the comparison. `--write` updates the evidence.
Counts exclude test code and include the complete autosave owner plus shared
contract and selected implementation, not merely the small machine file.

| Implementation              | Physical LoC | Source LoC | Decision sites | Summed complexity proxy |
| --------------------------- | -----------: | ---------: | -------------: | ----------------------: |
| Original autosave           |          241 |        189 |             39 |                      57 |
| Shared owner after rewrite  |          251 |        200 |             45 |                      69 |
| Shared contract             |           20 |         18 |              0 |                       0 |
| Reducer implementation only |           41 |         39 |             13 |                      18 |
| XState implementation only  |           62 |         60 |              5 |                      17 |
| Reducer total               |          312 |        257 |             58 |                      87 |
| XState total                |          333 |        278 |             50 |                      86 |

Source LoC counts physical lines containing a non-trivia TypeScript token.
Decision sites count `if`, ternary, `case`, loops, `catch`, `&&`, `||`, and `??`;
the summed complexity proxy adds functions with bodies. It is not a runtime,
cognitive, or tool-standard cyclomatic score. In particular, XState expresses
branching in a declarative table that this metric does not count as decisions.
The table has four states and eight declared event transition alternatives
(including the root END transition); there are no parallel or hierarchical states.
The source increase is **68 lines for reducer, 89 for XState**. Neither reduces
total code or syntactic complexity here. The gain is explicit legal state shape
and transition locality. [XState v5 docs](https://stately.ai/docs/quick-start)
describe the actor model used by the alternate implementation.

XState is one new production dependency in the web app. Both implementations are
statically imported for comparison, so even the reducer selection does not prove
an XState-free production bundle. Before product adoption, remove the losing
variant and its selector, and remove XState if the reducer wins. No package or
track-module API is added; no compatibility layer is introduced.
