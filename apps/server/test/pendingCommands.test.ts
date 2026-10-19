import { expect, test } from "vitest";
import { createPendingCommands } from "../src/pendingCommands.ts";
import type { CommandMessage } from "../../web/commands/contracts.ts";

const region = { chromosome: "chr1", start: 10, end: 100 };
const command = { name: "set_region" as const, params: { region } };

function reply(commandId: string) {
  return {
    commandId,
    result: { ok: false as const, code: "REPLIED", error: "Reply from the tab" },
  };
}

test("registers a pending command before sending so an immediate reply resolves it", async () => {
  const pending = createPendingCommands({
    timeoutMs: 100,
    async send(message) {
      expect(pending.acknowledge(reply(message.commandId))).toBe(true);
      expect(pending.acknowledge(reply(message.commandId))).toBe(false);
    },
  });
  const response = pending.sendAndWait(command, new AbortController().signal);
  expect(await response).toMatchObject({ code: "REPLIED" });
});

test("cancellation completes even when the stream write is stalled", async () => {
  let sent!: CommandMessage;
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
  expect(await response).toMatchObject({ ok: false, code: "CANCELLED" });
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
  expect(await first).toMatchObject({ ok: false, code: "NOT_CONNECTED" });
  expect(await second).toMatchObject({ ok: false, code: "NOT_CONNECTED" });
  expect(await pending.sendAndWait(command, signal)).toMatchObject({
    ok: false,
    code: "NOT_CONNECTED",
  });
});
