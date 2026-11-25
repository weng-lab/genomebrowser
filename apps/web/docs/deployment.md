# Deployment

The web app runs as one Vercel project. Each deployment serves the UI, saved sessions, and the MCP endpoint together. There are two environments:

- **Preview** (development): one deployment per PR branch, with a URL that stays the same across pushes.
- **Production**: currently a beta on the project's `vercel.app` domain. It has its own database on the development Cloud SQL instance but still uses the development service account and Clerk instance; [Before real users](#before-real-users) lists what to replace.

Both are behind Vercel Authentication, so viewers need a Vercel team login. The current values of every setting below are in the Vercel project's environment variables (**Settings → Environment Variables**) and the Google Cloud console. Keep them out of this repository, which is public.

## Services

| Service                | Used for                             | Preview                               | Production today                                   | Production before real users                                                 |
| ---------------------- | ------------------------------------ | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Vercel                 | Hosting the app                      | One URL per PR branch                 | The project's `vercel.app` domain                  | A `wenglab.org` subdomain                                                    |
| Cloud SQL (PostgreSQL) | Saved sessions and account settings  | The development instance and database | Its own database on the development instance       | Its own login, on an instance sized and backed up for production             |
| Google service account | Letting Vercel connect to Cloud SQL  | The development service account       | Same as Preview                                    | Its own service account                                                      |
| Clerk                  | Accounts and sign-in                 | The development instance              | Same as Preview                                    | The lab's production instance, which works only on a `wenglab.org` subdomain |
| Redis                  | Live session sync and agent commands | The server set as `REDIS_URL`         | Its own `REDIS_URL`, which may be Preview's server | Same as today                                                                |

## Vercel

The project's Root Directory is `apps/web`, with files outside it included so the build reaches the workspace packages; `vercel.json` builds through Turbo. Under **Settings → Security**, OIDC federation is on in **Team** issuer mode, which is what Google trusts for Cloud SQL. Keep the maximum function duration at 300 seconds or more for the command stream.

Each environment has its own copy of the variables below. Vercel applies a change only to new deployments, so redeploy the environment after changing one. A push to a PR branch also creates a new preview.

## Cloud SQL

A deployment reaches Cloud SQL without a stored Google key. Vercel gives each deployment an OIDC token, Google's Workload Identity Federation exchanges it for a service account's credentials, and the Cloud SQL connector uses those to open an encrypted connection to the instance's public IP. The app then logs into PostgreSQL with an ordinary username and password. Google decides whether a deployment may connect; PostgreSQL decides what the login may do.

| Variable                                                                  | Value                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `INSTANCE_CONNECTION_NAME`                                                | `PROJECT_ID:REGION:INSTANCE`                                           |
| `DB_NAME`                                                                 | The database name                                                      |
| `DB_USER`, `DB_PASSWORD`                                                  | The app's PostgreSQL login. Enter the password as is, not URL-encoded. |
| `GCP_PROJECT_NUMBER`                                                      | The Google Cloud project number                                        |
| `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | The pool and provider IDs                                              |
| `GCP_SERVICE_ACCOUNT_EMAIL`                                               | The service account's email                                            |

When one is missing, session requests fail with an error naming it rather than falling back to another database.

### Set up Google access

This is already done for the development resources. Follow it for a new environment or project, replacing `PROJECT_ID`, `PROJECT_NUMBER`, `SERVICE_ACCOUNT`, and `TEAM_SLUG` (the team slug from the Vercel dashboard URL, not its display name).

Enable the Cloud SQL Admin, IAM Credentials, and Security Token Service APIs, then create the service account and allow it to connect to Cloud SQL:

```sh
gcloud services enable sqladmin.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  --project=PROJECT_ID

