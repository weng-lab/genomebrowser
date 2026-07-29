// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createDataStore } from "../../src/browser/data/dataStore";
import { useTrackData } from "../../src/browser/data/useTrackData";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { createModuleRegistry } from "../../src/modules/registry";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function Harness(props: Parameters<typeof useTrackData>[0]) {
  const { dataStates, isFetching } = useTrackData(props);
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
  it("clears fetching and data when the final pending track is removed", async () => {
    const request = createDeferred<unknown>();
    const fetch = vi.fn(() => request.promise);
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch,
      render: { full: () => null },
    });
    const registry = createModuleRegistry([module]);
    const track = module.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const useDataStore = createDataStore();
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
          registry={registry}
          tracks={[track]}
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

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          registry={registry}
          tracks={[]}
          region={region}
          onSettled={onSettled}
        />,
      ),
    );
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
    const fetch = vi.fn(({ config }: { config: { url: string } }) => {
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
    const registry = createModuleRegistry([module]);
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
    useDataStore.getState().setData({
      signal: { status: "success", data: [{ id: "old-signal" }] },
      genes: { status: "success", data: [{ id: "old-genes" }] },
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          registry={registry}
          tracks={[signal, genes]}
          region={region}
        />,
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          registry={registry}
          tracks={[genes]}
          region={region}
        />,
      ),
    );
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
    const registry = createModuleRegistry([module]);
    const useDataStore = createDataStore();
    const onSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          registry={registry}
          tracks={[]}
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
          registry={registry}
          tracks={[]}
          region={{ chromosome: "chr1", start: 10, end: 20 }}
          onSettled={onSettled}
        />,
      ),
    );
    expect(getRenderedState()).toEqual({ dataStates: {}, isFetching: false });
    expect(onSettled).toHaveBeenCalledTimes(2);
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
    const registry = createModuleRegistry([module]);
    const tracks = [
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }),
    ];
    const region = { chromosome: "chr1", start: 0, end: 10 };
    const useDataStore = createDataStore();
    const staleOnSettled = vi.fn();
    const latestOnSettled = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          useDataStore={useDataStore}
          registry={registry}
          tracks={tracks}
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
          registry={registry}
          tracks={tracks}
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
