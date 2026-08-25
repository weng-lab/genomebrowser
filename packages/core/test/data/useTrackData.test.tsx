// @vitest-environment jsdom

import { act, useMemo } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createDataStore } from "../../src/browser/data/dataStore";
import { useTrackData } from "../../src/browser/data/useTrackData";
import { createTrackResourceStore } from "../../src/browser/data/trackResourceStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import type { GenomicRegion } from "../../src/genome/region";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { fetchOnChange } from "../../src/modules/fetchOnChange";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
const testAssembly = { id: "test", chromosomes: { chr1: 1_000 } };

type HarnessProps = Omit<
  Parameters<typeof useTrackData>[0],
  "assembly" | "width" | "resourceStore"
> &
  Partial<
    Pick<
      Parameters<typeof useTrackData>[0],
      "assembly" | "width" | "widthDebounceMs" | "resourceStore"
    >
  >;

function Harness({
  assembly = testAssembly,
  width = 100,
  widthDebounceMs = 0,
  resourceStore,
  ...props
}: HarnessProps) {
  const defaultResourceStore = useMemo(() => createTrackResourceStore(), []);
  const { dataStates, isFetching } = useTrackData({
    ...props,
    resourceStore: resourceStore ?? defaultResourceStore,
    assembly,
    width,
    widthDebounceMs,
  });
  return <output data-fetching={isFetching}>{JSON.stringify(dataStates)}</output>;
}

