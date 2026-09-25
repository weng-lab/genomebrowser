// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  fetchOnChange,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
});

async function mount<Schema extends z.ZodObject>(
  schema: Schema,
  config: z.input<Schema>,
  result: (config: Readonly<z.output<Schema>>) => string,
) {
  const fetch = vi.fn(async ({ track }: { track: { config: Readonly<z.output<Schema>> } }) =>
    result(track.config),
  );
  const module = defineTrackModule({
    type: "fetch-invalidation",
    configSchema: schema,
    fetch,
    render: { full: ({ data }: { data: string }) => <text data-testid="result">{data}</text> },
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: [module.create({ base: { id: "track", title: "Track" }, config })],
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    trackWidth: 1_000,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    ),
  );
  return {
    fetch,
    useTrackStore,
    update: async (config: z.input<Schema>) => {
      await act(async () => {
        expect(useTrackStore.getState().updateTrack("track", { config }).ok).toBe(true);
      });
    },
    expectResult: (text: string, requests: number) => {
      expect(container.querySelector('[data-testid="result"]')?.textContent).toBe(text);
      // Requests are the public module callback, not an internal helper.
      expect(fetch).toHaveBeenCalledTimes(requests);
    },
  };
}

describe("configuration-driven fetching", () => {
  it("refreshes marked inputs while reusing data for presentation and callback changes", async () => {
    const schema = z.object({ score: fetchOnChange(z.number()), label: z.string() });
    const test = await mount(schema, { score: 1, label: "A" }, ({ score }) => `score ${score}`);
    test.expectResult("score 1", 1);
    await test.update({ score: 1, label: "B" });
    await act(async () => {
      expect(
        test.useTrackStore.getState().updateTrack("track", {
          base: { title: "Renamed", color: "#000000", height: 100 },
          interaction: { onClick: () => undefined },
        }).ok,
      ).toBe(true);
    });
    test.expectResult("score 1", 1);
    let complete!: (data: string) => void;
    test.fetch.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          complete = resolve;
        }),
    );
    await test.update({ score: 2, label: "B" });
    expect(container.querySelector('[data-testid="result"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => complete("score 2"));
    test.expectResult("score 2", 2);
  });

  it("reuses data when the module has no marked configuration", async () => {
    const test = await mount(z.object({ label: z.string() }), { label: "A" }, () => "records");
    test.expectResult("records", 1);
    await test.update({ label: "B" });
    test.expectResult("records", 1);
  });

  it("observes nested markers, including array order, without fetching for neighboring labels", async () => {
    const source = z.object({ score: fetchOnChange(z.number()), label: z.string() });
    const schema = z.object({ source, datasets: z.array(source) });
    const a = { score: 1, label: "A" };
    const b = { score: 2, label: "B" };
    const test = await mount(
      schema,
      { source: a, datasets: [a, b] },
      ({ source, datasets }) => `${source.score}: ${datasets.map((item) => item.score).join(",")}`,
    );
    test.expectResult("1: 1,2", 1);
    await test.update({
      source: { ...a, label: "Changed" },
      datasets: [{ ...a, label: "Changed" }, b],
    });
    test.expectResult("1: 1,2", 1);
    await test.update({ source: b, datasets: [a, b] });
    test.expectResult("2: 1,2", 2);
    await test.update({ source: b, datasets: [a, { ...b, score: 3 }] });
    test.expectResult("2: 1,3", 3);
    await test.update({ source: b, datasets: [{ ...b, score: 3 }, a] });
    test.expectResult("2: 3,1", 4);
  });

  it.each([
    ["JSON content", { items: [1, "a", null] }, { items: [1, "a", null] }, false],
    ["changed JSON content", { items: [1] }, { items: [2] }, true],
    ["NaN versus null", NaN, null, true],
    ["opposite infinities", Infinity, -Infinity, true],
    ["Date identity", new Date(0), new Date(0), true],
    ["Map identity", new Map([["key", 1]]), new Map([["key", 1]]), true],
    ["function identity", () => 1, () => 1, true],
    ["symbol identity", Symbol("value"), Symbol("value"), true],
  ])("compares marked values by %s", async (_name, initial, next, changes) => {
    const schema = z.object({ value: fetchOnChange(z.custom<unknown>(() => true)) });
    let version = 0;
    const test = await mount(schema, { value: initial }, () => `result ${++version}`);
    test.expectResult("result 1", 1);
    await test.update({ value: initial });
    test.expectResult("result 1", 1);
    await test.update({ value: next });
    test.expectResult(changes ? "result 2" : "result 1", changes ? 2 : 1);
  });

  it("accepts cyclic marked values and refreshes their data without crashing subscribers", async () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const schema = z.object({ value: fetchOnChange(z.custom<unknown>(() => true)) });
    const test = await mount(schema, { value: "initial" }, ({ value }) =>
      value === cyclic ? "cyclic data" : "initial data",
    );
    test.expectResult("initial data", 1);
    await test.update({ value: cyclic });
    test.expectResult("cyclic data", 2);
  });
});
