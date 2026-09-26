import { test, expect } from "./test";
import { open, box, drag } from "./core";

test("selection zooms, cancels with Escape, and adds chromosome-scoped highlights", async ({
  page,
}) => {
  await open(page);
  const plot = await box(page.getByTestId("a"));
  const from = { x: plot.x + 100, y: plot.y + 50 };
  const to = { x: plot.x + 300, y: from.y };
  await page.getByRole("button", { name: "zoom", exact: true }).click();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await expect(page.locator("[data-region-selection]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator("[data-region-selection]")).toHaveCount(0);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
  await expect(page.getByLabel("Selection mode")).toHaveText("zoom");
  await drag(page, from, to);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:300-500");
  await page.getByRole("button", { name: "highlight", exact: true }).click();
  await drag(page, to, from);
  await expect(page.getByLabel("Highlights")).toContainText('"chromosome":"chr1"');
  const highlights = JSON.parse(await page.getByLabel("Highlights").innerText());
  expect(highlights[0]).toMatchObject({
    region: { start: 333, end: 400 },
    color: "#ff0000",
    opacity: 0.7,
    type: "outlined",
  });
  await expect(page.locator('rect[stroke="#ff0000"][fill="none"]')).toHaveCount(1);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:300-500");
  await drag(page, to, from);
  const repeated = JSON.parse(await page.getByLabel("Highlights").innerText());
  expect(new Set(repeated.map((h: { id: string }) => h.id)).size).toBe(2);
  await drag(page, to, from);
  const third = JSON.parse(await page.getByLabel("Highlights").innerText());
  expect(new Set(third.map((h: { id: string }) => h.id)).size).toBe(3);
  await page.getByRole("button", { name: "Chromosome 2" }).click();
  await expect(page.getByLabel("Visible region")).toHaveText("chr2:200-800");
  await expect(page.locator('rect[stroke="#ff0000"][fill="none"]')).toHaveCount(0);
  await expect(page.getByLabel("Highlights")).toContainText('"chromosome":"chr1"');
});

test("selection clamps to the plot and leaves margin settings usable", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "zoom", exact: true }).click();
  await page.getByRole("button", { name: "Settings for A" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  const plot = await box(page.getByTestId("a"));
  await drag(page, { x: plot.x + 200, y: plot.y + 50 }, { x: plot.x - 50, y: plot.y + 50 });
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-400");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("ruler starts shared Zoom from Pan and commits instead of panning", async ({ page }) => {
  await open(page, "?ruler");
  const axis = page.locator('[data-genomebrowser-selection-mode="zoom"]');
  const a = await box(axis);
  const browser = await box(page.getByRole("group", { name: "Genome browser" }));
  await drag(
    page,
    { x: browser.x + 200, y: a.y + a.height / 2 },
    { x: browser.x + 400, y: a.y + a.height / 2 },
  );
  await expect(page.getByLabel("Selection mode")).toHaveText("zoom");
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:300-500");
});

for (const mode of ["zoom", "highlight"] as const) {
  test(`${mode} intercepts content input, shows its guide, and cancels without committing`, async ({
    page,
  }) => {
    await open(page);
    const plot = await box(page.getByTestId("a"));
    const x = plot.x + 100;
    const y = plot.y + 50;
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.mouse.move(x, y);
    await expect(page.locator("[data-cursor-guide]")).toHaveCSS("visibility", "visible");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.mouse.click(x, y, { button: "right" });
    await expect(page.getByRole("button", { name: "remove", exact: true })).toHaveCount(0);
    await page.mouse.down();
    await page.mouse.move(x + 120, y);
    await expect(page.locator("[data-region-selection]")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
    await expect(page.getByLabel("Highlights")).toHaveText("[]");
    await expect(page.getByLabel("Selection mode")).toHaveText(mode);
    await expect(page.locator("[data-region-selection]")).toHaveCount(0);
    await page.mouse.move(80, y);
    await expect(page.locator("[data-cursor-guide]")).toHaveCSS("visibility", "hidden");
    await page.getByRole("button", { name: "pan", exact: true }).click();
    await page.mouse.move(x, y);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.locator("[data-cursor-guide]")).toHaveCount(0);
  });
}

for (const [region, start, end, expected] of [
  ["lower", 200, -50, "chr1:0-200"],
  ["upper", 400, 650, "chr1:11800-12000"],
  ["base", 100, 110, "chr1:0-1"],
] as const) {
  test(`selection remains valid at the ${region} boundary`, async ({ page }) => {
    await open(page, `?region=${region}`);
    await page.getByRole("button", { name: "zoom", exact: true }).click();
    const plot = await box(page.getByTestId("a"));
    await drag(page, { x: plot.x + start, y: plot.y + 50 }, { x: plot.x + end, y: plot.y + 50 });
    await expect(page.getByLabel("Visible region")).toHaveText(expected);
    await expect(page.locator("[data-region-selection]")).toHaveCount(0);
  });
}
