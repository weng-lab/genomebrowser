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
  useTrackData(props);
  return null;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("useTrackData", () => {
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
