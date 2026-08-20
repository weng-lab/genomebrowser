// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const trackState = vi.hoisted(() => ({
  currentHeight: 60,
  updateTrack: vi.fn(() => ({ ok: true as const })),
}));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useTrackStore: (
    selector: (state: {
      getTrack: (trackId: string) => { base: { height: number } } | undefined;
      updateTrack: typeof trackState.updateTrack;
    }) => unknown,
  ) =>
    selector({
      getTrack: (trackId) =>
        trackId === "rows" ? { base: { height: trackState.currentHeight } } : undefined,
      updateTrack: trackState.updateTrack,
    }),
}));

import { useRowLayout } from "@weng-lab/genomebrowser-tracks/shared";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  trackState.currentHeight = 60;
  trackState.updateTrack.mockClear();
});

describe("useRowLayout", () => {
  it("preserves configured row height while packed row count changes total height", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    renderRows(2);
    expect(container.textContent).toBe("12/24");
    expect(trackState.updateTrack).toHaveBeenLastCalledWith("rows", { base: { height: 24 } });

    renderRows(3);
    expect(container.textContent).toBe("12/36");
    expect(trackState.updateTrack).toHaveBeenLastCalledWith("rows", { base: { height: 36 } });
    expect(trackState.updateTrack).toHaveBeenCalledTimes(2);
  });
});

function Rows({ rowCount }: { rowCount: number }) {
  const layout = useRowLayout("rows", rowCount, { rowHeight: 12 });
  return `${layout.rowHeight}/${layout.trackHeight}`;
}

function renderRows(rowCount: number) {
  act(() => root?.render(<Rows rowCount={rowCount} />));
}
