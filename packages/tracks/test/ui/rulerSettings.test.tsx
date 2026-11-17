// @vitest-environment jsdom
import { expect, it } from "vitest";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { mountTrack } from "../mountTrack";

/** Mounts a ruler in a browser and opens its settings the way a user does. */
async function openRulerSettings(source: "host" | "user") {
  const view = await mountTrack({
    module: rulerModule,
    track: { base: { id: "ruler", title: "Reference" }, source, config: {} },
    data: { records: [] },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
  });
  const dialog = await view.openSettings();
  const labels = Array.from(dialog.querySelectorAll("label"));
  const input = (label: string) =>
    dialog.querySelector<HTMLInputElement>(
      `[id="${labels.find((item) => item.textContent?.startsWith(label))?.htmlFor}"]`,
    )!;
  const config = () => rulerModule.validate(view.trackStore.getState().getTrack("ruler")).config;
  return { view, dialog, input, config };
}

it("exposes config fields and preserves host ownership", async () => {
  const { view, dialog, input, config } = await openRulerSettings("host");
  expect(input("2bit URL").disabled).toBe(true);
  const color = input("Sequence highlight color");
  expect(color.value.toLowerCase()).toBe("#64748b");
  await view.settle(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      color,
      "#ff8800",
    );
    color.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await view.settle(() =>
    color.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  expect(config().sequenceHighlightColor).toBe("#FF8800");
  const checkbox = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(checkbox.checked).toBe(false);
  await view.settle(() => checkbox.click());
  expect(config().distinguishMaskedBases).toBe(true);
  expect(checkbox.checked).toBe(true);
  expect(dialog.textContent).not.toContain("Bases appear when each");

  const user = await openRulerSettings("user");
  expect(user.input("2bit URL").disabled).toBe(false);
});
