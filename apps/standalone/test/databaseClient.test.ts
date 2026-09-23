import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getDatabase } from "../db/client";

const mocks = vi.hoisted(() => ({
  pool: vi.fn(),
  connector: vi.fn(),
  getOptions: vi.fn(),
  close: vi.fn(),
  auth: vi.fn(),
  token: vi.fn(),
  attach: vi.fn(),
}));
vi.mock("pg", () => ({
  Pool: function (config: unknown) {
    mocks.pool(config);
    return { on: vi.fn(), end: vi.fn() };
  },
}));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: (pool: unknown) => ({ pool }) }));
vi.mock("@google-cloud/cloud-sql-connector", () => ({
  IpAddressTypes: { PUBLIC: "PUBLIC" },
  Connector: function (config: unknown) {
    mocks.connector(config);
    return { getOptions: mocks.getOptions, close: mocks.close };
  },
}));
vi.mock("google-auth-library", () => ({
  IdentityPoolClient: function (config: unknown) {
    mocks.auth(config);
  },
}));
vi.mock("@vercel/oidc", () => ({ getVercelOidcToken: mocks.token }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: mocks.attach }));

const cloudEnv = {
  INSTANCE_CONNECTION_NAME: "project:region:instance",
  DB_NAME: "genomebrowser-dev",
  DB_USER: "preview-user",
  DB_PASSWORD: "literal@password",
  GCP_PROJECT_NUMBER: "123456789",
  GCP_SERVICE_ACCOUNT_EMAIL: "preview@project.iam.gserviceaccount.com",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "preview",
};

beforeEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, "genomebrowserDatabase");
  for (const name of [...Object.keys(cloudEnv), "DATABASE_URL", "VERCEL"])
    vi.stubEnv(name, undefined);
  mocks.getOptions.mockReset().mockResolvedValue({ stream: "connector-stream" });
});
afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(globalThis, "genomebrowserDatabase");
});

function configureCloud() {
  for (const [name, value] of Object.entries(cloudEnv)) vi.stubEnv(name, value);
  vi.stubEnv("VERCEL", "1");
}

it("keeps storage optional and initializes the local URL without Google authentication", async () => {
  expect(await getDatabase()).toBeNull();
  expect(mocks.pool).not.toHaveBeenCalled();
  vi.stubEnv("DATABASE_URL", "postgresql://user:password@127.0.0.1:55433/genomebrowser-dev");
  const [first, second] = await Promise.all([getDatabase(), getDatabase()]);
  expect(first).toBe(second);
  expect(mocks.pool).toHaveBeenCalledTimes(1);
  expect(mocks.pool).toHaveBeenCalledWith(
    expect.objectContaining({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    }),
  );
  expect(mocks.connector).not.toHaveBeenCalled();
  expect(mocks.auth).not.toHaveBeenCalled();
});

it("uses Cloud SQL on Vercel and requests a fresh OIDC token when credentials refresh", async () => {
  configureCloud();
  vi.stubEnv("DATABASE_URL", "postgresql://unused-local-url");
  const [first, second] = await Promise.all([getDatabase(), getDatabase()]);
  expect(first).toBe(second);
  expect(mocks.getOptions).toHaveBeenCalledTimes(1);
  expect(mocks.getOptions).toHaveBeenCalledWith({
    instanceConnectionName: cloudEnv.INSTANCE_CONNECTION_NAME,
    ipType: "PUBLIC",
  });
  expect(mocks.pool).toHaveBeenCalledWith(
    expect.objectContaining({
      stream: "connector-stream",
      user: cloudEnv.DB_USER,
      password: cloudEnv.DB_PASSWORD,
      database: cloudEnv.DB_NAME,
    }),
  );
  expect(mocks.pool.mock.calls[0][0]).not.toHaveProperty("connectionString");
  expect(mocks.attach).toHaveBeenCalledTimes(1);
  const auth = mocks.auth.mock.calls[0][0];
  expect(auth.audience).toBe(
    "https://iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel/providers/preview",
  );
  expect(auth.service_account_impersonation_url).toBe(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${cloudEnv.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  );
  mocks.token.mockResolvedValueOnce("first-token").mockResolvedValueOnce("refreshed-token");
  await expect(auth.subject_token_supplier.getSubjectToken()).resolves.toBe("first-token");
  await expect(auth.subject_token_supplier.getSubjectToken()).resolves.toBe("refreshed-token");
  expect(mocks.token).toHaveBeenCalledTimes(2);
  expect(mocks.token).toHaveBeenCalledWith({ audience: auth.audience });
});

it("cleans up failed initialization and retries on a later request", async () => {
  configureCloud();
  mocks.getOptions.mockRejectedValueOnce(new Error("Google temporarily unavailable"));
  await expect(getDatabase()).rejects.toThrow("Google temporarily unavailable");
  expect(mocks.close).toHaveBeenCalledTimes(1);
  expect(mocks.pool).not.toHaveBeenCalled();
  await expect(getDatabase()).resolves.not.toBeNull();
  expect(mocks.getOptions).toHaveBeenCalledTimes(2);
});

it("fails on incomplete Vercel configuration without falling back to a different database", async () => {
  configureCloud();
  vi.stubEnv("GCP_SERVICE_ACCOUNT_EMAIL", undefined);
  vi.stubEnv("DATABASE_URL", "postgresql://unused-local-url");
  await expect(getDatabase()).rejects.toThrow("GCP_SERVICE_ACCOUNT_EMAIL is required");
  expect(mocks.pool).not.toHaveBeenCalled();
});