function getRenderedState() {
  const output = container?.querySelector("output");
  if (!output) throw new Error("Expected the hook harness to render");
  return {
    dataStates: JSON.parse(output.textContent || "{}") as Record<string, unknown>,
    isFetching: output.dataset.fetching === "true",
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("useTrackData", () => {
  it("ignores presentation fields and refetches only a changed module signature", async () => {
    const changedRequest = createDeferred<unknown>();
    const retryRequest = createDeferred<unknown>();
    const fetch = vi.fn(({ track }: { track: { config: { url: string; label: string } } }) => {
      const { config } = track;
      if (config.url === "changed") return changedRequest.promise;
      if (config.url === "retry") return retryRequest.promise;
      return Promise.resolve([{ url: config.url }]);
    });
    const module = defineTrackModule({
      type: "signature-test",
      configSchema: z.object({
        url: fetchOnChange(z.string().min(1)),
        label: z.string(),
      }),
      fetch,
      render: { full: () => null },
    });
    const track = module.create({
      id: "signal",
      title: "Signal",
      color: "#000000",
      config: { url: "initial", label: "Initial" },
    });
    const otherTrack = module.create({
      id: "genes",
      title: "Genes",
      config: { url: "genes", label: "Genes" },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks: [track, otherTrack] });
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const onSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          onSettled={onSettled}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledOnce();

    await act(async () => {
      expect(
        useTrackStore.getState().updateTrack("signal", { base: { color: "#123456" } }),
      ).toEqual({ ok: true });
    });
    expect(useTrackStore.getState().getTrack("signal")?.base.color).toBe("#123456");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledOnce();
    expect(getRenderedState().isFetching).toBe(false);

    await act(async () => {
      expect(
        useTrackStore.getState().updateTrack("signal", { config: { label: "Updated" } }),
      ).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledOnce();

    await act(async () => {
      expect(
        useTrackStore.getState().updateTrack("signal", { config: { url: "changed" } }),
      ).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.at(-1)?.[0].track.config.url).toBe("changed");
    expect(getRenderedState()).toEqual({
      dataStates: {
        signal: { status: "loading" },
        genes: { status: "success", data: [{ url: "genes" }] },
      },
      isFetching: true,
    });

    await act(async () => changedRequest.resolve([{ url: "changed" }]));

    await act(async () => {
      useDataStore.getState().setTrackData("signal", { status: "error", error: "failed" });
      expect(useTrackStore.getState().updateTrack("signal", { config: { url: "retry" } })).toEqual({
        ok: true,
      });
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls.at(-1)?.[0].track.config.url).toBe("retry");
    expect(getRenderedState()).toEqual({
      dataStates: {
        signal: { status: "loading" },
        genes: { status: "success", data: [{ url: "genes" }] },
      },
      isFetching: true,
    });

    await act(async () => retryRequest.resolve([{ url: "retry" }]));
  });

  it("refetches when display, width, or assembly changes", async () => {
    const widthRequest = createDeferred<unknown>();
    const fetch = vi.fn(({ track, demand }) =>
      demand.width === 200 ? widthRequest.promise : Promise.resolve({ track, demand }),
    );
    const module = defineTrackModule({
      type: "demand-test",
      configSchema: z.object({ label: z.string() }),
      fetch,
      render: { full: () => null, dense: () => null },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({
      modules: [module],
      tracks: [module.create({ id: "signal", title: "Signal", config: { label: "Signal" } })],
    });
    const region = { chromosome: "chr1", start: 0, end: 10 };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness useDataStore={useDataStore} useTrackStore={useTrackStore} region={region} />,
      ),
    );

    expect(fetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        track: {
          id: "signal",
          type: "demand-test",
          display: "full",
          config: { label: "Signal" },
        },
        demand: { assembly: testAssembly, region, width: 100 },
      }),
    );

    await act(async () => {
      expect(
        useTrackStore.getState().updateTrack("signal", { base: { display: "dense" } }),
      ).toEqual({
        ok: true,
      });
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.at(-1)?.[0].track.display).toBe("dense");

    await act(async () => {
      expect(
        useTrackStore.getState().updateTrack("signal", { config: { label: "Updated" } }),
      ).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          width={200}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.at(-1)?.[0].demand.width).toBe(200);
    expect(fetch.mock.calls.at(-1)?.[0].track.config.label).toBe("Updated");
    expect(getRenderedState()).toEqual({
      dataStates: { signal: { status: "loading" } },
      isFetching: true,
    });

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          width={100}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls.at(-1)?.[0].demand.width).toBe(100);

    await act(async () => widthRequest.resolve({ width: 200 }));

    const otherAssembly = { id: "other", chromosomes: { chr1: 2_000 } };
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          assembly={otherAssembly}
          region={region}
          width={200}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch.mock.calls.at(-1)?.[0].demand.assembly).toBe(otherAssembly);
  });

  it("delays width-only refetches until resizing settles", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn(async ({ demand }: { demand: { width: number } }) => demand.width);
      const module = defineTrackModule({
        type: "resize-debounce-test",
        configSchema: z.object({ label: z.string() }),
        fetch,
        render: { full: () => null },
      });
      const useDataStore = createDataStore();
      const useTrackStore = createTrackStore({
        modules: [module],
        tracks: [module.create({ id: "signal", title: "Signal", config: { label: "Signal" } })],
      });
      const region = { chromosome: "chr1", start: 0, end: 10 };

      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      const render = (width: number) =>
        root?.render(
          <Harness
            useDataStore={useDataStore}
            useTrackStore={useTrackStore}
            region={region}
            width={width}
            widthDebounceMs={200}
          />,
        );

      await act(async () => render(100));
      expect(fetch).toHaveBeenCalledTimes(1);

      await act(async () => render(150));
      expect(fetch).toHaveBeenCalledTimes(1);

      await act(async () => render(175));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });
      expect(fetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls.at(-1)?.[0].demand.width).toBe(175);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fetches changed regions and new members, then prunes removed results", async () => {
    const fetch = vi.fn(
      async ({ track }: { track: { config: { url: string } } }) => track.config.url,
    );
    const module = defineTrackModule({
      type: "membership-test",
      configSchema: z.object({ url: fetchOnChange(z.string().min(1)) }),
      fetch,
      render: { full: () => null },
    });
    const createTrack = (id: string) => module.create({ id, title: id, config: { url: id } });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({
      modules: [module],
      tracks: [createTrack("signal"), createTrack("genes")],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 10, end: 20 }}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(4);

    await act(async () => {
      expect(useTrackStore.getState().addTrack(createTrack("variants"))).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(useDataStore.getState().data).toHaveProperty("variants");

    await act(async () => {
      expect(useTrackStore.getState().removeTrack("genes")).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(useDataStore.getState().data).not.toHaveProperty("genes");
  });

  it("keeps fetcher resources across refetches and releases them when the track is removed", async () => {
    const fetch = vi.fn(
      async ({
        resources,
      }: {
        resources: { get<T>(key: string): T | undefined; set(key: string, value: unknown): void };
      }) => {
        const count = resources.get<number>("count") ?? 0;
        resources.set("count", count + 1);
        return count + 1;
      },
    );
    const module = defineTrackModule({
      type: "resource-lifecycle-test",
      configSchema: z.object({}),
      fetch,
      render: { full: () => null },
    });
    const createTrack = () => module.create({ id: "signal", title: "Signal", config: {} });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks: [createTrack()] });
    const region = { chromosome: "chr1", start: 0, end: 10 };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const renderHarness = (nextRegion: GenomicRegion) =>
      root?.render(
        <Harness useDataStore={useDataStore} useTrackStore={useTrackStore} region={nextRegion} />,
      );

    await act(async () => renderHarness(region));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useDataStore.getState().data.signal).toEqual({ status: "success", data: 1 });

    await act(async () => renderHarness({ ...region, start: 10, end: 20 }));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(useDataStore.getState().data.signal).toEqual({ status: "success", data: 2 });

    await act(async () => {
      expect(useTrackStore.getState().removeTrack("signal")).toEqual({ ok: true });
    });
    expect(useDataStore.getState().data).toEqual({});

    await act(async () => {
      expect(useTrackStore.getState().addTrack(createTrack())).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(useDataStore.getState().data.signal).toEqual({ status: "success", data: 1 });
  });

  it("releases stored resources when the hook unmounts", async () => {
    const fetch = vi.fn(
      async ({ resources }: { resources: { set(key: string, value: unknown): void } }) => {
        resources.set("marker", "stored");
        return null;
      },
    );
    const module = defineTrackModule({
      type: "resource-unmount-test",
      configSchema: z.object({}),
      fetch,
      render: { full: () => null },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({
      modules: [module],
      tracks: [module.create({ id: "signal", title: "Signal", config: {} })],
    });
    const resourceStore = createTrackResourceStore();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          resourceStore={resourceStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      resourceStore.resourcesFor({ type: "resource-unmount-test", id: "signal" }).get("marker"),
    ).toBe("stored");

    await act(async () => root?.unmount());
    root = undefined;
    expect(
      resourceStore.resourcesFor({ type: "resource-unmount-test", id: "signal" }).get("marker"),
    ).toBeUndefined();
  });

  it("refetches a same-ID replacement when its module type changes", async () => {
    const firstFetch = vi.fn(async () => "first-data");
    const secondFetch = vi.fn(async () => "second-data");
    const firstModule = defineTrackModule({
      type: "first-type",
      configSchema: z.object({}),
      fetch: firstFetch,
      render: { full: () => null },
    });
    const secondModule = defineTrackModule({
      type: "second-type",
      configSchema: z.object({}),
      fetch: secondFetch,
      render: { full: () => null },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({
      modules: [firstModule, secondModule],
      tracks: [firstModule.create({ id: "signal", title: "Signal", config: {} })],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
        />,
      ),
    );
    expect(firstFetch).toHaveBeenCalledOnce();
    expect(secondFetch).not.toHaveBeenCalled();

    await act(async () => {
      expect(
        useTrackStore
          .getState()
          .setTracks([secondModule.create({ id: "signal", title: "Signal", config: {} })]),
      ).toEqual({ ok: true });
    });

    expect(firstFetch).toHaveBeenCalledOnce();
    expect(secondFetch).toHaveBeenCalledOnce();
    expect(useDataStore.getState().data.signal).toEqual({
      status: "success",
      data: "second-data",
    });
  });

  it("distinguishes mixed Date and bigint values in a module fetch signature", async () => {
    const fetch = vi.fn(
      async ({ track }: { track: { config: { revision: bigint; timestamp: Date } } }) =>
        track.config.revision.toString(),
    );
    const module = defineTrackModule({
      type: "bigint-signature",
      configSchema: z.object({
        revision: fetchOnChange(z.bigint()),
        timestamp: fetchOnChange(z.date()),
      }),
      fetch,
      render: { full: () => null },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({
      modules: [module],
      tracks: [
        module.create({
          id: "signal",
          title: "Signal",
          config: { revision: 1n, timestamp: new Date("2026-01-01T00:00:00Z") },
        }),
      ],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => {
      expect(useTrackStore.getState().updateTrack("signal", { config: { revision: 2n } })).toEqual({
        ok: true,
      });
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(useDataStore.getState().data.signal).toEqual({ status: "success", data: "2" });
  });

  it("clears fetching and data when the final pending track is removed", async () => {
    const request = createDeferred<unknown>();
    const fetch = vi.fn(() => request.promise);
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch,
      render: { full: () => null },
    });
    const track = module.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks: [track] });
    const onSettled = vi.fn();
    useDataStore.getState().setTrackData("signal", {
      status: "success",
      data: [{ id: "retained-result" }],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          onSettled={onSettled}
        />,
      ),
    );
    expect(getRenderedState()).toEqual({
      dataStates: {
        signal: { status: "success", data: [{ id: "retained-result" }] },
      },
      isFetching: true,
    });

    await act(async () => {
      expect(useTrackStore.getState().removeTrack("signal")).toEqual({ ok: true });
    });
    expect(getRenderedState()).toEqual({ dataStates: {}, isFetching: false });
    expect(useDataStore.getState().data).toEqual({});
    expect(onSettled).toHaveBeenCalledOnce();

    await act(async () => request.resolve([{ id: "stale-result" }]));

    expect(getRenderedState()).toEqual({ dataStates: {}, isFetching: false });
    expect(useDataStore.getState().data).toEqual({});
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it("keeps only the remaining track fetching when a pending track is removed", async () => {
    const signalRequest = createDeferred<unknown>();
    const initialGenesRequest = createDeferred<unknown>();
    const replacementGenesRequest = createDeferred<unknown>();
    const fetch = vi.fn(({ track }: { track: { config: { url: string } } }) => {
      const { config } = track;
      if (config.url === "signal") return signalRequest.promise;
      return fetch.mock.calls.length === 2
        ? initialGenesRequest.promise
        : replacementGenesRequest.promise;
    });
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch,
      render: { full: () => null },
    });
    const signal = module.create({
      id: "signal",
      title: "Signal",
      config: { url: "signal" },
    });
    const genes = module.create({
      id: "genes",
      title: "Genes",
      config: { url: "genes" },
    });
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks: [signal, genes] });
    useDataStore.getState().setData({
      signal: { status: "success", data: [{ id: "old-signal" }] },
      genes: { status: "success", data: [{ id: "old-genes" }] },
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness useDataStore={useDataStore} useTrackStore={useTrackStore} region={region} />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      expect(useTrackStore.getState().removeTrack("signal")).toEqual({ ok: true });
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(getRenderedState()).toEqual({
      dataStates: { genes: { status: "success", data: [{ id: "old-genes" }] } },
      isFetching: true,
    });
    expect(useDataStore.getState().data).toEqual({
      genes: { status: "success", data: [{ id: "old-genes" }] },
    });

    await act(async () => {
      signalRequest.resolve([{ id: "stale-signal" }]);
      initialGenesRequest.resolve([{ id: "stale-genes" }]);
    });
    expect(getRenderedState()).toEqual({
      dataStates: { genes: { status: "success", data: [{ id: "old-genes" }] } },
      isFetching: true,
    });
    expect(useDataStore.getState().data).toEqual({
      genes: { status: "success", data: [{ id: "old-genes" }] },
    });

    await act(async () => replacementGenesRequest.resolve([{ id: "current-genes" }]));
    expect(getRenderedState()).toEqual({
      dataStates: { genes: { status: "success", data: [{ id: "current-genes" }] } },
      isFetching: false,
    });
  });

  it("settles initial and changed regions without tracks", async () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: vi.fn(),
      render: { full: () => null },
    });
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module] });
    const onSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
          onSettled={onSettled}
        />,
      ),
    );
    expect(getRenderedState()).toEqual({ dataStates: {}, isFetching: false });
    expect(onSettled).toHaveBeenCalledOnce();

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 10, end: 20 }}
          onSettled={onSettled}
        />,
      ),
    );
    expect(getRenderedState()).toEqual({ dataStates: {}, isFetching: false });
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it("keeps an identical genomic request active when the region object changes", async () => {
    const request = createDeferred<null>();
    const fetch = vi.fn(() => request.promise);
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({}),
      fetch,
      render: { full: () => null },
    });
    const tracks = [module.create({ id: "signal", title: "Signal", config: {} })];
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks });
    const onSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
          onSettled={onSettled}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(onSettled).not.toHaveBeenCalled();

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={{ chromosome: "chr1", start: 0, end: 10 }}
          onSettled={onSettled}
        />,
      ),
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(onSettled).not.toHaveBeenCalled();

    await act(async () => request.resolve(null));

    expect(fetch).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it("uses the latest settlement callback without issuing another request", async () => {
    let completeRequest: ((data: unknown) => void) | undefined;
    const fetch = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          completeRequest = resolve;
        }),
    );
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch,
      render: { full: () => null },
    });
    const tracks = [
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }),
    ];
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const useDataStore = createDataStore();
    const useTrackStore = createTrackStore({ modules: [module], tracks });
    const staleOnSettled = vi.fn();
    const latestOnSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          onSettled={staleOnSettled}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          useTrackStore={useTrackStore}
          region={region}
          onSettled={latestOnSettled}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => completeRequest?.([{ id: "result" }]));

    expect(staleOnSettled).not.toHaveBeenCalled();
    expect(latestOnSettled).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
