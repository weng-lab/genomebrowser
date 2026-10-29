# Deploy to Vercel

This guide sets up the web app on Vercel with sessions stored in Google Cloud SQL and accounts in Clerk, and explains how to apply database migrations. It covers the Google Cloud, Vercel, and Clerk configuration, the local tools for maintenance, and the errors each misconfiguration produces. The optional MCP server is not part of this deployment; see [Build and host](../../README.md#build-and-host).

## How the pieces connect

A Vercel function reaches Cloud SQL without a stored Google key. Vercel issues each deployment an OIDC token for the team. Google's Workload Identity Federation exchanges that token for credentials of a Google service account, and Google's Cloud SQL connector uses those credentials to open an encrypted connection to the instance's public IP. The app then logs into PostgreSQL with an ordinary database username and password. Google decides whether the deployment may connect; PostgreSQL decides what the login may do.

Clerk is independent of that chain. The browser loads Clerk from the instance named by the publishable key, and the server verifies sessions with the secret key from the same instance.

Preview and Production currently share one Cloud SQL database and one service account, while each environment can use its own Clerk instance. [Production deployment](../../../../docs/product/production.md) lists what to replace before launch.

The commands below use placeholders such as `PROJECT_ID` and `INSTANCE_CONNECTION_NAME`. The values for the current deployment are in the Vercel project's environment variables, which team members can read under **Settings → Environment Variables**, and in the Google Cloud console. Keep them out of this repository, which is public.

## Set up Google Cloud

These steps create the Google side of the connection. They are already done for the beta; follow them for a new environment or project. Replace `PROJECT_ID`, `PROJECT_NUMBER`, `SERVICE_ACCOUNT`, and `TEAM_SLUG`, using the team slug from the Vercel dashboard URL rather than the team's display name.

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

Finally, allow deployments to act as the service account. A token's subject names the team, project, and environment, so each Vercel environment that connects needs its own binding. Run this once for `preview` and once for `production`:

```sh
gcloud iam service-accounts add-iam-policy-binding \
  SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/subject/owner:TEAM_SLUG:project:genomebrowser:environment:preview"
```

## Create the database

The Cloud SQL instance needs a public IP. The connector authorizes connections through Google, so the instance needs no authorized networks. Create the database and a PostgreSQL login for the app in the Cloud SQL console, then [apply the migrations](#apply-migrations) to create the tables.

The login the app uses needs to read and write the session tables. If a different user creates the tables, grant the app's login access, for example with `GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_user;`. Migrations also need a login allowed to change the schema and to use the `drizzle` schema, where Drizzle records applied migrations.

## Configure Vercel

In the project settings, set the Root Directory to `apps/web` and include files outside it, so the build can reach workspace packages. Under **Settings → Security**, enable OIDC federation in **Team** issuer mode, which is the issuer the Google provider trusts.

Set these environment variables for each environment that should save sessions. The database password and Clerk secret key are secrets; the rest are configuration.

| Variable                                                                  | Value                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `INSTANCE_CONNECTION_NAME`                                                | `PROJECT_ID:REGION:INSTANCE`                                           |
| `DB_NAME`                                                                 | The database name                                                      |
| `DB_USER`, `DB_PASSWORD`                                                  | The app's PostgreSQL login. Enter the password as is, not URL-encoded. |
| `GCP_PROJECT_NUMBER`                                                      | The Google Cloud project number                                        |
| `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | The pool and provider IDs                                              |
| `GCP_SERVICE_ACCOUNT_EMAIL`                                               | The service account's email                                            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                   | Keys from one Clerk instance; see [Configure Clerk](#configure-clerk)  |

Vercel applies variable changes only to new deployments. After changing a variable, redeploy the affected environment; pushing a commit to a PR branch also creates a new preview. When Cloud SQL settings are incomplete, session requests fail with an error naming the missing variable rather than falling back to another database.

## Configure Clerk

A Clerk development instance accepts requests from any domain, so its `pk_test_` and `sk_test_` keys work on preview URLs and the project's `vercel.app` production domain. Its users are separate from the production instance's users, and Clerk shows a development badge.

A Clerk production instance accepts requests only from its own domain and that domain's subdomains. The lab's production instance belongs to `wenglab.org`, so its `pk_live_` keys work only for the app on `wenglab.org` or a subdomain such as `genomebrowser.wenglab.org`. On a `vercel.app` domain, every Clerk request fails with `host_invalid`. To use the production instance, add a `wenglab.org` subdomain to the Vercel project for Production, create the DNS record Vercel shows, and open the app on that domain.

Always set the publishable and secret keys from the same instance. Sessions belong to Clerk user IDs, so changing instances changes which sessions a person sees.

## Apply migrations

Builds do not run migrations. Apply reviewed migrations before deploying code that needs them. Preview and Production share one database, so a migration takes effect for both immediately; prefer changes that the currently deployed code tolerates, such as adding columns.

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

In another terminal, from the repository root, run the migrations with a login allowed to change the schema. The prompts keep the password out of your shell history. URL-encode special characters in the password, such as `@` as `%40`, because it becomes part of a URL. Setting `DATABASE_URL` on the command overrides `.env.local`, so the migration cannot reach your local database by mistake:

```sh
read -rp 'Database: ' DBNAME; read -rp 'DB user: ' DBUSER; read -rsp 'DB password: ' DBPW; echo
DATABASE_URL="postgres://${DBUSER}:${DBPW}@127.0.0.1:55433/${DBNAME}" pnpm web db:migrate
unset DBNAME DBUSER DBPW
```

`drizzle-kit migrate` reports only an exit code when it fails. To see the PostgreSQL error, test the same connection with `psql "postgres://…@127.0.0.1:55433/${DBNAME}" -c 'select 1'`, or check `pg_isready -h 127.0.0.1 -p 55433`, which tests the proxy without a login.

### Apply migrations in the Cloud SQL console

Cloud SQL Studio in the Google Cloud console can run a migration without local tools. Run the migration's SQL file from `drizzle/`, then record it the way `db:migrate` does, or a later `db:migrate` runs it again and fails. Drizzle stores the SHA-256 hash of the file and the migration's `when` value from `drizzle/meta/_journal.json`:

```sh
sha256sum apps/web/drizzle/0002_example.sql
```

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<sha256 of the file>', <when from the journal>);
```

Run the migration and the insert in one transaction, as a user that owns the tables.

## Check a deployment

Open the deployment, sign in, create a session, change the region, then reload and reopen it. Deployments are behind Vercel Authentication, so viewers need a Vercel team login. If the app shows that saved sessions are unavailable, open the deployment's runtime logs in the Vercel dashboard and find the `Session request failed` errors for `/api/sessions`.

| Error                                                             | Cause and fix                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Clerk `host_invalid` in the browser                               | Production instance keys on a domain outside `wenglab.org`. Use development keys or a `wenglab.org` domain. |
| `… is required for Cloud SQL`                                     | A Cloud SQL variable is missing for that environment. Set it and redeploy.                                  |
| `The audience in ID Token … does not match the expected audience` | The Google provider does not allow `https://vercel.com/TEAM_SLUG`. Add it as an allowed audience.           |
| `Permission 'iam.serviceAccounts.getAccessToken' denied`          | No `roles/iam.workloadIdentityUser` binding for this environment's subject. Add the binding.                |
| `password authentication failed`                                  | `DB_USER` or `DB_PASSWORD` is wrong.                                                                        |
| `column … does not exist` or `relation … does not exist`          | The database schema is behind the code. Apply the migrations.                                               |
| `permission denied for table …`                                   | The app's login lacks grants on a table. Grant access as the table owner.                                   |

[Back to the docs home](../README.md)
