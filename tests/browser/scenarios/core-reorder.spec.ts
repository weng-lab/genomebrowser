import { test, expect } from "./test";
import { open, box, drag } from "./core";

test("margin drag reorders in both directions and respects pinned tracks", async ({ page }) => {
  await open(page);
  const a = await box(page.getByTestId("a"));
  const b = await box(page.getByTestId("b"));
  const c = await box(page.getByTestId("c"));
  const margin = (r: typeof a) => ({ x: r.x - 20, y: r.y + 50 });
  await page.mouse.move(margin(b).x, margin(b).y);
  await page.mouse.down();
  await page.mouse.move(margin(c).x, margin(c).y, { steps: 8 });
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await expect.poll(async () => (await box(page.getByTestId("c"))).y).toBe(b.y);
  expect((await box(page.getByTestId("a"))).y).toBe(a.y);
  await page.mouse.up();
  await expect(page.getByLabel("Track order")).toHaveText("a,c,b");
  await expect
    .poll(async () => (await box(page.getByTestId("c"))).y)
    .toBeLessThan((await box(page.getByTestId("b"))).y);
  await drag(page, margin(await box(page.getByTestId("b"))), margin(a));
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await drag(page, margin(a), margin(c));
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await page.getByRole("button", { name: "Unpin", exact: true }).click();
  await drag(page, margin(a), margin(c));
  await expect(page.getByLabel("Track order")).toHaveText("b,c,a");
});

test("move controls keep the pinned prefix and work after unpinning", async ({ page }) => {
  await open(page);
  // The SVG arrow controls sit 15 and 30px to the right of the settings icon.
  async function move(id: string, direction: "top" | "bottom") {
    const icon = await box(page.getByRole("button", { name: `Settings for ${id}` }));
    await page.mouse.click(
      icon.x + icon.width / 2 + (direction === "top" ? 15 : 30),
      icon.y + icon.height / 2,
    );
  }
  await move("A", "bottom");
  await move("B", "top");
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await move("C", "top");
  await expect(page.getByLabel("Track order")).toHaveText("a,c,b");
  await move("C", "bottom");
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await page.getByRole("button", { name: "Unpin", exact: true }).click();
  await move("A", "bottom");
  await expect(page.getByLabel("Track order")).toHaveText("b,c,a");
});
