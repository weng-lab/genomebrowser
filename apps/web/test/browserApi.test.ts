import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "../app/api/browser/[...path]/route";

const clientId = "ae2bf290-6942-4df0-baf2-5e6bd4b5c41f";
const path = ["clients", clientId, "results"];
const relayFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  relayFetch.mockReset().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", relayFetch);
  vi.stubEnv("GB_SERVER_URL", "http://127.0.0.1:3001");
  vi.stubEnv("GB_API_TOKEN", "must-not-be-forwarded");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function post(origin: string, host = "127.0.0.1:3010", forwardedHost?: string) {
  return POST(
    new Request(`http://localhost:3010/api/browser/${path.join("/")}`, {
      method: "POST",
      headers: {
        host,
        origin,
        authorization: "Bearer result-token",
        "content-type": "application/json",
        ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}),
      },
      body: JSON.stringify({ commandId: "command", result: { ok: true } }),
    }),
    { params: Promise.resolve({ path }) },
  );
}

it("forwards same-origin results using the inbound Host despite Next's internal URL", async () => {
  const response = await post("http://127.0.0.1:3010");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  const [url, options] = relayFetch.mock.calls[0];
  expect(String(url)).toBe(`http://127.0.0.1:3001/api/browser/${path.join("/")}`);
  const headers = new Headers(options!.headers);
  expect(headers.get("authorization")).toBe("Bearer result-token");
  expect(headers.get("origin")).toBe("http://127.0.0.1:3010");
  expect([...headers.values()]).not.toContain("must-not-be-forwarded");
  expect(await new Response(options!.body).json()).toEqual({
    commandId: "command",
    result: { ok: true },
  });
});

it.each([
  ["http://hostile.example", "127.0.0.1:3010", undefined],
  ["https://127.0.0.1:3010", "127.0.0.1:3010", undefined],
  ["http://127.0.0.1:3011", "127.0.0.1:3010", undefined],
  ["http://hostile.example", "127.0.0.1:3010", "hostile.example"],
  ["http://127.0.0.1:3010/path", "127.0.0.1:3010", undefined],
  ["null", "127.0.0.1:3010", undefined],
  ["", "", undefined],
  ["", "127.0.0.1:3010", undefined],
  ["http://hostile.example", "127.0.0.1:3010@hostile.example", undefined],
])("rejects origin %s with Host %s before forwarding", async (origin, host, forwardedHost) => {
  const response = await post(origin, host, forwardedHost);
  expect(response.status).toBe(403);
  expect(relayFetch).not.toHaveBeenCalled();
});
