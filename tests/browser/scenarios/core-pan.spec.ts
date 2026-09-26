import { test, expect } from "./test";
import { open, box, drag } from "./core";

for (const query of ["", "?compact"]) {
  test(`dragging title text and blank title space pans without moving the title${query ? " on short tracks" : ""}`, async ({
    page,
  }) => {
    await open(page, query);
    const title = page.getByText("A (full)", { exact: true });
    const bounds = await box(title);
    const plot = await box(page.getByTestId("a"));
    const y = bounds.y + bounds.height / 2;
    const center = bounds.x + bounds.width / 2;
    const basesPerPixel = 600 / plot.width;
    await test.step("Drag title text left, keeping the heading stationary", async () => {
      await drag(page, { x: center, y }, { x: center - 30, y });
      await expect(page.getByLabel("Visible region")).toHaveText(
        `chr1:${200 + 30 * basesPerPixel}-${800 + 30 * basesPerPixel}`,
      );
      expect(await box(title)).toEqual(bounds);
      await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
    });
    await test.step("Drag empty title space right to return", async () => {
      await drag(page, { x: plot.x + 20, y }, { x: plot.x + 50, y });
      await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
      expect(await box(title)).toEqual(bounds);
    });
  });
}

test("a small title movement or right-button drag leaves the region unchanged", async ({
  page,
}) => {
  await open(page);
  const title = await box(page.getByText("A (full)", { exact: true }));
  const x = title.x + title.width / 2;
  const y = title.y + title.height / 2;
  await drag(page, { x, y }, { x: x + 3, y });
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 60, y, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
});

test("horizontal wheel input pans the region while vertical input scrolls the page", async ({
  page,
}) => {
  await open(page);
  const plot = await box(page.getByTestId("a"));
  await page.mouse.move(plot.x + 150, plot.y + 50);
  await page.mouse.wheel(60, 0);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:260-860");
  await page.mouse.wheel(-60, 0);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
  await page.mouse.wheel(0, 60);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
});

test("hovering the margin highlights its track while settings remain clickable", async ({
  page,
}) => {
  await open(page);
  const plot = await box(page.getByTestId("b"));
  // The highlight is painted SVG output, not a private store or component probe.
  const highlight = page.locator('#browser rect[fill="#aadd99"][fill-opacity="0.25"]');
  await page.mouse.move(plot.x - 20, plot.y + 50);
  await expect(highlight).toBeVisible();
  await page.getByRole("button", { name: "Settings for B" }).hover();
  await expect(highlight).toBeVisible();
  await page.getByRole("button", { name: "Settings for B" }).click();
  await expect(page.getByRole("dialog")).toContainText("Configure B");
  await expect(page.getByLabel("Track order")).toHaveText("a,b,c");
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByText("B (full)", { exact: true }).hover();
  await expect(highlight).toHaveCount(0);
  await page.mouse.move(plot.x + 100, plot.y + 50);
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(highlight).toHaveCount(0);
  await test.step("Lift the row without copying its hover highlight into the preview", async () => {
    const next = await box(page.getByTestId("c"));
    await page.mouse.move(plot.x - 20, plot.y + 50);
    await page.mouse.down();
    await page.mouse.move(plot.x - 20, next.y + 50, { steps: 8 });
    await expect(highlight).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByLabel("Track order")).toHaveText("a,c,b");
    await expect(page.getByLabel("Visible region")).toHaveText("chr1:200-800");
  });
});

test("a drag smaller than one genomic base leaves the region and drawing in place", async ({
  page,
}) => {
  await open(page, "?region=base");
  const plot = await box(page.getByTestId("a"));
  await drag(page, { x: plot.x + 100, y: plot.y + 50 }, { x: plot.x + 130, y: plot.y + 50 });
  await expect(page.getByLabel("Visible region")).toHaveText("chr1:0-1");
  await expect.poll(async () => (await box(page.getByTestId("a"))).x).toBe(plot.x);
});
