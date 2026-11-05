import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { vi } from "vitest";

export const exampleBigRmsk = new Uint8Array(
  readFileSync(new NodeURL("./bigRmskExample.bb", import.meta.url)),
);

export function serveBigRmsk(bytes = exampleBigRmsk) {
  const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
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

// A single uncompressed BED9+5 record with a chromosome tree and regional index.
// This exercises validation through the real reader instead of mocking decoded rows.
export function singleRepeatFile(columns: string[], start = 100, end = 200) {
  const payload = new TextEncoder().encode(columns.join("\t") + "\0");
  const recordSize = 12 + payload.length;
  const dataOffset = 124;
  const indexOffset = dataOffset + recordSize;
  const bytes = new Uint8Array(indexOffset + 84);
  const view = new DataView(bytes.buffer);
  const u16 = (offset: number, value: number) => view.setUint16(offset, value, true);
  const u32 = (offset: number, value: number) => view.setUint32(offset, value, true);
  const u64 = (offset: number, value: number) => view.setBigUint64(offset, BigInt(value), true);
  u32(0, 0x8789f2eb);
  u16(4, 4);
  u64(8, 64);
  u64(16, 116);
  u64(24, indexOffset);
  u16(32, 14);
  u16(34, 9);
  u32(64, 0x78ca8c91);
  u32(68, 1);
  u32(72, 8);
  u32(76, 8);
  u64(80, 1);
  bytes[96] = 1;
  u16(98, 1);
  bytes.set(new TextEncoder().encode("chr1"), 100);
  u32(108, 0);
  u32(112, 1_000_000);
  u64(116, 1);
  u32(dataOffset, 0);
  u32(dataOffset + 4, start);
  u32(dataOffset + 8, end);
  bytes.set(payload, dataOffset + 12);
  u32(indexOffset, 0x2468ace0);
  u32(indexOffset + 4, 1);
  u64(indexOffset + 8, 1);
  u32(indexOffset + 20, start);
  u32(indexOffset + 28, end);
  u64(indexOffset + 32, indexOffset);
  u32(indexOffset + 40, 1);
  bytes[indexOffset + 48] = 1;
  u16(indexOffset + 50, 1);
  u32(indexOffset + 56, start);
  u32(indexOffset + 64, end);
  u64(indexOffset + 68, dataOffset);
  u64(indexOffset + 76, recordSize);
  return bytes;
}

export const joinedRepeatColumns = [
  "L1#LINE/L1",
  "242",
  "-",
  "110",
  "170",
  "0",
  "5",
  "10,20,-5,20,30,",
  "-1,10,-1,50,-1,",
  "7",
  "RepeatMasker annotation",
];
