import { test, expect } from "./test";
import { openSignal, signalPlot } from "./signal";

// Core owns the behavior; the workspace app supplies a real first-party track.
test("pointer pan commits the region and keeps signal hover aligned", async ({ page }) => {
  await openSignal(page);
  const region = page.getByRole("status", { name: "Visible region" });
  await expect(region).toHaveText("chr1:190-790");
  const plot = await signalPlot(page);
  await page.mouse.move(plot.x + 300, plot.y + 80);
  await page.mouse.down();
  await page.mouse.move(plot.x + 180, plot.y + 80, { steps: 8 });
  await page.mouse.up();
  // 120 screen pixels across a 600px plot spanning 600 bases pans forward 120 bases.
  await expect(region).toHaveText("chr1:310-910");
  await page.mouse.move(plot.x + 100, plot.y + 40);
  await expect(page.getByRole("tooltip", { name: "Signal 7.00" })).toBeVisible();
});
