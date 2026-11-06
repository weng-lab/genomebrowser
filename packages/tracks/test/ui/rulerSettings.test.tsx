// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { openTrackSettings } from "../testBrowser";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createRuler(source: "host" | "user") {
  return rulerModule.create({ base: { id: "ruler", title: "Reference" }, source, config: {} });
}

it("exposes config fields and preserves host ownership", async () => {
  const { dialog, trackStore, unmount } = await openTrackSettings(rulerModule, createRuler("host"));
  const storedConfig = () => rulerModule.validate(trackStore.getState().getTrack("ruler")).config;
  const input = (label: string) => {
    const element = Array.from(dialog.querySelectorAll("label")).find((item) =>
      item.textContent?.startsWith(label),
    );
    return dialog.querySelector<HTMLInputElement>(`[id="${element?.htmlFor}"]`)!;
  };
  expect(input("2bit URL").disabled).toBe(true);
  const color = input("Sequence highlight color");
  expect(color.value.toLowerCase()).toBe("#64748b");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      color,
      "#ff8800",
    );
    color.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => color.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(storedConfig().sequenceHighlightColor).toBe("#FF8800");
  const checkbox = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(checkbox.checked).toBe(false);
  act(() => checkbox.click());
  expect(storedConfig().distinguishMaskedBases).toBe(true);
  expect(dialog.textContent).not.toContain("Bases appear when each");

  unmount();
  const userSettings = await openTrackSettings(rulerModule, createRuler("user"));
  const urlLabel = Array.from(userSettings.dialog.querySelectorAll("label")).find((item) =>
    item.textContent?.startsWith("2bit URL"),
  );
  expect(
    userSettings.dialog.querySelector<HTMLInputElement>(`[id="${urlLabel?.htmlFor}"]`)!.disabled,
  ).toBe(false);
});
