import { test, expect } from "./test";
import { open, box, inside } from "./core";

for (const origin of [0, 35, -80]) {
  test(`tooltip fits real SVG bounds with content origin ${origin}`, async ({ page }) => {
    await open(page, `?origin=${origin}`);
    const browser = await box(page.getByRole("group", { name: "Genome browser" }));
    for (const id of ["a", "c"]) {
      const track = await box(page.getByTestId(id));
      for (const x of [track.x + 5, track.x + track.width - 5]) {
        for (const y of [track.y + 2, track.y + track.height - 2]) {
          await page.mouse.move(x, y);
          await expect(page.getByRole("tooltip")).toBeVisible();
          await inside(page.getByRole("tooltip"), browser);
          const tooltip = await box(page.getByRole("tooltip"));
          expect(x < tooltip.x || x > tooltip.x + tooltip.width).toBe(true);
          expect(y < tooltip.y || y > tooltip.y + tooltip.height).toBe(true);
        }
      }
    }
  });
}

test("tooltip flips at fit thresholds and responds to plot and content size changes", async ({
  page,
}) => {
  await open(page);
  const svg = await box(page.getByRole("group", { name: "Genome browser" }));
  const track = await box(page.getByTestId("c"));
  const tooltip = page.getByRole("tooltip");
  async function corner(x: number, y: number, left: boolean, above: boolean) {
    await page.mouse.move(x, y);
    await expect(tooltip).toBeVisible();
    await expect
      .poll(async () => {
        const b = await box(tooltip);
        return [
          Math.round(left ? x - b.x - b.width : b.x - x),
          Math.round(above ? y - b.y - b.height : b.y - y),
        ];
      })
      .toEqual([10, 10]);
  }
  const x = svg.x + svg.width - 130;
  const y = svg.y + svg.height - 70;
  await corner(x - 1, y - 1, false, false);
  await corner(x + 1, y + 1, true, true);
  await corner(x - 1, y - 1, false, false);
  await page.getByRole("button", { name: "Narrow plot" }).click();
  const anchorX = track.x + 350;
  await corner(anchorX, y - 1, true, false);
  await page.getByRole("button", { name: "Small tooltip" }).click();
  await corner(anchorX, y - 1, false, false);
});

test("oversized tooltip preserves its pointer gap on the roomier side", async ({ page }) => {
  await open(page, "?origin=-20&tooltipWidth=800&tooltipHeight=500");
  for (const [id, offset, left] of [
    ["a", 50, false],
    ["c", 450, true],
  ] as const) {
    const track = await box(page.getByTestId(id));
    const x = track.x + offset;
    const y = track.y + 30;
    await page.mouse.move(x, y);
    await expect
      .poll(async () => {
        const b = await page.getByRole("tooltip").boundingBox();
        return b
          ? [
              Math.round(left ? x - b.x - b.width : b.x - x),
              Math.round(left ? y - b.y - b.height : b.y - y),
            ]
          : null;
      })
      .toEqual([10, 10]);
  }
});
