// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTrackModule, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRowLayout } from "@weng-lab/genomebrowser-tracks/shared";
import { mountTrack, type MountedTrack } from "../mountTrack";

type RowsConfig = { rowCount: number };

function Rows({ id, config }: TrackRendererProps<RowsConfig, null>) {
  const layout = useRowLayout(id, config.rowCount, { rowHeight: 12 });
  return <text>{`${layout.rowHeight}/${layout.trackHeight}`}</text>;
}

const rowsModule = defineTrackModule({
  type: "rows",
  configSchema: z.object({ rowCount: z.number() }),
  fetch: async () => null,
  render: { full: Rows },
});

let view: MountedTrack | undefined;
afterEach(async () => {
  await view?.unmount();
  view = undefined;
});

describe("useRowLayout", () => {
  it("preserves configured row height while packed row count changes total height", async () => {
    view = await mountTrack({
      module: rowsModule,
      track: { base: { id: "rows", title: "Rows", height: 60 }, config: { rowCount: 2 } },
      data: null,
      region: { chromosome: "chr1", start: 0, end: 100 },
    });
    const height = () => view?.trackStore.getState().getTrack("rows")?.base.height;

    expect(view.content.textContent).toBe("12/24");
    expect(height()).toBe(24);

    await view.settle(() =>
      view?.trackStore.getState().updateTrack("rows", { config: { rowCount: 3 } }),
    );
    expect(view.content.textContent).toBe("12/36");
    expect(height()).toBe(36);
  });
});
