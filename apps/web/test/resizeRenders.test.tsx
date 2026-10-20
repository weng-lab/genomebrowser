// @vitest-environment jsdom

import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Workspace } from "../shared/workspace/Workspace";
import { WorkspacePage } from "../shared/workspace/WorkspacePage";
import { setTestPathname } from "./workspaceFixture";

function CenterContent() {
  return <p>Browser</p>;
}
function LeftContent() {
  return <p>Sessions</p>;
}
function RightContent() {
  return <p>Assistant</p>;
}

let probe: Probe | undefined;
let frames: Map<number, FrameRequestCallback>;

beforeEach(() => {
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

async function settleInitialPaint() {
  // Each batch represents one paint. Finish mount-time motion setup before
  // measuring the resize, regardless of how busy the test runner is.
  while (frames.size > 0) {
    await act(async () => {
      const pending = [...frames];
      for (const [id, callback] of pending) {
        frames.delete(id);
        callback(0);
      }
    });
  }
}

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
});

// Exercise the keyboard resize control. Stable page children receive no new
// data, so none of the content components need to commit during resizing.
it("budgets content renders when resizing the left panel", async () => {
  setTestPathname("/browser");
  probe = await renderWithProbe(
    <Workspace navigation={[]}>
      <WorkspacePage
        title="Browser"
        left={{ title: "Sessions", children: <LeftContent /> }}
        right={{ title: "Assistant", children: <RightContent /> }}
      >
        <CenterContent />
      </WorkspacePage>
    </Workspace>,
  );
  await settleInitialPaint();
  const handle = document.querySelector<HTMLElement>(
    '[role="separator"][aria-controls="left-panel"]',
  )!;
  const report = await probe.measure(() => {
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
  });
  expect(handle.getAttribute("aria-valuenow")).toBe("480");
  expect(report.pick("CenterContent", "LeftContent", "RightContent")).toMatchInlineSnapshot(`
    {
      "CenterContent": 0,
      "LeftContent": 0,
      "RightContent": 0,
    }
  `);
});
