import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { createTooltipStore } from "../../src/browser/tooltip/tooltipStore";

describe("tooltip store ownership", () => {
  it("does not let one tooltip owner hide another owner's tooltip", () => {
    const store = createTooltipStore();
    const content = createElement("g");

    store.getState().show("active-owner", content, { x: 10, y: 20 });
    store.getState().hide("stale-owner");

    expect(store.getState()).toMatchObject({
      isVisible: true,
      owner: "active-owner",
      anchor: { x: 10, y: 20 },
    });

    store.getState().hide("active-owner");
    expect(store.getState()).toMatchObject({
      isVisible: false,
      owner: undefined,
    });
  });
});
