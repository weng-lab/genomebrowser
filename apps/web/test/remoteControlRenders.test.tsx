// @vitest-environment jsdom

import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterEach, expect, it } from "vitest";
import { BrowserServer, useRemoteControl } from "../browser/BrowserServer";
import { BrowserSessionProvider } from "../browser/BrowserSession";

function RemoteControlReader() {
  const { enabled } = useRemoteControl();
  return <p>{enabled ? "Enabled" : "Disabled"}</p>;
}

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
});

// Changing the session ID leaves remote-control state unchanged, so its reader
// has no new data to display and should not commit a render.
it("budgets remote-control readers when the session ID changes", async () => {
  const children = <RemoteControlReader />;
  const tree = (sessionId: string) => (
    <BrowserSessionProvider>
      <BrowserServer sessionId={sessionId}>{children}</BrowserServer>
    </BrowserSessionProvider>
  );
  probe = await renderWithProbe(tree("local"));
  const report = await probe.measure(() => probe!.rerender(tree("other")));
  expect(report.pick("RemoteControlReader")).toMatchInlineSnapshot(`
    {
      "RemoteControlReader": 0,
    }
  `);
});
