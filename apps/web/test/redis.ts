/** Redis server for the agent command tests. They are skipped without it, except in CI. */
export const testRedisUrl = process.env.GB_TEST_REDIS_URL;
if (process.env.CI && !testRedisUrl) throw new Error("CI must set GB_TEST_REDIS_URL");
