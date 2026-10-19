# Feature boundaries

Features own their data and operations. Compose them through dependency injection, with small interfaces that hide meaningful work. The goal is simple feature development, not more wrappers around existing code.

## Identity and data

Clerk owns user identity, name, and email. Do not duplicate that profile in an application user table without an app-specific need. Sessions store the Clerk user ID as their owner; query sessions by owner instead of maintaining another list on a user record.

Each feature owns its persistence. Sessions have their own table. Future user settings can have a separate table and module when needed. Server-side operations obtain the acting user through an injected identity capability and enforce ownership. Clerk supplies that identity in production; an explicit local development mock supplies stable test users. The browser never chooses the acting user.

## Dependency injection

Choose concrete collaborators where the app is assembled. Next.js server composition supplies database access and authenticated identity to feature operations. Client composition supplies browser stores and the session data operations to the session lifecycle. The MCP connection attaches independently to the ready browser session.

Production composition uses Clerk and PostgreSQL on Google Cloud SQL. Local composition uses mock identity and local PostgreSQL. Both run the same feature operations, ownership checks, Drizzle schema, and migrations. Select these dependencies at server startup; resolve authenticated identity per request. Keep local mock identity unavailable in production.

Inject complete capabilities, not callbacks for every internal step. UI components consume feature operations without supplying database clients, Effect scopes, transport details, or retry policies. Keep client and server composition separate; server credentials and database dependencies never enter the browser.

Reuse existing interfaces where they fit. Add a seam for a real responsibility, variation, or testing need. DI does not require a service container, a provider per dependency, or an interface around every helper. A provider should establish a necessary shared lifetime. Internal helpers remain private.

## Assemblies and tracks

Assemblies own supported-genome discovery and resolution using existing assembly definitions. Session creation asks which assemblies are supported and resolves the chosen assembly and its defaults through that feature. Keep assembly-specific setup out of panels and session persistence.

Tracks own creation and configuration validation through existing track modules and the registry. Sessions persist their configurations and restore through those capabilities. Extend existing modules before introducing parallel track models or registries.

Application policy, such as supported assemblies and starter tracks, belongs in the app. Reusable browser capabilities remain in the packages. Shared command contracts must be browser-safe and independent of the MCP server implementation.

[Back to app direction](README.md)
