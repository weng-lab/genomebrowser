# Next.js Performance

Apply only to Next.js code. Follow the bundled-documentation lookup in [SKILL.md](../SKILL.md). Confirm router, runtime, cache configuration, and React version before choosing APIs.

## Remove Fetching Waterfalls

Start independent work together and await it where consumed. Keep dependent operations ordered; do not start protected work before required authorization. Fetch independent siblings concurrently rather than serially through a parent. For collections, preserve per-item dependencies while allowing independent items to progress, with appropriate concurrency limits.

Place Suspense boundaries around meaningful independently loading regions when the router and data source support streaming. Keep useful surrounding content available; do not delay the whole page for an optional region. Handle rejection and loading states according to framework conventions.

## Keep Client Boundaries Small

Keep server-only work and dependencies on the server. Pass the data client components actually need instead of entire records. Check serialization constraints and payloads before optimizing repeated data. Avoid promoting a large subtree to a client boundary for one interactive leaf.

Use the installed framework's supported dynamic-loading and import optimization facilities when bundle analysis identifies a costly dependency. Respect server/client restrictions and the package's public typed exports.

## Distinguish Cache Lifetimes

Request deduplication and persistent caching solve different problems. Check existing framework fetch behavior before adding another cache. Where supported in a React server-rendering context, a shared `cache` wrapper can deduplicate repeated non-fetch work; equivalent primitive arguments avoid accidental identity-based misses. Do not assume that wrapper provides persistent storage or works identically in route handlers and arbitrary server code.

For cross-request caching, establish the key, user/tenant scope, invalidation policy, size bound, and acceptable staleness. Use existing framework or application infrastructure when appropriate. A process-local cache is limited to its process lifetime and is not a deployment-wide source of truth. Do not add an LRU dependency by default.

Keep request-specific mutable state out of module globals. Share only data whose lifetime and ownership permit sharing. Hoist static I/O only when supported by the runtime and when its startup cost and failure behavior are acceptable.

## Server Operations

Treat callable server mutations as public entry points: validate input and enforce authentication and authorization within the operation, regardless of UI checks. Keep permissions correct when introducing caching or parallel work.

Use a supported post-response facility only for nonessential work whose failure is tolerable. Required persistence and reliable jobs need an appropriate awaited or durable mechanism; a background callback is not a durability guarantee.

## Attribution

Adapted and condensed from Vercel Engineering's server, fetching, and bundle guidance; see [attribution](../SKILL.md#attribution). The installed framework documentation takes precedence over upstream examples and historical defaults.
