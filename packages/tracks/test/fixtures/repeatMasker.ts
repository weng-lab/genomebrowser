import { vi } from "vitest";
import { standardRepeatFile } from "./repeatMaskerStandard";
import { singleRepeatFile, joinedRepeatColumns } from "./bigRmsk";
export const sources = {
  standard: "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb",
  joined: "https://users.wenglab.org/niship/hg38_rmsk.bb",
};
export function serveRepeatMasker(
  standard = standardRepeatFile,
  joined = singleRepeatFile(joinedRepeatColumns),
) {
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const bytes = url === sources.standard ? standard : url === sources.joined ? joined : undefined;
    if (!bytes) throw new Error(`Unexpected source: ${url}`);
    if (init?.signal?.aborted) throw init.signal.reason;
    const match = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("Range") ?? "");
    if (!match) throw new Error("Expected an explicit byte range");
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), bytes.length - 1);
    return new Response(new Uint8Array(bytes.slice(start, end + 1)), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${bytes.length}` },
    });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
