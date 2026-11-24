# Production deployment

The Vercel project's Production environment currently serves as a beta, not a separate production deployment. Preview and Production each have their own database on the shared development Cloud SQL instance, so data saved from previews stays out of Production. They still share one Google service account, and both sign in through the Clerk development instance. The lab's Clerk production instance accepts requests only from `wenglab.org` domains, so Production needs a `wenglab.org` subdomain before it can switch to it.

This page lists what to replace before Production serves real users. The current values are in the Vercel project's environment variables; keep them out of this public repository. To set up or change these resources, follow [Deploy to Vercel](../../apps/web/docs/02-guides/deployment.md).

## Today

| Vercel variable                                                                                 | Current value in Preview and Production                                    | For a real production deployment                                                    |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `INSTANCE_CONNECTION_NAME`                                                                      | The shared development instance                                            | A production instance, or keep this one if it is sized and backed up for production |
| `DB_NAME`                                                                                       | The development database on Preview; the production database on Production | Already separate; keep the production database                                      |
| `DB_USER`, `DB_PASSWORD`                                                                        | Development login                                                          | A production login with only the privileges the app needs                           |
| `GCP_SERVICE_ACCOUNT_EMAIL`                                                                     | The service account used by previews                                       | A production service account                                                        |
| `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | The development Google Cloud project and its Vercel identity pool          | Can stay; change only if production moves to another Google Cloud project           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                                         | The development instance on both                                           | Production instance keys, served on a `wenglab.org` subdomain                       |

Set the replacements on the Production environment only, and leave Preview on the development resources.

## Replacement steps

1. **Database.** Production already has its own database. Give it a login with only the privileges the app needs, and move it to a production instance if this one is not sized and backed up for production. Apply reviewed migrations to both databases before deploying, as described in [Apply migrations](../../apps/web/docs/02-guides/deployment.md#apply-migrations); builds do not run migrations.
2. **Google access.** Create a production service account with `roles/cloudsql.client` on the production instance. Grant `roles/iam.workloadIdentityUser` on it to the subject `owner:<team slug>:project:genomebrowser:environment:production`. Then remove that Production subject from the preview service account, so each environment can use only its own account.
3. **Clerk.** Add a `wenglab.org` subdomain to the Vercel project for Production, configure sign-in methods on the production instance, and redeploy after changing keys. Sessions belong to Clerk user IDs, so users from the development instance won't own anything saved under the production instance.
4. **Connection limits.** Each server process holds up to five connections. Check the production instance's connection limit against expected concurrency, as noted in [limitations](limitations.md).
5. **Access.** Decide whether Production stays behind Vercel deployment protection or opens to the public.

[Back to app direction](README.md)
