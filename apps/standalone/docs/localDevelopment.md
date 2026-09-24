# Local development

Run all commands below from the repository root unless a step says otherwise. Environment variables belong in `apps/standalone/.env.local`.

For the normal account and persistence workflow, use Clerk and the shared Cloud SQL development database. Docker provides an isolated database when you need one. Public browsing works without either service.

## 1. Install dependencies

Use Node.js 22 or newer and the pnpm version declared in the root `package.json`.

```sh
pnpm install --frozen-lockfile
```

For Cloud SQL, install the Google Cloud CLI and [Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy). For the Docker option, install Docker with Compose and start the Docker daemon.

## 2. Configure the app

If `.env.local` does not exist yet, create it from the template:

```sh
cp apps/standalone/.env.example apps/standalone/.env.local
```

If it already exists, add missing variables without overwriting your current settings. Keep this file out of Git.

| Variable                            | Used for                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk sign-in UI                                                                       |
| `CLERK_SECRET_KEY`                  | Server-side account authentication                                                     |
| `SCREEN_API_KEY`                    | Gene, SNP, and cCRE search; get a key from [API Console](https://console.wenglab.org/) |
| `NEXT_PUBLIC_MUI_X_LICENSE_KEY`     | MUI X Premium track selector license                                                   |
| `DATABASE_URL`                      | PostgreSQL connection, set in the next step                                            |

Use both Clerk keys from the same application and environment as API Console to share user accounts. Without both keys, only public browsing is available and account controls are hidden. Coordinate search works without `SCREEN_API_KEY`.

For the local proxy or Docker, leave `INSTANCE_CONNECTION_NAME` empty. It overrides `DATABASE_URL` when set. The `DB_*` and `GCP_*` connector settings are for the separate [Vercel setup](vercelCloudSql.md).

Restart the development server after changing environment variables. Keep database credentials, `CLERK_SECRET_KEY`, and `SCREEN_API_KEY` server-side; do not give them a `NEXT_PUBLIC_` prefix.

## 3. Choose a database

### Shared Cloud SQL development database

Use the existing `genomebrowser-dev` database on `genesmetadata-instance`. Ask a project maintainer for a PostgreSQL login with access to that database and Google Cloud connection permission, such as the Cloud SQL Client role. Your Google identity and PostgreSQL login are separate.

Authenticate once, then start the proxy:

```sh
gcloud auth application-default login
cloud-sql-proxy \
  --address=127.0.0.1 \
  --port=55433 \
  devenv-215523:us-east1:genesmetadata-instance
```

Keep that terminal running. In `.env.local`, set:

```dotenv
DATABASE_URL=postgresql://YOUR_DATABASE_USERNAME:URL_ENCODED_PASSWORD@127.0.0.1:55433/genomebrowser-dev
```

Replace the username and password placeholders with your PostgreSQL credentials. URL-encode special characters in the password: `@` becomes `%40`, `#` becomes `%23`, and `%` becomes `%25`. Use the database name exactly as shown, with a hyphen.

This database shares sessions and schema changes with any previews connected to it. Use Docker for destructive experiments or independent migration development. The existing development database already has the initial migrations; apply subsequent reviewed migrations as described below.

### Isolated Docker database

Set these values in `.env.local`, choosing a password:

```dotenv
POSTGRES_PASSWORD=YOUR_CHOSEN_PASSWORD
DATABASE_URL=postgresql://genomebrowser:URL_ENCODED_PASSWORD@127.0.0.1:55432/genomebrowser
```

`POSTGRES_PASSWORD` is the original password. The URL contains the same password with special characters encoded. Then start PostgreSQL and create the tables:

```sh
pnpm standalone db:up
pnpm standalone db:migrate
```

Compose runs PostgreSQL 18, binds to localhost, and stores data in a named volume. The shared Cloud SQL instance currently runs PostgreSQL 17. Check version-specific SQL against Cloud SQL before deploying it.

Stop Docker PostgreSQL without deleting its data:

```sh
pnpm standalone db:down
```

Changing `POSTGRES_PASSWORD` after the volume is initialized does not change the existing database user's password. Use its current password or change the password inside PostgreSQL.

To switch between Docker and Cloud SQL, change `DATABASE_URL` and restart the app. Docker uses port `55432`; the proxy uses `55433`. Switching the URL does not copy data between databases.

### Public browsing only

Leave both Clerk keys, `DATABASE_URL`, and `INSTANCE_CONNECTION_NAME` empty. Skip database startup and migrations. You can explore `/browser`; account-backed sessions and custom tracks require Clerk and PostgreSQL. Guest browser state is not yet restored after a reload.

## 4. Build and run

On a fresh checkout, build the app and its workspace dependencies through Turbo. The standalone app imports their built output:

```sh
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-standalone
pnpm standalone dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`, and visit `/browser`. The home page is a placeholder. The repository-root `pnpm dev` starts the playground; use `pnpm standalone dev` for this app.

For account-backed development, sign in, open `/dashboard`, create a session, change the region, and reload. Reopening the session should restore it. Subsequent app edits use Next.js hot reload. Rebuild workspace dependencies through Turbo when changing their source.

## Migrations and checks

After editing `apps/standalone/db/schema.ts`, generate SQL:

```sh
pnpm standalone db:generate
```

Review the generated files under `apps/standalone/db/migrations/`, confirm which database `DATABASE_URL` selects, then apply them:

```sh
pnpm standalone db:migrate
```

Migrations need a PostgreSQL login with schema-change permissions. Never edit an already applied migration. These commands read `.env.local`; they use `DATABASE_URL`, not the Cloud SQL connector settings. For other hosted PostgreSQL providers, use their required TLS connection settings. Builds do not apply migrations.

Run focused app tests or the full workspace check:

```sh
pnpm standalone test
pnpm verify
```

Run PostgreSQL integration tests against a local or dedicated development database:

```sh
pnpm standalone test:db
```

The integration tests use `TEST_DATABASE_URL` when set, otherwise `DATABASE_URL`. They create and remove an isolated schema, so the login needs schema-creation permission. They do not modify saved sessions. `pnpm verify` runs unit tests but excludes database integration tests.

## Common setup problems

| Symptom                                 | Check                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Connection refused on `55433`           | Keep the proxy running and confirm it uses that port.                                                          |
| Proxy reports a Google permission error | Check your application-default login and Cloud SQL Client access to `devenv-215523`.                           |
| PostgreSQL error `28P01`                | Check the PostgreSQL username, password, and URL encoding. Google login does not replace database credentials. |
| PostgreSQL error `3D000`                | Use `genomebrowser-dev`, not `genomebrowser_dev`.                                                              |
| Tables are missing                      | Apply migrations to the database selected by `DATABASE_URL`.                                                   |
| Storage is unavailable                  | Set `DATABASE_URL` and restart the app.                                                                        |
| No sign-in controls                     | Configure both Clerk keys and restart the app.                                                                 |
| Package imports cannot resolve          | Run the Turbo build from step 4.                                                                               |

For deployments, continue with [Vercel and Cloud SQL](vercelCloudSql.md). Return to [standalone docs](README.md).
