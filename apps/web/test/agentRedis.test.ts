import { connect, createServer, type Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { issueCommandCredential, readCommandCredential } from "../features/agent/server/credential";
import { testRedisUrl } from "./redis";

/** A TCP proxy to `target` that counts the connections made through it. */
async function countingProxy(target: string) {
  const { hostname, port } = new URL(target);
  const sockets = new Set<Socket>();
  let connections = 0;
  const server = createServer((client) => {
    connections += 1;
    const upstream = connect(Number(port || 6379), hostname);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.on("error", () => socket.destroy());
    }
    client.pipe(upstream).pipe(client);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as { port: number };
  return {
    url: `redis://127.0.0.1:${address.port}`,
    connections: () => connections,
    /** Cut every connection, as a network failure would. */
    cut: () => {
      for (const socket of sockets) socket.destroy();
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.skipIf(!testRedisUrl)("agent access Redis", () => {
  it("reuses one connection across credential reads, and reconnects once it closes", async () => {
    const proxy = await countingProxy(testRedisUrl!);
    try {
      vi.stubEnv("REDIS_URL", proxy.url);
      vi.stubEnv("VERCEL_DEPLOYMENT_ID", `test-${crypto.randomUUID()}`);
      const { token } = await issueCommandCredential("user_alice", crypto.randomUUID());
      for (let read = 0; read < 3; read++) {
        expect(await readCommandCredential(token)).toMatchObject({ userId: "user_alice" });
      }
      expect(proxy.connections()).toBe(1);

      proxy.cut();
      await vi.waitFor(async () =>
        expect(await readCommandCredential(token)).toMatchObject({ userId: "user_alice" }),
      );
      expect(proxy.connections()).toBe(2);
    } finally {
      await proxy.close();
    }
  });
});
