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

test("tooltip escapes a compact browser at its display scale and dismisses on scroll or resize", async ({
  page,
}) => {
  await open(page, "?compact&scale=2&origin=-10&tooltipWidth=300&tooltipHeight=220");
  const tooltip = page.getByRole("tooltip");
  const browser = await box(page.getByRole("group", { name: "Genome browser" }));
  const track = await box(page.getByTestId("a"));
  const x = track.x + 20;
  const y = track.y + 10;
  await page.mouse.move(x, y);
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toBeInViewport({ ratio: 1 });
  const bounds = await box(tooltip);
  expect(bounds.width).toBe(600);
  expect(bounds.height).toBe(440);
  expect(bounds.x - x).toBe(20);
  expect(bounds.y - y).toBe(20);
  expect(bounds.y + bounds.height).toBeGreaterThan(browser.y + browser.height);
  await inside(tooltip, { x: 4, y: 4, width: 992, height: 792 });
  await page.mouse.wheel(0, 50);
  await expect(tooltip).toHaveCount(0);
  const moved = await box(page.getByTestId("a"));
  await page.mouse.move(moved.x + 30, moved.y + 10);
  await expect(tooltip).toBeVisible();
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(tooltip).toHaveCount(0);
});

test("tooltip larger than the window shrinks to fit and disappears on pointer leave", async ({
  page,
}) => {
  await open(page, "?tooltipWidth=2000&tooltipHeight=1000");
  const track = await box(page.getByTestId("a"));
  await page.mouse.move(track.x + 50, track.y + 30);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeInViewport({ ratio: 1 });
  await inside(tooltip, { x: 4, y: 4, width: 992, height: 792 });
  const bounds = await box(tooltip);
  expect(bounds.width).toBeCloseTo(992);
  expect(bounds.width / bounds.height).toBeCloseTo(2);
  await page.mouse.move(900, 790);
  await expect(tooltip).toHaveCount(0);
});
