// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  GenomeBrowser,
} from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("keeps URL drafts out of the active source and fetcher until Set is clicked", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(async () => ({ records: [] }));
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: 1000 },
    trackWidth: 800,
  });
  const useTrackStore = createTrackStore({
    modules: [{ ...bigWigModule, fetch }],
    tracks: [
      bigWigModule.create({
        base: { id: "signal", title: "Signal" },
        config: { url: "YOUR_URL_HERE" },
      }),
    ],
  });
  const useSettingsStore = createSettingsStore();
  useSettingsStore.getState().openSettings("signal", { x: 0, y: 0 });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <GenomeBrowser
          sizing="fixed"
          browserStore={useBrowserStore}
          trackStore={useTrackStore}
          settingsStore={useSettingsStore}
        />,
      ),
    );
    const input = document.querySelector<HTMLInputElement>('input[type="url"]')!;
    const set = document.querySelector<HTMLButtonElement>('button[aria-label="Set URL"]')!;
    const initialFetchCount = fetch.mock.calls.length;
    expect(initialFetchCount).toBeGreaterThan(0);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "YOUR_OTHER_URL_HERE",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(input.value).toBe("YOUR_OTHER_URL_HERE");
    expect(useTrackStore.getState().getTrack("signal")?.config.url).toBe("YOUR_URL_HERE");
    expect(fetch).toHaveBeenCalledTimes(initialFetchCount);
    await act(async () => set.click());
    expect(useTrackStore.getState().getTrack("signal")?.config.url).toBe("YOUR_OTHER_URL_HERE");
    expect(fetch).toHaveBeenCalledTimes(initialFetchCount + 1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  }
});
