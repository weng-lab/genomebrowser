import "server-only";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { attachDatabasePool } from "@vercel/functions";
import { getVercelOidcToken } from "@vercel/oidc";
import { IdentityPoolClient } from "google-auth-library";
import { Pool, type PoolConfig } from "pg";

type Env = Record<string, string | undefined>;

function required(env: Env, name: string) {
  const value = env[name];
  if (!value) throw new Error(`${name} is required for Cloud SQL`);
  return value;
}

/**
 * Google credentials for the service account that Vercel deployments may
 * impersonate through Workload Identity Federation. No Google key is stored.
 */
function vercelGoogleAuth(env: Env) {
  const projectNumber = required(env, "GCP_PROJECT_NUMBER");
  const poolId = required(env, "GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = required(env, "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccount = required(env, "GCP_SERVICE_ACCOUNT_EMAIL");
  return new IdentityPoolClient({
    // Google's token exchange names the provider by its resource name.
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    // The provider allows the audience of Vercel's own token, `https://vercel.com/<team slug>`.
    // Vercel rotates the token, so read it again whenever Google credentials refresh.
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
}

/**
 * A PostgreSQL pool for this server process. `INSTANCE_CONNECTION_NAME` selects
 * Cloud SQL through Google's connector, authenticated with Vercel OIDC on
 * Vercel and local Google credentials elsewhere. Otherwise `DATABASE_URL`
 * names the server. Incomplete Cloud SQL configuration fails rather than
 * falling back to another database.
 */
export async function connectDatabase(env: Env): Promise<Pool> {
  const onVercel = env.VERCEL === "1";
  const instanceConnectionName = env.INSTANCE_CONNECTION_NAME;
  let config: PoolConfig;
  if (instanceConnectionName) {
    const login = {
      user: required(env, "DB_USER"),
      password: required(env, "DB_PASSWORD"),
      database: required(env, "DB_NAME"),
    };
    const connector = new Connector(onVercel ? { auth: vercelGoogleAuth(env) } : undefined);
    // A failed first refresh schedules nothing, so the connector needs no cleanup.
    // Its close() would also leave an unhandled rejection for the failed instance.
    const options = await connector.getOptions({
      instanceConnectionName,
      ipType: IpAddressTypes.PUBLIC,
    });
    config = { ...options, ...login };
  } else {
    const url = env.DATABASE_URL;
    if (!url)
      throw new Error("DATABASE_URL or INSTANCE_CONNECTION_NAME is required for saved sessions");
    config = { connectionString: url };
  }

  // Each serverless instance holds its own pool, so keep it small and release idle connections quickly.
  const pool = new Pool({
    ...config,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  // The pool discards idle connections that the database closes. Unhandled, the error would end the process.
  pool.on("error", (error) => console.error("Idle PostgreSQL connection failed", error));
  // Vercel then closes idle connections before suspending the function.
  if (onVercel) attachDatabasePool(pool);
  return pool;
}
