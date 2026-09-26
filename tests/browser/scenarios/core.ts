import { expect } from "./test";
import type { Page, Locator } from "@playwright/test";

export async function open(page: Page, query = "") {
  await page.goto(`/core.html${query}`);
  await expect(page.getByTestId("c")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
}
export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}
export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}
export async function inside(
  locator: Locator,
  bounds: { x: number; y: number; width: number; height: number },
) {
  await expect
    .poll(async () => {
      const b = await box(locator);
      return (
        b.x >= bounds.x - 1 &&
        b.y >= bounds.y - 1 &&
        b.x + b.width <= bounds.x + bounds.width + 1 &&
        b.y + b.height <= bounds.y + bounds.height + 1
      );
    })
    .toBe(true);
}