gcloud iam service-accounts create SERVICE_ACCOUNT \
  --display-name="Genomebrowser on Vercel" --project=PROJECT_ID

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client" --condition=None
```

Create a workload identity pool with an OIDC provider that trusts Vercel's issuer for the team. The provider must allow the audience `https://vercel.com/TEAM_SLUG`, which is the audience of the token Vercel gives every deployment. The app sends that token unchanged, so a provider left on Google's default audience rejects it:

```sh
gcloud iam workload-identity-pools create vercel \
  --location=global --display-name="Vercel" --project=PROJECT_ID

gcloud iam workload-identity-pools providers create-oidc vercel \
  --location=global --workload-identity-pool=vercel --project=PROJECT_ID \
  --issuer-uri="https://oidc.vercel.com/TEAM_SLUG" \
  --allowed-audiences="https://vercel.com/TEAM_SLUG" \
  --attribute-mapping="google.subject=assertion.sub"
```

Then allow deployments to act as the service account. A token's subject names the team, project, and environment, so each Vercel environment that connects needs its own binding. Run this once for `preview` and once for `production`:

```sh
gcloud iam service-accounts add-iam-policy-binding \
  SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/subject/owner:TEAM_SLUG:project:genomebrowser:environment:preview"
```

### Create a database

The instance needs a public IP but no authorized networks, since the connector authorizes connections through Google. Create the database and a login for the app in the Cloud SQL console, then [apply the migrations](#apply-migrations).

The app's login reads and writes the `sessions` and `account_settings` tables. If another user creates them, grant access, for example `GRANT SELECT, INSERT, UPDATE, DELETE ON sessions, account_settings TO app_user;`. Migrations need a login that may change the schema and use the `drizzle` schema, where Drizzle records applied migrations.

## Clerk

Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same instance.

- **Preview:** the development instance's `pk_test_` and `sk_test_` keys. It accepts any domain, keeps sign-in separate for each preview URL, and shows a development badge.
- **Production:** the lab's production instance's `pk_live_` keys. It accepts only `wenglab.org` and its subdomains, so on `vercel.app` every Clerk request fails with `host_invalid`. To use it, add a `wenglab.org` subdomain to the project for Production, create the DNS record Vercel shows, and open the app there.

Sessions belong to Clerk user IDs, so users of one instance never see sessions saved under the other.

## Redis

Set `REDIS_URL` to a Redis server that supports publish/subscribe and Lua scripts over TCP, such as a Redis database from the Vercel Marketplace. HTTP-only Redis APIs do not work. Use `rediss://` when the provider requires TLS.

Requests and streams for one session can run in different function instances. Redis publishes each saved revision to every instance streaming that session's events, so all its open tabs stay in sync, and passes browser-only agent commands and replies between an MCP call and the client's command stream. It holds no application data, only short-lived leases naming each session's connection. Every key starts with the deployment's namespace, so Preview and Production can share a server without one deployment's agents reaching another's clients. Without `REDIS_URL`, sessions still save and agent state tools still run, but tabs sync only within one instance and browser-only tools fail.

## Apply migrations

Builds do not run migrations. Preview and Production have separate databases, so apply reviewed migrations to both before deploying code that needs them. A migration takes effect at once for every deployment using that database, so prefer changes the deployed code tolerates, such as adding columns.

### Install the tools

Migrations connect through the Cloud SQL Auth Proxy, which uses your Google account. Install the [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install), then sign in, select the project, and install the proxy:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project PROJECT_ID
gcloud auth application-default set-quota-project PROJECT_ID
gcloud components install cloud-sql-proxy
```

The application default credentials are what the proxy uses. Setting their quota project to the same project avoids API errors caused by a mismatched quota project. Your Google account needs the Cloud SQL Client role on the project.

### Run the migrations

Start the proxy and leave it running:

```sh
cloud-sql-proxy --address=127.0.0.1 --port=55433 INSTANCE_CONNECTION_NAME
```

One running proxy serves both databases on the instance. In another terminal, from the repository root, run the migrations with a login allowed to change the schema. The prompts keep the password out of your shell history. URL-encode special characters in the password, such as `@` as `%40`, because it becomes part of a URL. Setting `DATABASE_URL` on the command overrides `.env.local`, so the migration cannot reach your local database by mistake:

```sh
read -rp 'Database: ' DBNAME; read -rp 'DB user: ' DBUSER; read -rsp 'DB password: ' DBPW; echo
DATABASE_URL="postgres://${DBUSER}:${DBPW}@127.0.0.1:55433/${DBNAME}" pnpm web db:migrate
unset DBNAME DBUSER DBPW
```

Run this once with Preview's `DB_NAME` and once with Production's.

`drizzle-kit migrate` reports only an exit code when it fails. To see the PostgreSQL error, test the same connection with `psql "postgres://…@127.0.0.1:55433/${DBNAME}" -c 'select 1'`, or check `pg_isready -h 127.0.0.1 -p 55433`, which tests the proxy without a login.

### Apply migrations in the Cloud SQL console

Cloud SQL Studio in the Google Cloud console can run a migration without local tools. Run it in each database. Run the migration's SQL file from `drizzle/`, then record it the way `db:migrate` does, or a later `db:migrate` runs it again and fails. Drizzle stores the SHA-256 hash of the file and the migration's `when` value from `drizzle/meta/_journal.json`:

```sh
sha256sum apps/web/drizzle/0002_example.sql
```

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<sha256 of the file>', <when from the journal>);
```

Run the migration and the insert in one transaction, as a user that owns the tables.

## Before real users

Set these on Production only and leave Preview on the development resources.

1. **Database.** Production already has its own database. Give it a login with only the privileges the app needs, and move it to a production instance unless this one is sized and backed up for production. Check the instance's connection limit against expected traffic: each server process holds up to five connections.
2. **Google access.** Create a production service account with `roles/cloudsql.client`, grant `roles/iam.workloadIdentityUser` on it to `owner:TEAM_SLUG:project:genomebrowser:environment:production`, and remove that subject from the development service account.
3. **Clerk.** Serve Production on a `wenglab.org` subdomain, configure sign-in methods on the production instance, and switch Production to its keys. Sessions belong to Clerk user IDs, so users on the production instance won't own beta sessions saved under the development instance.
4. **Access.** Decide whether Production stays behind Vercel Authentication or opens to the public.

## Check a deployment

Open the deployment, sign in, create a session, change the region, then reload and reopen it. Deployments are behind Vercel Authentication, so viewers need a Vercel team login. If the app shows that saved sessions are unavailable, open the deployment's runtime logs in the Vercel dashboard and find the `Session request failed` errors for `/api/sessions`.

To check remote control, open a session with remote control on and confirm the AI Assist panel shows Connected. If it keeps reconnecting, find `Remote control request failed` or `Command relay Redis error` in the runtime logs for `/api/sessions/<id>/commands`.

| Error                                                             | Cause and fix                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Clerk `host_invalid` in the browser                               | Production instance keys on a domain outside `wenglab.org`. Use development keys or a `wenglab.org` domain. |
| `… is required for Cloud SQL`                                     | A Cloud SQL variable is missing for that environment. Set it and redeploy.                                  |
| `The audience in ID Token … does not match the expected audience` | The Google provider does not allow `https://vercel.com/TEAM_SLUG`. Add it as an allowed audience.           |
| `Permission 'iam.serviceAccounts.getAccessToken' denied`          | No `roles/iam.workloadIdentityUser` binding for this environment's subject. Add the binding.                |
| `password authentication failed`                                  | `DB_USER` or `DB_PASSWORD` is wrong.                                                                        |
| `column … does not exist` or `relation … does not exist`          | The database schema is behind the code. Apply the migrations.                                               |
| `permission denied for table …`                                   | The app's login lacks grants on a table. Grant access as the table owner.                                   |
| `REDIS_URL must be set for agent commands`                        | `REDIS_URL` is missing for that environment. Set it and redeploy.                                           |

[Back to the app README](../README.md)
