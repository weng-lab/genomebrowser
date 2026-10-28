# Production deployment

The Vercel project's Production environment currently serves as a beta, not a separate production deployment. Preview and Production share the same development resources: one Cloud SQL instance, the `genomebrowser-dev` database, one Google service account, and the Clerk development instance. Data saved from previews and from Production lands in the same tables.

This page lists what to replace before Production serves real users. For how the app connects to Cloud SQL from Vercel, see the [web app guide](../../apps/web/README.md#database).

## Shared today

| Vercel variable                                                                                 | Current value in Preview and Production                                 | For a real production deployment                                                    |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `INSTANCE_CONNECTION_NAME`                                                                      | `devenv-215523:us-east1:genesmetadata-instance`                         | A production instance, or keep this one if it is sized and backed up for production |
| `DB_NAME`                                                                                       | `genomebrowser-dev`                                                     | A separate production database                                                      |
| `DB_USER`, `DB_PASSWORD`                                                                        | Development login                                                       | A production login with only the privileges the app needs                           |
| `GCP_SERVICE_ACCOUNT_EMAIL`                                                                     | `genomebrowser-preview@devenv-215523.iam.gserviceaccount.com`           | A production service account                                                        |
| `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `devenv-215523` project, `vercel` pool, `vercel` provider | Can stay; change only if production moves to another Google Cloud project           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                                         | Clerk development instance                                              | Clerk production instance keys                                                      |

Set the replacements on the Production environment only, and leave Preview on the development resources.

## Replacement steps

1. **Database.** Create the production database, plus a login for the app. Apply the reviewed migrations to it before deploying, using the Cloud SQL Auth Proxy and an explicit `DATABASE_URL`, as for development. Builds do not run migrations. Decide whether existing beta sessions should be copied over; nothing migrates them automatically.
2. **Google access.** Create a production service account with `roles/cloudsql.client` on the production instance. Grant `roles/iam.workloadIdentityUser` on it to the subject `owner:<team slug>:project:genomebrowser:environment:production`. Then remove that Production subject from the preview service account, so each environment can use only its own account.
3. **Clerk.** Create or select the Clerk production instance, configure the production domain and sign-in methods, and set its keys on Production. The publishable key is embedded at build time, so redeploy after changing it. Sessions belong to Clerk user IDs, so users from the development instance won't own anything in the production database.
4. **Connection limits.** Each server process holds up to five connections. Check the production instance's connection limit against expected concurrency, as noted in [limitations](limitations.md).
5. **Access.** Decide whether Production stays behind Vercel deployment protection or opens to the public.

[Back to app direction](README.md)
