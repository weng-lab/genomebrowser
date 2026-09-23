import "server-only";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { attachDatabasePool } from "@vercel/functions";
import { getVercelOidcToken } from "@vercel/oidc";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { IdentityPoolClient } from "google-auth-library";
import { Pool, type PoolConfig } from "pg";

const databaseGlobal = globalThis as typeof globalThis & {
  genomebrowserDatabase?: Promise<NodePgDatabase>;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Cloud SQL.`);
  return value;
}

function vercelGoogleAuth() {
  const projectNumber = requiredEnv("GCP_PROJECT_NUMBER");
  const poolId = requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccount = requiredEnv("GCP_SERVICE_ACCOUNT_EMAIL");
  const audience = `https://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
  return new IdentityPoolClient({
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    subject_token_supplier: {
      // Read the current token whenever Google credentials need refreshing.
      getSubjectToken: () => getVercelOidcToken({ audience }),
    },
  });
}

async function connectDatabase(): Promise<NodePgDatabase> {
  let connector: Connector | undefined;
  let pool: Pool | undefined;
  try {
    let config: PoolConfig;
    const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
    if (instanceConnectionName) {
      const user = requiredEnv("DB_USER");
      const password = requiredEnv("DB_PASSWORD");
      const database = requiredEnv("DB_NAME");
      connector = new Connector(
        process.env.VERCEL === "1" ? { auth: vercelGoogleAuth() } : undefined,
      );
      const options = await connector.getOptions({
        instanceConnectionName,
        ipType: IpAddressTypes.PUBLIC,
      });
      config = { ...options, user, password, database };
    } else {
      config = { connectionString: process.env.DATABASE_URL };
    }
    pool = new Pool({
      ...config,
      max: 5,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
    // Idle connections may fail independently of a query; pg requires an error listener.
    pool.on("error", () => console.error("An idle PostgreSQL connection failed."));
    if (process.env.VERCEL === "1") attachDatabasePool(pool);
    return drizzle(pool);
  } catch (error) {
    connector?.close();
    await pool?.end();
    throw error;
  }
}

export async function getDatabase(): Promise<NodePgDatabase | null> {
  if (!process.env.INSTANCE_CONNECTION_NAME && !process.env.DATABASE_URL) return null;
  // Share initialization across concurrent requests and development reloads.
  return (databaseGlobal.genomebrowserDatabase ??= connectDatabase().catch((error) => {
    delete databaseGlobal.genomebrowserDatabase;
    throw error;
  }));
}
