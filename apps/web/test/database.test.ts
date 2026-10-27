import { beforeEach, expect, it, vi } from "vitest";
import { connectDatabase } from "../composition/server/database";

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
    return { on: vi.fn() };
  },
}));
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
  VERCEL: "1",
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
  mocks.getOptions.mockReset().mockResolvedValue({ stream: "connector-stream" });
});

it("connects to DATABASE_URL without Google authentication", async () => {
  const url = "postgres://user:password@127.0.0.1:5432/genomebrowser";
  await connectDatabase({ DATABASE_URL: url });
  expect(mocks.pool).toHaveBeenCalledWith(
    expect.objectContaining({ connectionString: url, max: 5 }),
  );
  expect(mocks.connector).not.toHaveBeenCalled();
  expect(mocks.attach).not.toHaveBeenCalled();
});

it("requires a database", async () => {
  await expect(connectDatabase({})).rejects.toThrow("DATABASE_URL or INSTANCE_CONNECTION_NAME");
});

it("uses Cloud SQL on Vercel with a fresh OIDC token on each credential refresh", async () => {
  await connectDatabase({ ...cloudEnv, DATABASE_URL: "postgres://unused" });
  expect(mocks.getOptions).toHaveBeenCalledWith({
    instanceConnectionName: cloudEnv.INSTANCE_CONNECTION_NAME,
    ipType: "PUBLIC",
  });
  const config = mocks.pool.mock.calls[0][0];
  expect(config).toMatchObject({
    stream: "connector-stream",
    user: cloudEnv.DB_USER,
    password: cloudEnv.DB_PASSWORD,
    database: cloudEnv.DB_NAME,
  });
  expect(config).not.toHaveProperty("connectionString");
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
  expect(mocks.token).toHaveBeenCalledWith({ audience: auth.audience });
});

it("uses local Google credentials for Cloud SQL outside Vercel", async () => {
  const { VERCEL: _, ...env } = cloudEnv;
  await connectDatabase(env);
  expect(mocks.connector).toHaveBeenCalledWith(undefined);
  expect(mocks.auth).not.toHaveBeenCalled();
  expect(mocks.attach).not.toHaveBeenCalled();
});

it("reports Cloud SQL being unavailable without closing the failed connector", async () => {
  // The connector's close() rejects unhandled after a failed first refresh, which can end the process.
  mocks.getOptions.mockRejectedValueOnce(new Error("Google temporarily unavailable"));
  await expect(connectDatabase(cloudEnv)).rejects.toThrow("Google temporarily unavailable");
  expect(mocks.close).not.toHaveBeenCalled();
  expect(mocks.pool).not.toHaveBeenCalled();
});

it("fails on incomplete Cloud SQL configuration instead of using DATABASE_URL", async () => {
  const env = { ...cloudEnv, GCP_SERVICE_ACCOUNT_EMAIL: "", DATABASE_URL: "postgres://unused" };
  await expect(connectDatabase(env)).rejects.toThrow("GCP_SERVICE_ACCOUNT_EMAIL is required");
  expect(mocks.pool).not.toHaveBeenCalled();
});
