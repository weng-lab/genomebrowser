# Session snapshot

`@weng-lab/session-snapshot` is a private package with the Zod schema for a saved browser session: browser settings, region, highlights, ordered track configurations, and pinned track IDs. The web app and the browser server both validate snapshots with it, so it must stay browser-safe and depend only on Zod.

`browser.assembly` is the session's only assembly value. The schema accepts any assembly ID. The web app decides which assemblies it supports, and restoring a snapshot into a browser store for another assembly fails.

Build it with `pnpm exec turbo run build --filter=@weng-lab/session-snapshot`. Turbo builds it before its consumers.
