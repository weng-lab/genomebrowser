// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BigBedSettings } from "../src/tracks/bigbed/settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
});

describe("BigBed settings", () => {
  it("renders a controlled URL field and forwards URL changes", () => {
    vi.useFakeTimers();
    const updateConfig = vi.fn((): { ok: true } => ({ ok: true }));

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <BigBedSettings
          id="bigbed"
          config={{ url: "YOUR_URL_HERE" }}
          updateConfig={updateConfig}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[type="url"]');
    if (!input) throw new Error("Could not find the BigBed URL input");

    expect(container.textContent).toContain("BigBed");
    expect(container.textContent).toContain("URL");
    expect(input.value).toBe("YOUR_URL_HERE");
    expect(input.autocomplete).toBe("url");
    expect(input.inputMode).toBe("url");

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("Could not set the BigBed URL input value");
    act(() => {
      valueSetter.call(input, "UPDATED_URL");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(updateConfig).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(updateConfig).toHaveBeenCalledWith({ url: "UPDATED_URL" });
  });
});
