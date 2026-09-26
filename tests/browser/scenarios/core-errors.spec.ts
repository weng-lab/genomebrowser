import { test, expect } from "./test";
import { open, box, drag } from "./core";

test("short error tracks scroll their own message without panning or overlapping neighbors", async ({
  page,
}) => {
  await open(page, "?errors");
  const errors = page.getByRole("region", { name: "Track error" });
  await expect(errors).toHaveCount(2);
  const neighbor = await box(page.getByTestId("c"));
  for (const [index, height] of [10, 60].entries()) {
    const error = errors.nth(index);
    expect((await box(error)).height).toBe(height);
    await error.hover();
    await page.mouse.wheel(0, 100);
    await expect.poll(() => error.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const r = await box(error);
    await drag(
      page,
      { x: r.x + 100, y: r.y + r.height / 2 },
      { x: r.x + 200, y: r.y + r.height / 2 },
    );
    await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
    expect(r.y + r.height).toBeLessThanOrEqual(neighbor.y);
  }
  expect(await box(page.getByTestId("c"))).toEqual(neighbor);
});
