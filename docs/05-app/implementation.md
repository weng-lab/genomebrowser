# Implementation order

Use this as the starting context for bounded implementation threads. Read [app direction](README.md), [sessions](sessions.md), and [feature boundaries](features.md) first. Inspect the current code and working-tree changes before choosing a slice; this plan does not mean the refactor has shipped.

## Work in order

1. **Settle the model and seams.** Inspect existing assembly definitions, track modules, snapshot conversion, and callers. Define session metadata and small injected capabilities using existing types. Choose the PostgreSQL driver, connection setup, and migration strategy for Google Cloud SQL and local PostgreSQL.
2. **Establish Next.js persistence.** Compose Clerk identity and Drizzle PostgreSQL access server-side, with local mock identity and local PostgreSQL using the same schema and migrations. Add the session table, migrations, and owner-checked create, list, load, update, and delete operations. Enforce immutable assembly and distinguish creation from updating.
3. **Move session access.** Replace the standalone server's persistence endpoints and proxy configuration. Decide explicitly how existing snapshots gain ownership or are migrated; do not discard saved data implicitly.
4. **Consolidate the session lifecycle.** Reuse the browser and track stores. Implement the session interface and Effect autosave worker, then move switching and deletion coordination out of panels. Cover route/history changes as well as panel navigation.
5. **Separate MCP.** Remove database dependencies from the standalone server and separate shared command contracts. Start with one tool that sets the browser region. Make the connection an optional attachment to the active session, with stale commands unable to affect its replacement. Keep command dispatch extensible to other app features without making every command depend on browser state.
6. **Remove superseded wiring.** Delete replaced controllers, contexts, helpers, dependencies, and documentation claims. Avoid compatibility wrappers. Update current implementation docs as each slice lands.

## Slice workflow

Keep the refactor in one draft PR on `architecture-refactor`. Opus 5.5 Medium implements each bounded slice, then Sol 6.1 Medium reviews correctness, code cleanliness, and module boundaries. Return findings to Opus and request a second Sol review when needed. Limit each slice to two review rounds. Record real unresolved limitations in this directory, with their impact and follow-up, before committing the slice. Keep one implementation commit per settled slice.

Implementers run verification; reviewers inspect code and existing evidence. Complete each slice before beginning the next. The original uncommitted Effect implementation is excluded; build from the committed application and these architecture decisions.

## Verification

Preserve useful behavioral tests. Exercise local PostgreSQL migrations and ownership checks with multiple mock users. Cover immutable assembly, restoration failures, edits during saves, retry recovery, switching, and deletion during a write. Measure affected render budgets and run repository checks.

Demonstrate opening, editing, saving, reloading, switching, and deleting sessions with MCP stopped. Then connect MCP, edit through a command, disconnect, and continue browsing.

## Decisions and scope

Still to settle: PostgreSQL driver and cloud connection setup, existing-data migration, exact injected interfaces, unsaved edits on tab close, and the initial multi-tab write policy. MCP authentication and connection authorization need design before cloud deployment.

Defer sharing UI, user settings, incremental writes, and advanced conflict handling. Keep initial behavior simple without hiding unsaved data or silently losing edits.

[Drizzle #356](https://github.com/weng-lab/genomebrowser/issues/356) and [Effect #355](https://github.com/weng-lab/genomebrowser/issues/355) describe earlier implementation boundaries. Update their scope before using them as implementation briefs; the direction here takes precedence.

[Back to app direction](README.md)
