import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { vi } from "vitest";
import type { TrackResources } from "@weng-lab/genomebrowser";

export const clinGenFiles = Object.fromEntries(
  ["clinGenHaplo", "clinGenTriplo", "clinGenGeneDisease", "clinGenCspec"].map((name) => [
    name,
    new Uint8Array(readFileSync(new NodeURL(`./clingen/${name}.bb`, import.meta.url))),
  ]),
);

export function serveClinGen(files = clinGenFiles) {
  const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async (input, init) => {
      if (init?.signal?.aborted) throw init.signal.reason;
      const url = String(input);
      const name = /([^/]+)\.bb(?:\?.*)?$/.exec(url)?.[1];
      const bytes = name && files[name];
      if (!bytes) return new Response(null, { status: 404 });
      const range = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("Range") ?? "");
      if (!range) throw new Error("ClinGen must use an explicit byte range");
      const start = Number(range[1]);
      const end = Math.min(Number(range[2]), bytes.length - 1);
      return new Response(new Uint8Array(bytes.slice(start, end + 1)), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${bytes.length}` },
      });
    },
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

export function clinGenResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
}
