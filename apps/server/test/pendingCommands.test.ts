import { expect, test } from "vitest";
import { createPendingCommands } from "../src/pendingCommands.ts";
import type { BrowserCommand } from "../src/protocol.ts";

const region = { chromosome: "chr1", start: 10, end: 100 };
const command = { type: "region.set" as const, region };

function reply(commandId: string) {
  return { commandId, result: { ok: true as const, region, clamped: false } };
}

test("registers a pending command before sending so an immediate reply resolves it", async () => {
  const pending = createPendingCommands({
    timeoutMs: 100,
    async send(message) {
      expect(pending.acknowledge(reply(message.commandId))).toBe(true);
      expect(pending.acknowledge(reply(message.commandId))).toBe(false);
    },
  });
  const response = await pending.sendAndWait(command, new AbortController().signal);
  expect(response.status).toBe(200);
});

test("cancellation completes even when the stream write is stalled", async () => {
  let sent!: BrowserCommand;
  const pending = createPendingCommands({
    timeoutMs: 100,
    send(message) {
      sent = message;
      return new Promise(() => {});
    },
  });
  const caller = new AbortController();
  const response = pending.sendAndWait(command, caller.signal);
  caller.abort();
  expect((await response).status).toBe(499);
  expect(pending.acknowledge(reply(sent.commandId))).toBe(false);
});

test("a failed stream write rejects pending and subsequent commands", async () => {
  const pending = createPendingCommands({
    timeoutMs: 100,
    async send() {
      throw new Error("Stream closed");
    },
  });
  const signal = new AbortController().signal;
  const first = pending.sendAndWait(command, signal);
  const second = pending.sendAndWait(command, signal);
  expect((await first).status).toBe(409);
  expect((await second).status).toBe(409);
  expect((await pending.sendAndWait(command, signal)).status).toBe(409);
});
