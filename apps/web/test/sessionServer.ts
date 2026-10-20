import type { SessionSnapshot } from "../features/sessions/snapshot.ts";
import { vi } from "vitest";
import {
  maxSessionBytes,
  sessionInputSchema,
  sessionUpdateSchema,
} from "../features/sessions/schema";

type Request = {
  method: string;
  id?: string;
  body?: { name: string; snapshot: SessionSnapshot; revision?: number; saveId?: string };
  bytes: number;
};
type Stored = {
  owner: string;
  name: string;
  snapshot: SessionSnapshot;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
  saveId?: string;
};
/** How a held request ends: with this response, by its normal handling, or applied with its response lost. */
type Outcome = Response | undefined | "lost";

/**
 * The `/api/sessions` contract in memory, installed as `fetch`: owner-scoped
 * list, load, create, revision-checked update with save-ID replay, and delete
 * with the same status codes, error bodies, and size limit as the route
 * handlers. Tests can hold, fail, or lose the response of the next request of a
 * method. Requests honor their abort signal, including while a body is read.
 */
export function installSessionServer() {
  const stored = new Map<string, Stored>();
  const requests: Request[] = [];
  const gates: { method: string; gate: Promise<Outcome> }[] = [];
  const server = {
    user: "user_alice" as string | null,
    requests,
    /** Saved sessions of any owner, by ID. */
    stored,
    add(name: string, snapshot: SessionSnapshot, owner?: string): string {
      const id = crypto.randomUUID();
      const now = new Date();
      stored.set(id, {
        owner: owner ?? server.user!,
        name,
        snapshot,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      });
      return id;
    },
    /** Writes and deletions sent so far, oldest first. */
    writes: (): Request[] => requests.filter(({ method }) => method !== "GET"),
    /**
     * Hold the next request of `method` until released, failed without being
     * applied, applied with its response lost to a network failure, or answered
     * with `response` instead.
     */
    hold(method: string) {
      let open!: (outcome: Outcome) => void;
      gates.push({ method, gate: new Promise((resolve) => (open = resolve)) });
      return {
        release: () => open(undefined),
        fail: (status = 503) => open(Response.json({ message: "Unavailable" }, { status })),
        lose: () => open("lost"),
        respond: (response: Response) => open(response),
      };
    },
    /** Replies to tab command results posted for remote control. */
    rpc: vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Response.json({ ok: true }),
    ),
    /** Fail the next request of `method` with `status`. */
    fail(method: string, status = 503): void {
      server.hold(method).fail(status);
    },
    /** Apply the next request of `method`, then fail it as if its response were lost. */
    lose(method: string): void {
      server.hold(method).lose();
    },
  };

  function json(body: unknown, status = 200) {
    return Response.json(body, { status });
  }
  function rejected(code: string, status: number) {
    return json({ code, message: code }, status);
  }
  function metadata(id: string, { name, createdAt, updatedAt, revision }: Stored) {
    return { id, name, createdAt, updatedAt, revision };
  }

  function handle({ method, id, body, bytes }: Request) {
    const owner = server.user;
    if (!owner) return rejected("UNAUTHENTICATED", 401);
    if (bytes > maxSessionBytes) return rejected("INVALID_INPUT", 400);
    if (!id && method === "GET") {
      return json(
        [...stored]
          .filter(([, session]) => session.owner === owner)
          .map(([id, session]) => metadata(id, session))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    if (!id && method === "POST") {
      const input = sessionInputSchema.safeParse(body);
      if (!input.success) return rejected("INVALID_INPUT", 400);
      const id = server.add(input.data.name, input.data.snapshot, owner);
      return json(metadata(id, stored.get(id)!));
    }
    const session = id ? stored.get(id) : undefined;
    if (!id || !session || session.owner !== owner) return rejected("NOT_FOUND", 404);
    if (method === "GET") return json({ ...metadata(id, session), snapshot: session.snapshot });
    if (method === "DELETE") {
      stored.delete(id);
      return new Response(null, { status: 204 });
    }
    const parsed = sessionUpdateSchema.safeParse(body);
    if (!parsed.success) return rejected("INVALID_INPUT", 400);
    const { revision, saveId, ...input } = parsed.data;
    if (session.saveId === saveId && session.revision === revision + 1)
      return json(metadata(id, session));
    if (input.snapshot.browser.assembly !== session.snapshot.browser.assembly)
      return rejected("ASSEMBLY_CHANGED", 409);
    if (session.revision !== revision) return rejected("CONFLICT", 409);
    Object.assign(session, { ...input, revision: revision + 1, saveId, updatedAt: new Date() });
    return json(metadata(id, session));
  }

  async function fetch(input: string, init: RequestInit = {}) {
    const url = new URL(input, "http://localhost");
    if (url.pathname.startsWith("/rpc/")) return server.rpc(input, init);
    if (!url.pathname.startsWith("/api/sessions")) throw new Error(`Unexpected request ${input}`);
    const request: Request = {
      method: init.method ?? "GET",
      id: url.pathname.split("/")[3],
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      bytes: init.body ? new TextEncoder().encode(String(init.body)).byteLength : 0,
    };
    requests.push(request);
    const signal = init.signal ?? undefined;
    const aborted = new Promise<never>((_, reject) => {
      if (signal?.aborted) reject(signal.reason);
      signal?.addEventListener("abort", () => reject(signal.reason));
    });
    const index = gates.findIndex((gate) => gate.method === request.method);
    const gated =
      index < 0 ? undefined : await Promise.race([gates.splice(index, 1)[0].gate, aborted]);
    if (gated !== "lost") return gated ?? handle(request);
    handle(request);
    throw new TypeError("Failed to fetch");
  }

  vi.stubGlobal("fetch", vi.fn(fetch));
  return server;
}

export type SessionServer = ReturnType<typeof installSessionServer>;
