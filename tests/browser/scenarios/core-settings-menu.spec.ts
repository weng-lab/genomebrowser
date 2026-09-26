import { test, expect } from "./test";
import { open, box, drag, inside } from "./core";

test("settings edit the selected track, scroll, drag, resize and close", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Settings for B" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect((await box(dialog)).width).toBe(550);
  await dialog.getByRole("textbox", { name: "Color" }).fill("#112233");
  await expect(dialog.locator(":scope > div").first()).toHaveCSS(
    "background-color",
    "rgb(17, 34, 51)",
  );
  await dialog.getByRole("textbox", { name: "Title" }).fill("Changed");
  await expect(page.getByRole("button", { name: "Settings for Changed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings for A" })).toBeVisible();
  await dialog.getByRole("button", { name: "Last setting" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Last setting" })).toBeInViewport();
  const header = await box(dialog.getByText("Configure Changed", { exact: true }));
  await drag(page, { x: header.x + 30, y: header.y + 10 }, { x: 995, y: 795 });
  await expect.poll(async () => (await box(dialog)).x).toBeGreaterThan(400);
  await inside(dialog, { x: 8, y: 8, width: 984, height: 784 });
  await page.setViewportSize({ width: 320, height: 360 });
  await inside(dialog, { x: 8, y: 8, width: 304, height: 344 });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Settings for A" }).click();
  await expect(dialog).toContainText("Configure A");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(dialog).toHaveCount(0);
});

test("context menu changes displays, dismisses on page scroll, and removes only its target", async ({
  page,
}) => {
  await open(page);
  await page.getByTestId("b").click({ button: "right" });
  await page.getByRole("button", { name: "dense", exact: true }).click();
  await expect(page.getByLabel("Displays")).toHaveText("a:full,b:dense,c:full");
  await page.getByTestId("b").click({ button: "right" });
  await page.getByTestId("c").click({ button: "right" });
  const remove = page.getByRole("button", { name: "remove", exact: true });
  await inside(remove.locator(".."), { x: 0, y: 0, width: 1000, height: 800 });
  await page.mouse.wheel(0, 100);
  await expect(remove).toHaveCount(0);
  await page.getByTestId("c").click({ button: "right" });
  await page.keyboard.press("Escape");
  await expect(remove).toHaveCount(0);
  await page.getByTestId("c").click({ button: "right" });
  await remove.click();
  await expect(page.getByLabel("Track order")).toHaveText("a,b");
  await expect(page.getByTestId("c")).toHaveCount(0);
});

test("context menu stays within a resized viewport and dismisses on containing-panel scroll", async ({
  page,
}) => {
  await open(page);
  await page.setViewportSize({ width: 700, height: 600 });
  const c = await box(page.getByTestId("c"));
  await page.mouse.click(670, c.y + 95, { button: "right" });
  const menu = page.getByRole("button", { name: "remove", exact: true }).locator("..");
  await expect(menu).toBeVisible();
  await inside(menu, { x: 0, y: 0, width: 700, height: 600 });
  await page.setViewportSize({ width: 500, height: 420 });
  await inside(menu, { x: 0, y: 0, width: 500, height: 420 });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1000, height: 800 });
  await open(page, "?panel");
  const b = await box(page.getByTestId("b"));
  await page.mouse.click(400, b.y + 30, { button: "right" });
  await expect(menu).toBeVisible();
  await page.mouse.move(80, b.y + 30);
  await page.mouse.wheel(0, 100);
  await expect(menu).toHaveCount(0);
  await page.getByTestId("b").click({ button: "right" });
  await expect(menu).toBeVisible();
});

test("context menu can scroll its own contents without dismissing", async ({ page }) => {
  await open(page);
  await page.getByTestId("a").click({ button: "right" });
  const menu = page.getByRole("button", { name: "remove", exact: true }).locator("..");
  await page.setViewportSize({ width: 1000, height: 60 });
  await inside(menu, { x: 0, y: 0, width: 1000, height: 60 });
  const m = await box(menu);
  await page.mouse.move(m.x + 10, m.y + 10);
  await page.mouse.wheel(0, 30);
  await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(menu).toBeVisible();
});

test("context menu anchors to the title after page scrolling", async ({ page }) => {
  await open(page);
  await page.mouse.move(900, 500);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const title = page.getByText("C (full)", { exact: true });
  const t = await box(title);
  const x = t.x + t.width / 2;
  const y = t.y + t.height / 2;
  await page.mouse.click(x, y, { button: "right" });
  const menu = page.getByRole("button", { name: "remove", exact: true }).locator("..");
  await expect(menu).toBeVisible();
  const m = await box(menu);
  expect(Math.abs(m.x - x)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.y - y)).toBeLessThanOrEqual(1);
});
