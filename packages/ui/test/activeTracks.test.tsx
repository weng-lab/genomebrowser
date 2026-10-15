// @vitest-environment jsdom
import { act, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import type { AnyTrackInstance, TrackCollection } from "@weng-lab/genomebrowser";
import { ActiveTracks } from "../src/lib";

const catalog: TrackCollection[] = [
  {
    id: "signals",
    label: "Signals",
    assembly: "hg38",
    views: [
      {
        id: "default",
        label: "Assay",
        columns: [{ field: "title" }],
        grouping: ["assay"],
        leaf: "title",
      },
    ],
    tracks: [
      {
        type: "signal",
        base: { id: "one", title: "Authored title" },
        config: {},
        metadata: { assay: "ATAC" },
      },
    ],
  },
];
function track(id: string, title: string): AnyTrackInstance {
  return {
    type: "signal",
    source: "user",
    config: {},
    base: { id, title, display: "full", height: 20, color: "#3366cc" },
  };
}
let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
});
const initial = [
  track("host-track", "Custom title"),
  track("signals::one", "Second copy"),
  track("unlisted", "Unlisted"),
];
const resolveCollectionTrackId = (value: AnyTrackInstance) =>
  value.base.id === "host-track" ? "signals::one" : undefined;

// Removing the loaded descendants of a group changes the supplied tracks once.
// Both views need exactly one render to display the smaller list.
it("shows every runtime instance, returns runtime IDs for group removal, and updates the controlled tree", async () => {
  const removed = vi.fn();
  function Host() {
    const [tracks, setTracks] = useState(initial);
    return (
      <ActiveTracks
        tracks={tracks}
        trackCollections={catalog}
        resolveCollectionTrackId={resolveCollectionTrackId}
        onRemoveTrackIds={(ids) => {
          removed(ids);
          setTracks((current) => current.filter((value) => !ids.includes(value.base.id)));
        }}
      />
    );
  }
  probe = await renderWithProbe(<Host />);
  async function expand(label: string) {
    const node = [...document.querySelectorAll("p")].find((value) => value.textContent === label)!;
    await act(async () => node.click());
  }
  await expand("Signals");
  await expand("ATAC");
  expect(document.body.textContent).toContain("Custom title");
  expect(document.body.textContent).toContain("Second copy");
  expect(document.body.textContent).not.toContain("Authored title");
  const report = await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Remove ATAC"]')!.click(),
  );
  expect(removed).toHaveBeenCalledWith(["host-track", "signals::one"]);
  expect(report.pick("ActiveTracks", "SelectedTracksTree")).toMatchInlineSnapshot(`
    {
      "ActiveTracks": 1,
      "SelectedTracksTree": 1,
    }
  `);
  expect(document.body.textContent).not.toContain("Signals");
  await expand("Other tracks");
  expect(document.body.textContent).toContain("Unlisted");
  await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Unlisted"]')!.click(),
  );
  expect(removed).toHaveBeenLastCalledWith(["unlisted"]);
  expect(document.body.textContent).toContain("No selected tracks.");
});
