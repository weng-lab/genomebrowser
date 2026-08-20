// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackSettingsNumberField } from "../../src/shared/settings/trackSettingsNumberField";
import { TrackSettingsTextField } from "../../src/shared/settings/trackSettingsTextField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../../src/shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../src/shared/settings/trackSettingsLayout";
import { TrackSettingsUrlField } from "../../src/shared/settings/trackSettingsUrlField";

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

describe("track settings fields", () => {
  it("retains cleared and partial numeric drafts before committing a completed value", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn(() => ({ ok: true }) as const);
    mount(
      <TrackSettingsNumberField
        label="Threshold"
        value={12}
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    const input = getInput("Threshold");

    updateInput(input, "");
    expect(input.value).toBe("");
    expect(container?.textContent).toContain("Enter a number.");

    updateInput(input, "-");
    expect(input.value).toBe("-");
    updateInput(input, ".");
    expect(input.value).toBe(".");
    updateInput(input, "1.");
    expect(input.value).toBe("1.");
    act(() => vi.advanceTimersByTime(300));
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "1.5");
    act(() => vi.advanceTimersByTime(299));
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onCommit).toHaveBeenCalledWith(1.5);
  });

  it("flushes on blur and Enter, then restores the external value on Escape", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn(() => ({ ok: true }) as const);
    mount(
      <TrackSettingsTextField
        label="Title"
        value="Saved title"
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    const input = getInput("Title");

    updateInput(input, "First title");
    keyDown(input, "Enter");
    expect(onCommit).toHaveBeenCalledWith("First title");

    updateInput(input, "Second title");
    blur(input);
    expect(onCommit).toHaveBeenLastCalledWith("Second title");

    updateInput(input, "Discarded title");
    keyDown(input, "Escape");
    expect(input.value).toBe("Second title");
    act(() => vi.advanceTimersByTime(300));
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it("keeps rejected drafts and synchronizes a clean field from external updates", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn(() => ({ ok: false, error: "Core rejected this title." }) as const);
    mount(
      <TrackSettingsTextField
        label="Title"
        value="Saved title"
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    const input = getInput("Title");

    updateInput(input, "Rejected title");
    act(() => vi.advanceTimersByTime(300));
    expect(input.value).toBe("Rejected title");
    expect(container?.textContent).toContain("Core rejected this title.");

    rerender(
      <TrackSettingsTextField
        label="Title"
        value="External title"
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    expect(input.value).toBe("Rejected title");

    keyDown(input, "Escape");
    expect(input.value).toBe("External title");

    rerender(
      <TrackSettingsTextField
        label="Title"
        value="Latest external title"
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    expect(input.value).toBe("Latest external title");
  });

  it("retries an unchanged draft after a rejected commit", () => {
    vi.useFakeTimers();
    const onCommit = vi
      .fn()
      .mockReturnValueOnce({ ok: false, error: "Core rejected this title." })
      .mockReturnValueOnce({ ok: true });
    mount(
      <TrackSettingsTextField
        label="Title"
        value="Saved title"
        validate={() => undefined}
        onCommit={onCommit}
      />,
    );
    const input = getInput("Title");

    updateInput(input, "Retry title");
    act(() => vi.advanceTimersByTime(300));
    expect(container?.textContent).toContain("Core rejected this title.");

    keyDown(input, "Enter");

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenLastCalledWith("Retry title");
    expect(input.value).toBe("Retry title");
    expect(container?.textContent).not.toContain("Core rejected this title.");
  });

  it("uses the latest callback and cancels unmounted delayed commits", () => {
    vi.useFakeTimers();
    const staleCommit = vi.fn(() => ({ ok: true }) as const);
    const latestCommit = vi.fn(() => ({ ok: true }) as const);
    mount(
      <TrackSettingsTextField
        label="Assembly"
        value="GRCh38"
        validate={() => undefined}
        onCommit={staleCommit}
      />,
    );
    const input = getInput("Assembly");

    updateInput(input, "GRCh37");
    updateInput(input, "T2T-CHM13");
    rerender(
      <TrackSettingsTextField
        label="Assembly"
        value="GRCh38"
        validate={() => undefined}
        onCommit={latestCommit}
      />,
    );
    act(() => vi.advanceTimersByTime(300));
    expect(staleCommit).not.toHaveBeenCalled();
    expect(latestCommit).toHaveBeenCalledWith("T2T-CHM13");

    updateInput(input, "hg19");
    act(() => root?.unmount());
    act(() => vi.advanceTimersByTime(300));
    expect(latestCommit).toHaveBeenCalledTimes(1);
  });

  it("uses the shared URL field without accepting a required blank value", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn(() => ({ ok: true }) as const);
    mount(
      <TrackSettingsUrlField
        label="Signal URL"
        required
        value="YOUR_URL_HERE"
        onCommit={onCommit}
      />,
    );
    const input = getInput("Signal URL");

    expect(input.type).toBe("url");
    expect(input.autocomplete).toBe("url");
    expect(input.inputMode).toBe("url");

    updateInput(input, "");
    expect(input.value).toBe("");
    expect(container?.textContent).toContain("Enter a URL.");
    act(() => vi.advanceTimersByTime(300));
    expect(onCommit).not.toHaveBeenCalled();

    updateInput(input, "YOUR_OTHER_URL_HERE");
    act(() => vi.advanceTimersByTime(300));
    expect(onCommit).toHaveBeenCalledWith("YOUR_OTHER_URL_HERE");
  });
});

describe("track settings layout primitives", () => {
  it("uses one shared gap between top-level settings sections", () => {
    mount(
      <TrackSettingsLayout>
        <div>First section</div>
        <div>Second section</div>
      </TrackSettingsLayout>,
    );

    const layout = container?.firstElementChild as HTMLElement;
    expect(getComputedStyle(layout).display).toBe("grid");
    expect(getComputedStyle(layout).gap).toBe("12px");
  });

  it("allows an item to deliberately span a responsive field grid", () => {
    mount(
      <TrackSettingsFieldGrid>
        <div>Peer field</div>
        <TrackSettingsFullRow>
          <div id="full-row-content">Full-row content</div>
        </TrackSettingsFullRow>
      </TrackSettingsFieldGrid>,
    );

    const fullRow = container?.querySelector("#full-row-content")?.parentElement;
    expect(fullRow).toBeTruthy();
    expect(getComputedStyle(fullRow as HTMLElement).display).toBe("grid");
    expect(getComputedStyle(fullRow as HTMLElement).gridColumn).toBe("1/-1");
    expect(fullRow?.previousElementSibling?.textContent).toBe("Peer field");
  });
});

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function rerender(node: React.ReactNode) {
  act(() => root?.render(node));
}

function getInput(label: string) {
  const input = Array.from(container?.querySelectorAll<HTMLInputElement>("input") ?? []).find(
    (candidate) =>
      Array.from(candidate.labels ?? []).some(
        (element) => element.textContent?.replace("*", "").trim() === label,
      ),
  );
  if (!input) throw new Error(`Could not find input labeled ${label}`);
  return input;
}

function updateInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!valueSetter) throw new Error("Input value setter is unavailable");
  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function blur(input: HTMLInputElement) {
  act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}

function keyDown(input: HTMLInputElement, key: string) {
  act(() => input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key })));
}
