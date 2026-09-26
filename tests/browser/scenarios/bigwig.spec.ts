import { test, expect } from "./test";
import { openSignal, signalPlot } from "./signal";

test("BigWig fixture renders positive and negative signal and reports the hovered value", async ({
  page,
}) => {
  await openSignal(page);
  const plot = await signalPlot(page);
  // Test scientific geometry in screen space without snapshotting SVG serialization.
  // basic.bedGraph contains +7 at [400,425), -8 at [500,540), and a gap at 280.
  const samples = await page
    .locator('#browser path[fill="#2266aa"]')
    .evaluate((path: SVGPathElement, plot) => {
      const filled = (base: number, score: number) => {
        const point = new DOMPoint(plot.x + (base - 190), plot.y + (10 - score) * 8);
        return path.isPointInFill(point.matrixTransform(path.getScreenCTM()!.inverse()));
      };
      return [
        filled(410.5, 6),
        filled(410.5, 8),
        filled(520.5, -7),
        filled(520.5, -9),
        filled(280.5, 1),
      ];
    }, plot);
  expect(samples, "Expected +7 and -8 blocks and an empty gap").toEqual([
    true,
    false,
    true,
    false,
    false,
  ]);
  await page.mouse.move(plot.x + 220, plot.y + 40);
  await expect(page.getByRole("tooltip", { name: "Signal 7.00" })).toBeVisible();
});
