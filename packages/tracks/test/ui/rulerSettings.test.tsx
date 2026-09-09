// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { RulerSettings } from "../../src/ruler/settings";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
it("exposes config fields and preserves host ownership", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const updateTrack = vi.fn(() => ({ ok: true as const }));
  try {
    const track = rulerModule.create({
      id: "ruler",
      title: "Reference",
      source: "host",
      config: {},
    });
    act(() => root.render(<RulerSettings track={track} updateTrack={updateTrack} />));
    const labels = Array.from(container.querySelectorAll("label"));
    const input = (label: string) =>
      container.querySelector<HTMLInputElement>(
        `[id="${labels.find((item) => item.textContent === label)?.htmlFor}"]`,
      )!;
    expect(input("2bit URL").disabled).toBe(true);
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.checked).toBe(false);
    act(() => checkbox.click());
    expect(updateTrack).toHaveBeenLastCalledWith({ config: { distinguishMaskedBases: true } });
    expect(container.textContent).not.toContain("Bases appear when each");
    expect(input("Minimum pixels per base").value).toBe("5");
    expect(input("Minimum pixels per base").disabled).toBe(false);
    act(() =>
      root.render(<RulerSettings track={{ ...track, source: "user" }} updateTrack={updateTrack} />),
    );
    expect(input("2bit URL").disabled).toBe(false);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
