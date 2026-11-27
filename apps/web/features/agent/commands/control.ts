import { z } from "zod";
import { defineBrowserCommand } from "./define";

export const takeControl = defineBrowserCommand({
  name: "take_control",
  description:
    "Take control of the browser before a workflow of several steps, such as adding tracks, then sorting and tagging them, so the user's edits cannot interfere while you work. The user cannot change the browser until you call release_control or your turn ends, and control lifts on its own two minutes after you last took it; take it again to keep it. Do not take control for a single action such as navigating.",
  params: z.strictObject({}),
  result: z.strictObject({ held: z.literal(true) }),
  run(app) {
    app.control.take();
    return { ok: true, value: { held: true as const } };
  },
});

export const releaseControl = defineBrowserCommand({
  name: "release_control",
  description:
    "Give control of the browser back to the user as soon as your multi-step workflow is done.",
  params: z.strictObject({}),
  result: z.strictObject({ held: z.literal(false) }),
  run(app) {
    app.control.release();
    return { ok: true, value: { held: false as const } };
  },
});
