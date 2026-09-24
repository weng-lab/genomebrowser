# Standalone genome browser

The deployed genome browser app, built with Next.js, Clerk, and PostgreSQL. This is a private workspace package; experiments and custom browser setups belong in `apps/playground`.

Start with [local development setup](docs/localDevelopment.md) for dependencies, accounts, and either Cloud SQL or Docker. Once configured, run from the repository root:

```sh
pnpm standalone dev
```

Open `/browser` for the genomic workspace or `/dashboard` for saved sessions and custom tracks. Public browsing works without an account or database.

## Documentation

- [Local development](docs/localDevelopment.md): environment variables, database access, migrations, tests, and troubleshooting.
- [Vercel and Cloud SQL](docs/vercelCloudSql.md): preview deployment setup.
- [App architecture](docs/architecture.md): code organization, dependency rules, accounts, assemblies, and controls.
- [Glossary](docs/glossary.md): session and custom-track terms used in this app.
- [Session persistence](docs/sessionPersistence.md): autosave, custom tracks, and database behavior.
- [Session roadmap](docs/sessionRoadmap.md): planned workflows and open product questions.

See the [docs index](docs/README.md) for the reading order.
