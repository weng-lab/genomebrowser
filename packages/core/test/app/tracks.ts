import { z } from "zod";
import { defineTrackModule } from "../../src/lib";

function TestRenderer() {
  return null;
}

export const testTrackModule = defineTrackModule({
  type: "test",
  configSchema: z.object({ label: z.string() }),
  fetch: async () => null,
  render: { full: TestRenderer },
});

export const testTrack = testTrackModule.create({
  id: "test-track",
  title: "Test track",
  config: { label: "Local fixture" },
});
