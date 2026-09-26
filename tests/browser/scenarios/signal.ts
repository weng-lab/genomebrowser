import { expect, type Page } from "@playwright/test";

export async function openSignal(page: Page) {
  await page.goto("/");
  await expect(page.locator('#browser path[fill="#2266aa"]')).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
}

// The fixture page has a 100px margin and a 600px plot spanning 600 bases.
// Only this drawing helper needs to know how the SVG plot is located.
export async function signalPlot(page: Page) {
  const section = await page.locator("#browser").boundingBox();
  const plot = await page
    .locator('#browser rect[fill="transparent"][pointer-events="none"]')
    .boundingBox();
  expect(section).not.toBeNull();
  expect(plot).not.toBeNull();
  return { x: section!.x + 100, y: plot!.y, width: 600, height: 160 };
}
