# Build orchestration

Package scripts own their commands; [turbo.json](../../turbo.json) owns dependency ordering and caching. Several packages consume built workspace output and declarations, so dependencies must build first on a clean checkout. Keep this ordering in Turbo instead of nesting dependency builds in ordinary package scripts.

Direct package checks are useful when dependency artifacts are already available. Use Turbo when the task needs dependency ordering and caching. See [verification guidance](../contributing/verify.md) for everyday checks.

When changing a task, account for the files and environment it reads, the dependency outputs it consumes, and the artifacts its cache must restore. Tasks that edit source files, such as formatting and lint fixes, must remain uncached.

Packaging is an intentional exception to Turbo-managed ordering. Library `prepack` hooks use `build:checked` and build required publication dependencies themselves. They run outside Turbo and must not pack stale or missing output.

Collection schemas are generated from module definitions. Change the inputs and regenerate the JSON; see [schema regeneration](collection-schemas.md) for commands and checks.

## Application development servers

The active application is `apps/web`. Archived applications in `legacy/playground` and `legacy/standalone` are excluded from the pnpm workspace and Turbo tasks.

Run `pnpm dev` for the Next.js app on port 3000, including its MCP endpoint. The filtered Turbo `dev` task depends on `^build`, so a clean checkout builds dependency outputs first. Development tasks are persistent and uncached.

Build with `pnpm exec turbo run build --filter=@weng-lab/web`. See the [web guide](../../apps/web/README.md) for configuration, commands, and deployment.

The web app contains its workspace layout and domain pages directly. It has no separate workspace application dependency. Local and cloud deployments build the same Next.js app, which serves the UI, saved sessions, and the MCP endpoint together.
